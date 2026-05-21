import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const DEFAULT_CACHE_CONTROL = 'public,max-age=31536000,immutable';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) {
    continue;
  }

  const key = arg.slice(2);
  const next = process.argv[index + 1];
  if (!next || next.startsWith('--')) {
    args.set(key, 'true');
  } else {
    args.set(key, next);
    index += 1;
  }
}

function normalizeObjectPrefix(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function normalizeEndpoint(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

function requireEnv(names) {
  for (const name of names) {
    if (!process.env[name]) {
      console.error(`Missing required environment variable: ${name}`);
      process.exit(1);
    }
  }
}

function resolveStorageConfig() {
  requireEnv(['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION']);

  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;
  const host = normalizeEndpoint(process.env.COS_ENDPOINT)
    || `${bucket}.cos.${region}.myqcloud.com`;

  return {
    displayName: 'Tencent COS',
    accessKeyId: process.env.COS_SECRET_ID,
    secretAccessKey: process.env.COS_SECRET_KEY,
    bucket,
    host,
    region,
    service: 's3',
    canonicalUriFor: objectKey => `/${encodeObjectPath(objectKey)}`,
  };
}

const storage = resolveStorageConfig();
const rootDir = path.resolve(args.get('root') || 'image');

// 该前缀要与 VITE_CLOUD_IMAGE_BASE_URL 后面的公开路径保持一致。
// 默认 image/zpf/... 对应 README 中的云图目录结构。
const objectPrefix = normalizeObjectPrefix(args.get('prefix') || 'image');
const concurrency = Math.max(1, Number.parseInt(args.get('concurrency') || '3', 10));
const cacheControl = args.get('cache-control') || DEFAULT_CACHE_CONTROL;
const signedPayload = !args.has('unsigned-payload');
const skipExisting = !args.has('no-skip');
const limit = args.has('limit') ? Math.max(1, Number.parseInt(args.get('limit'), 10)) : null;

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function hash(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

async function hashFile(filePath) {
  const hasher = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on('data', chunk => hasher.update(chunk))
      .on('error', reject)
      .on('end', resolve);
  });
  return hasher.digest('hex');
}

function encodeObjectPath(value) {
  return value
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

function buildSignedHeaders({ method, objectKey, headers: inputHeaders = {}, payloadHash }) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = storage.canonicalUriFor(objectKey);

  const headers = {
    host: storage.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...Object.fromEntries(
      Object.entries(inputHeaders).map(([name, value]) => [name.toLowerCase(), String(value)])
    ),
  };

  const headerNames = Object.keys(headers).sort();
  const canonicalHeaders = headerNames
    .map(name => `${name}:${headers[name].replace(/\s+/g, ' ').trim()}\n`)
    .join('');
  const signedHeaders = headerNames.join(';');
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${storage.region}/${storage.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(
    storage.secretAccessKey,
    dateStamp,
    storage.region,
    storage.service
  );
  const signature = hmac(signingKey, stringToSign, 'hex');

  return {
    requestPath: canonicalUri,
    headers: Object.fromEntries([
      ...Object.entries(inputHeaders),
      ['Host', storage.host],
      ['X-Amz-Content-Sha256', payloadHash],
      ['X-Amz-Date', amzDate],
      ['Authorization', `AWS4-HMAC-SHA256 Credential=${storage.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`],
    ]),
  };
}

async function walkFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp') {
    return 'image/webp';
  }
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

async function uploadFile(filePath) {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const objectKey = objectPrefix ? `${objectPrefix}/${relativePath}` : relativePath;
  const stat = await fsp.stat(filePath);
  const payloadHash = signedPayload ? await hashFile(filePath) : 'UNSIGNED-PAYLOAD';

  if (skipExisting && await objectExistsWithSize(objectKey, stat.size)) {
    return { objectKey, size: stat.size, skipped: true };
  }

  const { requestPath, headers } = buildSignedHeaders({
    method: 'PUT',
    objectKey,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Length': String(stat.size),
      'Content-Type': contentTypeFor(filePath),
    },
    payloadHash,
  });

  await new Promise((resolve, reject) => {
    const request = https.request({
      method: 'PUT',
      hostname: storage.host,
      path: requestPath,
      headers,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve();
          return;
        }

        reject(new Error(`${storage.displayName} upload failed with HTTP ${response.statusCode}: ${body.slice(0, 500)}`));
      });
    });

    request.on('error', reject);
    fs.createReadStream(filePath).on('error', reject).pipe(request);
  });

  return { objectKey, size: stat.size, skipped: false };
}

async function objectExistsWithSize(objectKey, expectedSize) {
  const { requestPath, headers } = buildSignedHeaders({
    method: 'HEAD',
    objectKey,
    payloadHash: 'UNSIGNED-PAYLOAD',
  });

  return await new Promise((resolve, reject) => {
    const request = https.request({
      method: 'HEAD',
      hostname: storage.host,
      path: requestPath,
      headers,
    }, response => {
      response.resume();
      response.on('end', () => {
        if (response.statusCode === 404 || response.statusCode === 403) {
          resolve(false);
          return;
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(Number(response.headers['content-length']) === expectedSize);
          return;
        }

        reject(new Error(`${storage.displayName} HEAD failed with HTTP ${response.statusCode}`));
      });
    });

    request.on('error', reject);
    request.end();
  });
}

async function uploadWithRetry(filePath) {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await uploadFile(filePath);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }

  throw lastError;
}

async function main() {
  const allFiles = (await walkFiles(rootDir)).sort((left, right) => left.localeCompare(right));
  const files = limit ? allFiles.slice(0, limit) : allFiles;
  let uploaded = 0;
  let skipped = 0;
  let uploadedBytes = 0;
  let nextIndex = 0;

  console.log(`Uploading ${files.length} files from ${rootDir}`);
  console.log(`Target storage: ${storage.displayName}`);
  console.log(`Target bucket: ${storage.bucket}, prefix: ${objectPrefix || '(root)'}`);
  console.log(`Target host: ${storage.host}`);

  async function worker() {
    while (nextIndex < files.length) {
      const fileIndex = nextIndex;
      nextIndex += 1;
      const result = await uploadWithRetry(files[fileIndex]);
      if (result.skipped) {
        skipped += 1;
      } else {
        uploaded += 1;
        uploadedBytes += result.size;
      }
      console.log(`[${uploaded + skipped}/${files.length}] ${result.skipped ? 'skip' : 'put '} ${result.objectKey}`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`Done. Uploaded ${uploaded} files (${(uploadedBytes / 1024 / 1024).toFixed(2)} MiB), skipped ${skipped} files.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});

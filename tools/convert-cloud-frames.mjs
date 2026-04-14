import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = path.resolve(process.cwd(), 'image', 'ATSANI');
const args = new Set(process.argv.slice(2));

const overwrite = args.has('--overwrite');
const cleanup = args.has('--cleanup') && !args.has('--keep-source');
const qualityWebp = Number(process.env.WEBP_QUALITY ?? 72);
const concurrency = Math.max(1, Number(process.env.CONVERT_CONCURRENCY ?? 4));

const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

const convertSingle = async (fileName) => {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const baseName = fileName.replace(/\.png$/i, '');
    const webpPath = path.join(SOURCE_DIR, `${baseName}.webp`);

    const result = {
        webp: 'skipped',
        sourceBytes: 0,
        webpBytes: 0,
        fileName,
    };

    const sourceStat = await fs.stat(sourcePath);
    result.sourceBytes = sourceStat.size;

    const needWebp = overwrite || !(await fileExists(webpPath));

    if (needWebp) {
        await sharp(sourcePath, { sequentialRead: true })
            .rotate()
            .webp({ quality: qualityWebp, effort: 5 })
            .toFile(webpPath);

        const webpStat = await fs.stat(webpPath);
        result.webp = 'generated';
        result.webpBytes = webpStat.size;
    } else {
        const webpStat = await fs.stat(webpPath);
        result.webpBytes = webpStat.size;
    }

    return result;
};

const cleanupNonWebp = async () => {
    const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true });
    const avifFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.avif'))
        .map((entry) => entry.name);

    const pngFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
        .map((entry) => entry.name);

    let removedAvif = 0;
    for (const fileName of avifFiles) {
        await fs.unlink(path.join(SOURCE_DIR, fileName));
        removedAvif += 1;
    }

    let removedPng = 0;
    let keptPng = 0;
    for (const fileName of pngFiles) {
        const webpPath = path.join(SOURCE_DIR, fileName.replace(/\.png$/i, '.webp'));
        if (await fileExists(webpPath)) {
            await fs.unlink(path.join(SOURCE_DIR, fileName));
            removedPng += 1;
        } else {
            keptPng += 1;
        }
    }

    return { removedPng, removedAvif, keptPng };
};

const run = async () => {
    const sourceExists = await fileExists(SOURCE_DIR);
    if (!sourceExists) {
        throw new Error(`Source folder not found: ${SOURCE_DIR}`);
    }

    const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true });
    const pngFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

    if (!pngFiles.length) {
        console.log('No PNG files found in image/ATSANI. Skip conversion.');
    } else {
        console.log(`Found ${pngFiles.length} PNG files.`);
        console.log(`Converting with concurrency=${concurrency}, WEBP_QUALITY=${qualityWebp}, overwrite=${overwrite}`);

        let cursor = 0;
        const results = [];

        const workers = Array.from({ length: Math.min(concurrency, pngFiles.length) }, async () => {
            while (true) {
                const current = cursor;
                cursor += 1;
                if (current >= pngFiles.length) {
                    return;
                }

                const fileName = pngFiles[current];
                const converted = await convertSingle(fileName);
                results.push(converted);

                if ((current + 1) % 5 === 0 || current + 1 === pngFiles.length) {
                    console.log(`Progress: ${current + 1}/${pngFiles.length}`);
                }
            }
        });

        await Promise.all(workers);

        const generatedWebp = results.filter((item) => item.webp === 'generated').length;
        const totalPng = results.reduce((sum, item) => sum + item.sourceBytes, 0);
        const totalWebp = results.reduce((sum, item) => sum + item.webpBytes, 0);

        console.log('--- Conversion Summary ---');
        console.log(`WEBP generated: ${generatedWebp}/${pngFiles.length}`);
        console.log(`PNG total size : ${formatMB(totalPng)} MB`);
        console.log(`WEBP total size: ${formatMB(totalWebp)} MB`);
    }

    if (cleanup) {
        const { removedPng, removedAvif, keptPng } = await cleanupNonWebp();
        console.log('--- Cleanup Summary ---');
        console.log(`Removed PNG : ${removedPng}`);
        console.log(`Removed AVIF: ${removedAvif}`);
        if (keptPng > 0) {
            console.log(`Kept PNG (missing matching WEBP): ${keptPng}`);
        }
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

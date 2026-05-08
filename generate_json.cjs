const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');
const CSV_PATH = path.resolve(WORKSPACE_ROOT, 'data', 'SelectedTyphoons_TimeSorted_ibtracs.csv');
const H5_ROOT = path.resolve(WORKSPACE_ROOT, 'data', 'downloads', 'satellite_cloud_picture_h5');
const TARGET_JSON_PATH = path.resolve(PROJECT_ROOT, 'src', 'data', 'typhoonData.json');

const NM_TO_KM = 1.852;
const KT_TO_MS = 0.514444;

const LAT_DELTAS = [0.08, 0.05, 0.02, -0.02, -0.05, -0.08];
const LNG_DELTAS = [-0.1, -0.06, -0.02, 0.02, 0.06, 0.1];
const INTENSITY_DELTAS = [1, 2, 1, 0, -1, 0];
const PRESSURE_DELTAS = [-1.5, -0.8, 0, 0.8, 1.5, 0.5];
const RMW_SCALES = [0.95, 1.02, 1.05, 1.0, 0.98, 0.92];
const R34_SCALES = [0.97, 1.01, 1.03, 1.0, 0.99, 0.96];

const STORM_ZH_NAMES = {
  ATSANI: '\u827e\u838e\u5c3c',
  GONI: '\u5929\u9e45',
  'IN-FA': '\u70df\u82b1',
  NANGKA: '\u6d6a\u5361',
  TALAS: '\u5854\u62c9\u65af',
  TAPAH: '\u5854\u5df4',
  TRAMI: '\u6f6d\u7f8e',
  WIPHA: '\u97e6\u5e15',
};

const H5_TIMESTAMP_PATTERN = /NC_H08_(\d{8})_(\d{2})\d{2}_/i;

const toNumber = (value, fallback = 0) => {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
};

const clampNonNegative = (value) => Math.max(0, value);

const parseCsv = (content) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
};

const parseSampleKey = (sampleKey) => {
  const parts = String(sampleKey || '').split('_');
  if (parts.length < 3) {
    return null;
  }

  return {
    year: parts[0],
    storm: parts[1].toUpperCase(),
  };
};

const formatIsoTime = (isoTime) => {
  const text = String(isoTime || '').trim();
  if (!/^\d{10}$/.test(text)) {
    return text;
  }

  const year = text.slice(0, 4);
  const month = text.slice(4, 6);
  const day = text.slice(6, 8);
  const hour = text.slice(8, 10);
  return `${year}-${month}-${day} ${hour}:00`;
};

const readAvailableH5Times = () => {
  if (!fs.existsSync(H5_ROOT)) {
    return null;
  }

  const result = new Map();
  for (const entry of fs.readdirSync(H5_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const storm = entry.name.toUpperCase();
    const stormDir = path.join(H5_ROOT, entry.name);
    const timestamps = new Set();

    for (const fileName of fs.readdirSync(stormDir)) {
      const match = fileName.match(H5_TIMESTAMP_PATTERN);
      if (match) {
        timestamps.add(`${match[1]}${match[2]}`);
      }
    }

    result.set(storm, timestamps);
  }

  return result;
};

const buildPredictions = ({ lat, lng, intensityReal, pressure, rmw, r34, index }) => {
  const phase = index % LAT_DELTAS.length;

  return {
    lat_pred: Number((lat + LAT_DELTAS[phase]).toFixed(4)),
    lng_pred: Number((lng + LNG_DELTAS[phase]).toFixed(4)),
    intensity_pred: clampNonNegative(Math.round(intensityReal + INTENSITY_DELTAS[phase])),
    pressure_pred: Number((pressure + PRESSURE_DELTAS[phase]).toFixed(1)),
    inner_radius_pred: rmw === 0 ? 0 : clampNonNegative(Math.round(rmw * RMW_SCALES[phase])),
    outer_radius_pred: r34 === 0 ? 0 : clampNonNegative(Math.round(r34 * R34_SCALES[phase])),
  };
};

const mapCsvRowToPoint = (row, index) => {
  const lat = toNumber(row.LAT);
  const lng = toNumber(row.LON);
  const intensityReal = clampNonNegative(Math.round(toNumber(row.WMO_WIND) * KT_TO_MS));
  const pressure = Number(toNumber(row.WMO_PRES).toFixed(1));
  const rmw = clampNonNegative(Math.round(toNumber(row.USA_RMW) * NM_TO_KM));
  const r34 = clampNonNegative(Math.round(toNumber(row.USA_R34) * NM_TO_KM));

  return {
    time: formatIsoTime(row.ISO_TIME),
    lat,
    lng,
    intensity_real: intensityReal,
    pressure,
    inner_radius_real: rmw,
    outer_radius_real: r34,
    ...buildPredictions({ lat, lng, intensityReal, pressure, rmw, r34, index }),
  };
};

const buildCases = () => {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const availableH5Times = readAvailableH5Times();
  const grouped = new Map();
  const firstSeenStorms = [];
  const skipped = new Map();

  for (const row of rows) {
    const parsed = parseSampleKey(row.SAMPLE_KEY);
    if (!parsed) {
      continue;
    }

    const isoTime = String(row.ISO_TIME || '').trim();
    if (!/^\d{10}$/.test(isoTime)) {
      continue;
    }

    if (toNumber(row.USA_R34) === 0) {
      skipped.set(parsed.storm, (skipped.get(parsed.storm) || 0) + 1);
      continue;
    }

    const h5Times = availableH5Times?.get(parsed.storm);
    if (h5Times && !h5Times.has(isoTime)) {
      skipped.set(parsed.storm, (skipped.get(parsed.storm) || 0) + 1);
      continue;
    }

    if (!grouped.has(parsed.storm)) {
      grouped.set(parsed.storm, {
        storm: parsed.storm,
        year: parsed.year,
        rows: [],
        firstIsoTime: isoTime,
      });
      firstSeenStorms.push(parsed.storm);
    }

    const group = grouped.get(parsed.storm);
    group.rows.push(row);
    if (Number(isoTime) < Number(group.firstIsoTime)) {
      group.firstIsoTime = isoTime;
    }
  }

  const stableStormOrder = new Map(firstSeenStorms.map((storm, index) => [storm, index]));
  const orderedGroups = Array.from(grouped.values()).sort((left, right) => {
    const timeDiff = Number(left.firstIsoTime) - Number(right.firstIsoTime);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return (stableStormOrder.get(left.storm) || 0) - (stableStormOrder.get(right.storm) || 0);
  });

  const cases = orderedGroups.map((group, index) => {
    const sortedRows = group.rows.sort((left, right) => Number(left.ISO_TIME) - Number(right.ISO_TIME));
    const zhName = STORM_ZH_NAMES[group.storm] || group.storm;

    return {
      id: String(index + 1),
      stormCode: `${group.storm}_${group.year}`,
      sourceType: 'csv_truth',
      nameEn: `${group.storm}(${group.year})`,
      nameZh: `${zhName}(${group.year})`,
      data: sortedRows.map(mapCsvRowToPoint),
    };
  });

  return { cases, skipped };
};

const run = () => {
  const { cases, skipped } = buildCases();

  if (!cases.length) {
    throw new Error(`No typhoon cases generated from ${CSV_PATH}`);
  }

  fs.writeFileSync(TARGET_JSON_PATH, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');

  for (const typhoonCase of cases) {
    console.log(`Generated ${typhoonCase.stormCode}: ${typhoonCase.data.length} points`);
  }

  for (const [storm, count] of Array.from(skipped.entries()).sort()) {
    console.log(`Skipped ${storm}: ${count} rows without R34 or matching H5`);
  }

  console.log(`Updated ${TARGET_JSON_PATH}`);
};

run();

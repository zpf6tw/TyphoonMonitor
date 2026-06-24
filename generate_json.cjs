const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');
const IBTRACS_CSV_PATH = path.resolve(WORKSPACE_ROOT, 'data', 'SelectedTyphoons_ibtracs.csv');
const IDOL_CSV_PATH = path.resolve(WORKSPACE_ROOT, 'data', 'SelectedTyphoons_IDOL_Estimated.csv');
const TARGET_JSON_PATH = path.resolve(PROJECT_ROOT, 'src', 'data', 'IDOLTyphoonData.json');

const NM_TO_KM = 1.852;
const KT_TO_MS = 0.514444;

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

const mapCsvRowsToPoint = (truthRow, idolRow) => ({
  time: formatIsoTime(idolRow.ISO_TIME),
  lat: toNumber(truthRow.LAT),
  lng: toNumber(truthRow.LON),
  intensity_real: clampNonNegative(Math.round(toNumber(truthRow.WMO_WIND) * KT_TO_MS)),
  pressure: Number(toNumber(truthRow.WMO_PRES).toFixed(1)),
  inner_radius_real: clampNonNegative(Math.round(toNumber(truthRow.USA_RMW) * NM_TO_KM)),
  outer_radius_real: clampNonNegative(Math.round(toNumber(truthRow.USA_R34) * NM_TO_KM)),
  lat_pred: toNumber(idolRow.LAT),
  lng_pred: toNumber(idolRow.LON),
  intensity_pred: clampNonNegative(Math.round(toNumber(idolRow.WMO_WIND) * KT_TO_MS)),
  pressure_pred: Number(toNumber(idolRow.WMO_PRES).toFixed(1)),
  inner_radius_pred: clampNonNegative(Math.round(toNumber(idolRow.USA_RMW) * NM_TO_KM)),
  outer_radius_pred: clampNonNegative(Math.round(toNumber(idolRow.USA_R34) * NM_TO_KM)),
});

const buildCases = () => {
  const truthRows = parseCsv(fs.readFileSync(IBTRACS_CSV_PATH, 'utf8'));
  const idolRows = parseCsv(fs.readFileSync(IDOL_CSV_PATH, 'utf8'));
  const truthBySampleKey = new Map(truthRows.map((row) => [row.SAMPLE_KEY, row]));
  const grouped = new Map();
  const firstSeenStorms = [];
  const skipped = new Map();

  for (const idolRow of idolRows) {
    const parsed = parseSampleKey(idolRow.SAMPLE_KEY);
    if (!parsed) {
      continue;
    }

    const isoTime = String(idolRow.ISO_TIME || '').trim();
    if (!/^\d{10}$/.test(isoTime)) {
      continue;
    }

    const truthRow = truthBySampleKey.get(idolRow.SAMPLE_KEY);
    if (!truthRow) {
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
    group.rows.push({ truthRow, idolRow });
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
    const sortedRows = group.rows.sort((left, right) => Number(left.idolRow.ISO_TIME) - Number(right.idolRow.ISO_TIME));
    const zhName = STORM_ZH_NAMES[group.storm] || group.storm;

    return {
      id: String(index + 1),
      stormCode: `${group.storm}_${group.year}`,
      sourceType: 'csv_truth',
      nameEn: `${group.storm}(${group.year})`,
      nameZh: `${zhName}(${group.year})`,
      data: sortedRows.map(({ truthRow, idolRow }) => mapCsvRowsToPoint(truthRow, idolRow)),
    };
  });

  return { cases, skipped };
};

const run = () => {
  const { cases, skipped } = buildCases();

  if (!cases.length) {
    throw new Error(`No typhoon cases generated from ${IDOL_CSV_PATH}`);
  }

  fs.writeFileSync(TARGET_JSON_PATH, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');

  for (const typhoonCase of cases) {
    console.log(`Generated ${typhoonCase.stormCode}: ${typhoonCase.data.length} points`);
  }

  for (const [storm, count] of Array.from(skipped.entries()).sort()) {
    console.log(`Skipped ${storm}: ${count} IDOL rows without matching ibtracs truth`);
  }

  console.log(`Updated ${TARGET_JSON_PATH}`);
};

run();

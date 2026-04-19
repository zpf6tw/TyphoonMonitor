import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TYPHOON_CASE_SOURCES } from './typhoon-case-sources.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET_JSON_PATH = path.resolve(PROJECT_ROOT, 'src', 'data', 'typhoonData.json');
const NM_TO_KM = 1.852;
const KT_TO_MS = 0.514444;

const LAT_DELTAS = [0.08, 0.05, 0.02, -0.02, -0.05, -0.08];
const LNG_DELTAS = [-0.1, -0.06, -0.02, 0.02, 0.06, 0.1];
const INTENSITY_DELTAS = [1, 2, 1, 0, -1, 0];
const PRESSURE_DELTAS = [-1.5, -0.8, 0, 0.8, 1.5, 0.5];
const RMW_SCALES = [0.95, 1.02, 1.05, 1.0, 0.98, 0.92];
const R34_SCALES = [0.97, 1.01, 1.03, 1.0, 0.99, 0.96];

const toNumber = (value, fallback = 0) => {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
};

const clampNonNegative = (value) => Math.max(0, value);

const toR34Kilometers = (row) => {
    return clampNonNegative(Math.round(toNumber(row.USA_R34) * NM_TO_KM));
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
    const r34 = toR34Kilometers(row);

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

const readSourceRows = async (source) => {
    const csvFilePath = path.resolve(PROJECT_ROOT, source.csvPath);
    const content = await fs.readFile(csvFilePath, 'utf8');
    const rows = parseCsv(content);

    const start = Number(source.startIsoTime);
    const end = Number(source.endIsoTime);

    return rows
        .filter((row) => row.SAMPLE_KEY?.startsWith(source.sampleKeyPrefix))
        .filter((row) => {
            const iso = Number(row.ISO_TIME);
            return Number.isFinite(iso) && iso >= start && iso <= end;
        })
        .filter((row) => toR34Kilometers(row) > 0)
        .sort((a, b) => Number(a.ISO_TIME) - Number(b.ISO_TIME));
};

const buildCaseFromSource = async (source) => {
    const rows = await readSourceRows(source);

    if (!rows.length) {
        throw new Error(`No rows found for source: ${source.stormCode}`);
    }

    return {
        id: source.id,
        stormCode: source.stormCode,
        sourceType: source.sourceType,
        nameEn: source.nameEn,
        nameZh: source.nameZh,
        data: rows.map(mapCsvRowToPoint),
    };
};

const sortCasesById = (cases) => {
    return [...cases].sort((left, right) => {
        const leftId = Number(left.id);
        const rightId = Number(right.id);

        if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
            return leftId - rightId;
        }

        return String(left.id).localeCompare(String(right.id));
    });
};

const run = async () => {
    const nextCases = [];

    for (const source of TYPHOON_CASE_SOURCES) {
        const builtCase = await buildCaseFromSource(source);
        nextCases.push(builtCase);
        console.log(`Synced ${source.stormCode}: ${builtCase.data.length} points`);
    }

    const orderedCases = sortCasesById(nextCases);
    await fs.writeFile(TARGET_JSON_PATH, `${JSON.stringify(orderedCases, null, 2)}\n`, 'utf8');
    console.log(`Updated ${TARGET_JSON_PATH}`);
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

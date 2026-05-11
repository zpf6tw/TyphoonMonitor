import type { TyphoonCase, TyphoonPoint } from '../types';
import typhoonData from '../data/typhoonData.json';

export interface CloudFrameMeta {
    id: string;
    timestamp: string;
    shortLabel: string;
    fullLabel: string;
    url: string;
}

export type StormCloudKey = string;
export type CloudImageMode = 'pseudoColor' | 'coolWhite';

export const CLOUD_IMAGE_MODES: CloudImageMode[] = ['pseudoColor', 'coolWhite'];

export const CLOUD_IMAGE_MODE_LABELS: Record<CloudImageMode, { en: string; zh: string }> = {
    pseudoColor: { en: 'Pseudo', zh: '\u4f2a\u5f69\u8272' },
    coolWhite: { en: 'White', zh: '\u51b7\u767d\u8272' },
};

const STYLE_DIR_BY_MODE: Record<CloudImageMode, string> = {
    pseudoColor: 'pseudo_color',
    coolWhite: 'cool_white',
};

const DEFAULT_CLOUD_IMAGE_BASE_URL = 'https://image-1419775048.cos.ap-shanghai.myqcloud.com/image';

const normalizeBaseUrl = (value?: string): string => {
    const trimmedValue = String(value || '').trim().replace(/\/+$/, '');
    return trimmedValue || DEFAULT_CLOUD_IMAGE_BASE_URL;
};

const CLOUD_IMAGE_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_CLOUD_IMAGE_BASE_URL);

const POINT_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;

const formatFullLabel = (dateCode: string, timeCode: string): string => {
    const year = dateCode.slice(0, 4);
    const month = dateCode.slice(4, 6);
    const day = dateCode.slice(6, 8);
    const hour = timeCode.slice(0, 2);
    const minute = timeCode.slice(2, 4);
    return `${year}-${month}-${day} ${hour}:${minute}`;
};

const formatShortLabel = (dateCode: string, timeCode: string): string => {
    const month = dateCode.slice(4, 6);
    const day = dateCode.slice(6, 8);
    const hour = timeCode.slice(0, 2);
    const minute = timeCode.slice(2, 4);
    return `${month}-${day} ${hour}:${minute}`;
};

const extractFrameCodes = (time: string): { dateCode: string; timeCode: string } | null => {
    const match = String(time).match(POINT_TIME_PATTERN);
    if (!match) {
        return null;
    }

    const [, year, month, day, hour, minute] = match;
    return {
        dateCode: `${year}${month}${day}`,
        timeCode: `${hour}${minute}`,
    };
};

const buildFrameFileName = (dateCode: string, timeCode: string): string =>
    `NC_H08_${dateCode}_${timeCode}_R21_FLDK.02401_02401_ch13.webp`;

const buildCloudImageUrl = (stormKey: StormCloudKey, mode: CloudImageMode, fileName: string): string =>
    [
        CLOUD_IMAGE_BASE_URL,
        'zpf',
        encodeURIComponent(stormKey),
        STYLE_DIR_BY_MODE[mode],
        encodeURIComponent(fileName),
    ].join('/');

const buildFrame = (
    point: TyphoonPoint,
    stormKey: StormCloudKey,
    mode: CloudImageMode
): CloudFrameMeta | null => {
    const frameCodes = extractFrameCodes(point.time);
    if (!frameCodes) {
        return null;
    }

    const { dateCode, timeCode } = frameCodes;
    const timestamp = `${dateCode}${timeCode.slice(0, 2)}`;
    const fileName = buildFrameFileName(dateCode, timeCode);

    return {
        id: timestamp,
        timestamp,
        shortLabel: formatShortLabel(dateCode, timeCode),
        fullLabel: formatFullLabel(dateCode, timeCode),
        url: buildCloudImageUrl(stormKey, mode, fileName),
    };
};

const extractStormKeyFromCase = (typhoonCase: TyphoonCase): StormCloudKey | null => {
    const code = String(typhoonCase.stormCode || '').trim().toUpperCase();
    if (code) {
        return code.split('_')[0];
    }

    const nameMatch = String(typhoonCase.nameEn || '').trim().toUpperCase().match(/^([A-Z-]+)/);
    return nameMatch ? nameMatch[1] : null;
};

const buildCloudFrames = (
    points: TyphoonPoint[],
    stormKey: StormCloudKey,
    mode: CloudImageMode
): CloudFrameMeta[] => {
    return points
        .map((point) => buildFrame(point, stormKey, mode))
        .filter((frame): frame is CloudFrameMeta => frame !== null)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

const buildCloudFramesByStorm = (): Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>> => {
    return (typhoonData as TyphoonCase[]).reduce<Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>>>(
        (result, typhoonCase) => {
            const stormKey = extractStormKeyFromCase(typhoonCase);
            if (!stormKey) {
                return result;
            }

            result[stormKey] = {
                pseudoColor: buildCloudFrames(typhoonCase.data, stormKey, 'pseudoColor'),
                coolWhite: buildCloudFrames(typhoonCase.data, stormKey, 'coolWhite'),
            };
            return result;
        },
        {}
    );
};

export const CLOUD_FRAMES_BY_STORM: Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>> =
    buildCloudFramesByStorm();

export const getPrimaryCloudFrames = (
    frameGroups: Record<CloudImageMode, CloudFrameMeta[]>
): CloudFrameMeta[] => {
    if (frameGroups.pseudoColor.length > 0) {
        return frameGroups.pseudoColor;
    }
    return frameGroups.coolWhite;
};

const EMPTY_FRAME_GROUPS: Record<CloudImageMode, CloudFrameMeta[]> = {
    pseudoColor: [],
    coolWhite: [],
};

export const DEFAULT_CLOUD_FRAMES: CloudFrameMeta[] = getPrimaryCloudFrames(
    CLOUD_FRAMES_BY_STORM[Object.keys(CLOUD_FRAMES_BY_STORM)[0]] || EMPTY_FRAME_GROUPS
);

export const resolveStormCloudKey = (stormCode?: string, nameEn?: string): StormCloudKey | null => {
    const code = String(stormCode || '').toUpperCase();
    for (const key of Object.keys(CLOUD_FRAMES_BY_STORM)) {
        if (code.startsWith(`${key}_`) || code === key) {
            return key;
        }
    }

    const normalizedName = String(nameEn || '').toUpperCase();
    for (const key of Object.keys(CLOUD_FRAMES_BY_STORM)) {
        if (normalizedName.includes(key)) {
            return key;
        }
    }

    return null;
};

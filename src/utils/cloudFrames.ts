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

const PSEUDO_COLOR_MODULES = import.meta.glob('../../image/zpf/*/pseudo_color/*.webp', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

const COOL_WHITE_MODULES = import.meta.glob('../../image/zpf/*/cool_white/*.webp', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

const FRAME_FILE_PATTERN = /NC_H08_(\d{8})_(\d{4})_.*\.webp$/i;

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

const parseFrame = (filePath: string, url: string): CloudFrameMeta | null => {
    const fileName = filePath.split('/').pop() || filePath;
    const match = fileName.match(FRAME_FILE_PATTERN);
    if (!match) {
        return null;
    }

    const [, dateCode, timeCode] = match;
    const timestamp = `${dateCode}${timeCode.slice(0, 2)}`;

    return {
        id: timestamp,
        timestamp,
        shortLabel: formatShortLabel(dateCode, timeCode),
        fullLabel: formatFullLabel(dateCode, timeCode),
        url,
    };
};

const extractStormKey = (filePath: string, mode: CloudImageMode): string | null => {
    const styleDir = STYLE_DIR_BY_MODE[mode];
    const normalizedPath = filePath.replace(/\\/g, '/');
    const match = normalizedPath.match(new RegExp(`/image/zpf/([^/]+)/${styleDir}/`));
    return match ? match[1].toUpperCase() : null;
};

const groupModulesByStorm = (
    mode: CloudImageMode,
    modules: Record<string, string>
): Record<StormCloudKey, Record<string, string>> => {
    const grouped: Record<StormCloudKey, Record<string, string>> = {};

    for (const [filePath, url] of Object.entries(modules)) {
        const stormKey = extractStormKey(filePath, mode);
        if (!stormKey) {
            continue;
        }

        grouped[stormKey] ||= {};
        grouped[stormKey][filePath] = url;
    }

    return grouped;
};

const buildCloudFrames = (modules: Record<string, string>): CloudFrameMeta[] => {
    return Object.entries(modules)
        .map(([filePath, url]) => parseFrame(filePath, url))
        .filter((frame): frame is CloudFrameMeta => frame !== null)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

const buildCloudFramesByStorm = (): Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>> => {
    const modulesByMode: Record<CloudImageMode, Record<StormCloudKey, Record<string, string>>> = {
        pseudoColor: groupModulesByStorm('pseudoColor', PSEUDO_COLOR_MODULES),
        coolWhite: groupModulesByStorm('coolWhite', COOL_WHITE_MODULES),
    };

    const stormKeys = Array.from(
        new Set([
            ...Object.keys(modulesByMode.pseudoColor),
            ...Object.keys(modulesByMode.coolWhite),
        ])
    ).sort((left, right) => left.localeCompare(right));

    return stormKeys.reduce<Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>>>(
        (result, stormKey) => {
            result[stormKey] = {
                pseudoColor: buildCloudFrames(modulesByMode.pseudoColor[stormKey] || {}),
                coolWhite: buildCloudFrames(modulesByMode.coolWhite[stormKey] || {}),
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

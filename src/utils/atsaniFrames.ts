export interface CloudFrameMeta {
    id: string;
    timestamp: string;
    shortLabel: string;
    fullLabel: string;
    url: string;
}

const ATSANI_FRAME_MODULES = import.meta.glob('../../image/ATSANI/*.png', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

const FRAME_FILE_PATTERN = /NC_H08_(\d{8})_(\d{4})_.*\.png$/i;

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
    const timestamp = `${dateCode}${timeCode}`;

    return {
        id: timestamp,
        timestamp,
        shortLabel: formatShortLabel(dateCode, timeCode),
        fullLabel: formatFullLabel(dateCode, timeCode),
        url,
    };
};

export const ATSANI_CLOUD_FRAMES: CloudFrameMeta[] = Object.entries(ATSANI_FRAME_MODULES)
    .map(([filePath, url]) => parseFrame(filePath, url))
    .filter((frame): frame is CloudFrameMeta => frame !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

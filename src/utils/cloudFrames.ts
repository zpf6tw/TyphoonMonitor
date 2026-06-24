import type { TyphoonCase, TyphoonPoint } from '../types';
import idolTyphoonData from '../data/IDOLTyphoonData.json';

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

// GONI 与 ATSANI 使用同一时次云图背景，按共享键回退到 ATSANI 资源目录。
const SHARED_CLOUD_FRAME_KEY_BY_STORM: Record<StormCloudKey, StormCloudKey> = {
  ATSANI: 'ATSANI',
  GONI: 'ATSANI',
};

export const CLOUD_IMAGE_MODE_LABELS: Record<CloudImageMode, { en: string; zh: string }> = {
  pseudoColor: { en: 'Pseudo', zh: '伪彩色' },
  coolWhite: { en: 'White', zh: '冷白色' },
};

const STYLE_DIR_BY_MODE: Record<CloudImageMode, string> = {
  pseudoColor: 'pseudo_color',
  coolWhite: 'cool_white',
};

// COS 公开访问根路径可通过 VITE_CLOUD_IMAGE_BASE_URL 自定义；
// 后续的 zpf/<台风>/<云图类型>/<文件名> 路径由本文件统一拼接。
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

// 对象键结构在这里集中维护，更换 COS 目录时只需同步这里和上传脚本的 prefix。
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
    .map(point => buildFrame(point, stormKey, mode))
    .filter((frame): frame is CloudFrameMeta => frame !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

const buildCloudFramesByStorm = (): Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>> => {
  return (idolTyphoonData as TyphoonCase[]).reduce<Record<StormCloudKey, Record<CloudImageMode, CloudFrameMeta[]>>>(
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

// 启动时根据 IDOLTyphoonData 构建云图索引，运行时不再重复扫描数据源。
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

export const resolveSharedStormCloudKey = (stormKey: StormCloudKey | null): StormCloudKey | null => {
  if (!stormKey) {
    return null;
  }

  return SHARED_CLOUD_FRAME_KEY_BY_STORM[stormKey] || stormKey;
};

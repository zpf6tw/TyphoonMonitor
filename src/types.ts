
export interface TyphoonPoint {
  time: string;
  // 真实 / 真值（真实情况）
  lat: number;
  lng: number;
  intensity_real: number;
  pressure: number;
  inner_radius_real: number; // RMW, 单位：公里
  outer_radius_real: number; // R34 (34kt), 单位：公里

  // IDOL 模型估计
  lat_pred: number;
  lng_pred: number;
  intensity_pred: number;
  pressure_pred: number;
  inner_radius_pred: number; // RMW, 单位：公里
  outer_radius_pred: number; // R34 (34kt), 单位：公里
}

export interface TyphoonCase {
  id: string;
  stormCode?: string;
  sourceType?: 'csv_truth' | 'manual';
  nameEn: string;
  nameZh: string;
  data: TyphoonPoint[];
}

export type Language = 'en' | 'zh';

// 用于管理主视图状态的新类型
export type ViewType = 'lab_home' | 'lab_team' | 'lab_publications' | 'idol' | 'cloudseer' | 'irradiance_nowcast';
export type LabSectionId = 'overview' | 'team' | 'research' | 'publications';

export interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}


// --- CloudSeer 相关类型定义 ---
export interface CloudSeerBand {
  id: string;
  wavelength: string;
  nameEn: string;
  nameZh: string;
  unit: string;
}

export interface CloudSeerModel {
  id: string;
  nameEn: string;
  nameZh: string;
  isOurs?: boolean;
}

export interface CloudSeerPoint {
  time: string;
  // 8个波段的云图数据 [height, width, bands]
  cloudData: number[][][];
  // ADCMP 位移场 [height, width, 2] (dx, dy)
  displacementField: number[][][];
  // 评估指标
  metrics: {
    mse: number;
    mae: number;
    psnr: number;
    ssim: number;
  };
}

export interface CloudSeerCase {
  id: string;
  nameEn: string;
  nameZh: string;
  type: 'typhoon' | 'convection' | 'front';
  data: CloudSeerPoint[];
}

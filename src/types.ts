
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
export type ViewType = 'map' | 'lab_overview' | 'lab_team' | 'lab_research' | 'lab_publications';

export interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

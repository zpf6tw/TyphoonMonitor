export type ServiceState = 'loading' | 'connected' | 'error' | 'unconfigured';

export interface PredictionRow {
  input_timestamp?: string;
  target_timestamp: string;
  step: number;
  predicted_ghi: number | null;
  observed_ghi?: number | null;
  error?: number | null;
  matured?: boolean;
  model_version?: string;
}

export interface HorizonMetrics {
  count?: number;
  total?: number;
  pending?: number;
  mae?: number | null;
  rmse?: number | null;
  bias?: number | null;
  max_abs_error?: number | null;
}

export interface HorizonSeries {
  step: number;
  minutes: number;
  metrics?: HorizonMetrics;
  history?: PredictionRow[];
  gaps?: Array<{ before?: string; after?: string; reason?: string }>;
}

export interface DashboardOperation {
  state?: string;
  label?: string;
  detail?: string;
  source_now?: string;
  timezone?: string;
  inside_daylight_window?: boolean;
  daylight_start?: string;
  daylight_end?: string;
  next_check_at?: string;
  cadence_minutes?: number;
  latest_sample_at?: string;
  latest_prediction_at?: string;
  data_age_minutes?: number | null;
}

export interface LatestSample {
  timestamp?: string;
  ghi?: number | null;
  clear_sky_ghi?: number | null;
  sky_image_path?: string | null;
  quality?: string;
}

export interface NowcastDashboard {
  model_version?: string;
  focus_steps?: number[];
  mode?: string;
  latest_sample?: LatestSample | null;
  latest_received_sample?: LatestSample | null;
  latest_forecast?: PredictionRow[];
  operation?: DashboardOperation;
  horizons?: HorizonSeries[];
  history_limit?: number;
  history_days?: number;
  realtime_service?: Record<string, unknown> | null;
}

const configuredBaseUrl = (import.meta.env.VITE_IRRADIANCE_API_BASE_URL || '').trim().replace(/\/$/, '');

export const isIrradianceApiConfigured = Boolean(configuredBaseUrl);

export const buildIrradianceApiUrl = (path: string) => `${configuredBaseUrl}${path}`;

export const buildSkyImageUrl = (path?: string | null) => {
  if (!path || !isIrradianceApiConfigured) return null;
  return buildIrradianceApiUrl(`/api/sky-images/file?path=${encodeURIComponent(path)}`);
};

export const fetchNowcastDashboard = async (historyLimit: number, signal?: AbortSignal) => {
  if (!isIrradianceApiConfigured) {
    throw new Error('VITE_IRRADIANCE_API_BASE_URL 未配置');
  }

  const response = await fetch(
    buildIrradianceApiUrl(`/api/nowcast-dashboard?history_limit=${historyLimit}`),
    { signal, headers: { Accept: 'application/json' } },
  );

  if (!response.ok) {
    throw new Error(`实时接口返回 ${response.status}`);
  }

  return response.json() as Promise<NowcastDashboard>;
};

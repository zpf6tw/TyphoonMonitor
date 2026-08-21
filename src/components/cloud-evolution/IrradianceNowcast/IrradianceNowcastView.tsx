import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CloudSun,
  Database,
  Gauge,
  RefreshCw,
  ServerCog,
  SunMedium,
  Waves,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildSkyImageUrl,
  fetchNowcastDashboard,
  isIrradianceApiConfigured,
  type HorizonSeries,
  type NowcastDashboard,
  type PredictionRow,
  type ServiceState,
} from './IrradianceNowcastApi';
import { StationGlobeOverview } from './StationGlobeOverview';

const POLL_INTERVAL_MS = 30_000;
const HISTORY_LIMITS = [24, 72, 144] as const;
const HORIZON_COLORS: Record<number, string> = {
  1: '#d97706',
  2: '#7c3aed',
  3: '#e11d48',
};

const parseNumber = (value: unknown) => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatValue = (value: unknown, digits = 1) => {
  const numberValue = parseNumber(value);
  return numberValue === null ? '—' : numberValue.toFixed(digits);
};

const formatTimestamp = (value?: string | null, compact = false) => {
  if (!value) return '—';
  const normalized = value.replace('T', ' ');
  if (compact && normalized.length >= 16) return normalized.slice(11, 16);
  return normalized.slice(0, 19);
};

const getLatestSampleTimestamp = (dashboard: NowcastDashboard | null) => (
  dashboard?.operation?.latest_sample_at
  || dashboard?.latest_sample?.timestamp
  || dashboard?.latest_received_sample?.timestamp
);

const MetricCard: React.FC<{ label: string; value: string; unit?: string }> = ({ label, value, unit }) => (
  <div className="min-w-[104px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
    <div className="mt-1 whitespace-nowrap text-base font-bold tabular-nums text-slate-900">
      {value}{unit && <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>}
    </div>
  </div>
);

const StatusPill: React.FC<{ state: ServiceState; label: string }> = ({ state, label }) => {
  const tones: Record<ServiceState, string> = {
    connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    loading: 'border-sky-200 bg-sky-50 text-sky-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    unconfigured: 'border-amber-200 bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[state]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === 'connected' ? 'bg-emerald-500' : state === 'loading' ? 'bg-sky-500 motion-safe:animate-pulse' : state === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
      {label}
    </span>
  );
};

const ForecastTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: PredictionRow }> }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold text-slate-500">H+{point.step * 10} 分钟</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{formatValue(point.predicted_ghi)} W/m²</div>
      <div className="text-xs text-slate-500">目标 {formatTimestamp(point.target_timestamp)}</div>
    </div>
  );
};

const ForecastPanel: React.FC<{ rows: PredictionRow[]; issueTime?: string }> = ({ rows, issueTime }) => {
  const data = [...rows]
    .filter(row => parseNumber(row.predicted_ghi) !== null)
    .sort((a, b) => a.step - b.step)
    .map(row => ({ ...row, color: HORIZON_COLORS[row.step] || '#0284c7' }));

  return (
    <section id="irradiance-forecast" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-50 p-2 text-amber-600"><SunMedium size={18} /></span>
          <div>
            <h2 className="text-base font-bold text-slate-900">未来 30 分钟预测</h2>
            <p className="text-xs text-slate-500">三时效预测值与趋势，仅展示尚未发生的目标时刻</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 sm:text-right">
          <div>起报时刻</div>
          <div className="mt-0.5 font-semibold tabular-nums text-slate-700">{formatTimestamp(issueTime)}</div>
        </div>
      </div>

      {data.length ? (
        <>
          <div className="mt-5 h-60 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="target_timestamp"
                  tickFormatter={value => formatTimestamp(String(value), true)}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis width={50} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ForecastTooltip />} />
                <Bar dataKey="predicted_ghi" name="预测 GHI" radius={[8, 8, 2, 2]} maxBarSize={92} isAnimationActive={false}>
                  {data.map(point => <Cell key={`${point.target_timestamp}-${point.step}`} fill={point.color} />)}
                </Bar>
                <Line
                  dataKey="predicted_ghi"
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#ffffff', stroke: '#475569', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  legendType="none"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.map(point => (
              <div key={`${point.step}-${point.target_timestamp}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: point.color }} />
                <div className="text-sm font-bold" style={{ color: point.color }}>H+{point.step * 10} 分钟</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {formatValue(point.predicted_ghi)}<span className="ml-1 text-xs font-medium text-slate-500">W/m²</span>
                </div>
                <div className="mt-1 text-xs tabular-nums text-slate-500">目标 {formatTimestamp(point.target_timestamp)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
          <Clock3 className="text-slate-400" size={28} />
          <div className="mt-3 font-semibold text-slate-700">当前没有可展示的未来预测</div>
          <div className="mt-1 max-w-lg text-sm text-slate-500">系统可能处于夜间窗口、正在等待新的 8 帧输入，或尚未完成本轮推理。</div>
        </div>
      )}
    </section>
  );
};

const HistoryPanel: React.FC<{ horizon: HorizonSeries }> = ({ horizon }) => {
  const color = HORIZON_COLORS[horizon.step] || '#0284c7';
  const history = [...(horizon.history || [])].sort((a, b) => a.target_timestamp.localeCompare(b.target_timestamp));
  const metrics = horizon.metrics || {};
  const verified = metrics.count ?? history.filter(item => item.matured && parseNumber(item.observed_ghi) !== null).length;
  const total = metrics.total ?? history.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg px-2.5 py-2 text-sm font-extrabold text-white" style={{ backgroundColor: color }}>H+{horizon.minutes}</span>
          <div>
            <h3 className="font-bold text-slate-900">{horizon.minutes} 分钟预测</h3>
            <p className="text-xs text-slate-500">实测与起报时预测的独立滚动统计</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard label="MAE" value={formatValue(metrics.mae)} unit="W/m²" />
          <MetricCard label="RMSE" value={formatValue(metrics.rmse)} unit="W/m²" />
          <MetricCard label="偏差" value={formatValue(metrics.bias)} unit="W/m²" />
          <MetricCard label="已验证" value={`${verified}/${total}`} />
        </div>
      </div>

      {history.length ? (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 14, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="target_timestamp"
                tickFormatter={value => formatTimestamp(String(value), true)}
                minTickGap={42}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis width={48} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={value => formatTimestamp(String(value))}
                formatter={(value, name) => [`${formatValue(value)} W/m²`, name === 'observed_ghi' ? '实测 GHI' : '模型预测']}
                contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,.12)' }}
              />
              <Legend formatter={value => value === 'observed_ghi' ? '实测 GHI' : '模型预测'} wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="observed_ghi" stroke="#0f766e" strokeWidth={2.2} dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false} />
              <Line dataKey="predicted_ghi" stroke={color} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          等待该时效产生可验证的历史预测
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{history.length ? `${formatTimestamp(history[0].target_timestamp)} — ${formatTimestamp(history.at(-1)?.target_timestamp)}` : '暂无时间范围'}</span>
        <span>断点 {horizon.gaps?.length || 0} 处；缺测值不参与误差统计</span>
      </div>
    </section>
  );
};

export const IrradianceNowcastView: React.FC = () => {
  const [historyLimit, setHistoryLimit] = useState<number>(72);
  const [dashboard, setDashboard] = useState<NowcastDashboard | null>(null);
  const [serviceState, setServiceState] = useState<ServiceState>(isIrradianceApiConfigured ? 'loading' : 'unconfigured');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken(value => value + 1), []);

  useEffect(() => {
    if (!isIrradianceApiConfigured) return undefined;
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        const data = await fetchNowcastDashboard(historyLimit, controller.signal);
        if (!active) return;
        setDashboard(data);
        setServiceState('connected');
        setErrorMessage('');
        setLastSyncedAt(new Date());
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setServiceState('error');
        setErrorMessage(error instanceof Error ? error.message : '实时接口暂时不可用');
      }
    };

    setServiceState(current => current === 'connected' ? current : 'loading');
    void load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [historyLimit, refreshToken]);

  const forecasts = useMemo(() => dashboard?.latest_forecast || [], [dashboard]);
  const horizons = useMemo(() => [...(dashboard?.horizons || [])].sort((a, b) => a.minutes - b.minutes), [dashboard]);
  const operation = dashboard?.operation;
  const latestSample = dashboard?.latest_sample || dashboard?.latest_received_sample;
  const skyImageUrl = buildSkyImageUrl(latestSample?.sky_image_path);
  const issueTime = operation?.latest_prediction_at || forecasts[0]?.input_timestamp;
  const statusLabel = serviceState === 'connected'
    ? operation?.label || '实时服务正常'
    : serviceState === 'loading'
      ? '正在连接实时服务'
      : serviceState === 'error'
        ? '实时服务异常'
        : '等待配置实时接口';

  return (
    <div className="h-full overflow-y-auto bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 pl-16 shadow-sm backdrop-blur-xl sm:px-6 sm:pl-20">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 text-white shadow-sm"><SunMedium size={23} /></span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">太阳辐照度临近预测</h1>
              <p className="text-xs text-slate-500">ASI-16 天空图 · 地面观测 · 10/20/30 分钟</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill state={serviceState} label={statusLabel} />
            <button
              type="button"
              onClick={refresh}
              disabled={serviceState === 'loading' || serviceState === 'unconfigured'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="立即刷新实时预测"
            >
              <RefreshCw size={14} className={serviceState === 'loading' ? 'motion-safe:animate-spin' : ''} />刷新
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] space-y-4 p-3 sm:p-5">
        <StationGlobeOverview />

        {!isIrradianceApiConfigured && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <ServerCog className="mt-0.5 shrink-0" size={20} />
            <div>
              <div className="font-bold">前端已接入，实时服务地址尚未配置</div>
              <p className="mt-1 text-sm text-amber-800">部署时设置环境变量 VITE_IRRADIANCE_API_BASE_URL，页面会自动每 30 秒拉取最新预测；当前不会展示模拟数据。</p>
            </div>
          </div>
        )}

        {serviceState === 'error' && (
          <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div><div className="font-bold">无法读取实时预测</div><p className="mt-1 text-sm">{errorMessage}；页面保留最后一次成功结果，并将在 30 秒后重试。</p></div>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="最新数据" value={formatTimestamp(getLatestSampleTimestamp(dashboard))} />
          <MetricCard label="最近起报" value={formatTimestamp(issueTime)} />
          <MetricCard label="当前 GHI" value={formatValue(latestSample?.ghi)} unit="W/m²" />
          <MetricCard label="模型版本" value={dashboard?.model_version || forecasts[0]?.model_version || '—'} />
          <MetricCard label="页面同步" value={lastSyncedAt ? lastSyncedAt.toLocaleTimeString('zh-CN', { hour12: false }) : '—'} />
        </section>

        <ForecastPanel rows={forecasts} issueTime={issueTime} />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">近期预测效果</h2>
                <p className="text-xs text-slate-500">误差 = 预测 GHI − 实测 GHI，只统计已到达目标时刻且实测有效的样本</p>
              </div>
              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1">
                {HISTORY_LIMITS.map(limit => (
                  <button
                    type="button"
                    key={limit}
                    onClick={() => setHistoryLimit(limit)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${historyLimit === limit ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                  >最近 {limit} 条</button>
                ))}
              </div>
            </div>
            {horizons.map(horizon => <HistoryPanel key={horizon.step} horizon={horizon} />)}
            {!horizons.length && (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                {serviceState === 'loading' ? '正在读取历史预测…' : '暂无历史预测数据'}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2 font-bold text-slate-900"><CloudSun size={18} className="text-sky-600" />最新天空图</div>
                <span className="text-xs tabular-nums text-slate-500">{formatTimestamp(latestSample?.timestamp, true)}</span>
              </div>
              {skyImageUrl ? (
                <img src={skyImageUrl} alt="ASI-16 最新全天空图" className="aspect-square w-full bg-slate-950 object-contain" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-slate-50 px-8 text-center text-sm text-slate-500">实时接口返回天空图路径后将在此同步显示</div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-900"><Gauge size={18} className="text-sky-600" />运行状态</div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="flex items-center gap-1.5 text-slate-500"><Waves size={14} />数据窗口</dt><dd className="text-right font-semibold text-slate-700">{operation?.inside_daylight_window === false ? '夜间等待' : operation?.inside_daylight_window === true ? '日间运行' : '—'}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="flex items-center gap-1.5 text-slate-500"><Database size={14} />数据延迟</dt><dd className="text-right font-semibold tabular-nums text-slate-700">{formatValue(operation?.data_age_minutes)} 分钟</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="flex items-center gap-1.5 text-slate-500"><Clock3 size={14} />下次检查</dt><dd className="text-right font-semibold tabular-nums text-slate-700">{formatTimestamp(operation?.next_check_at)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="flex items-center gap-1.5 text-slate-500"><CheckCircle2 size={14} />时区</dt><dd className="text-right font-semibold text-slate-700">{operation?.timezone || 'MST'}</dd></div>
              </dl>
              {operation?.detail && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{operation.detail}</p>}
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
};

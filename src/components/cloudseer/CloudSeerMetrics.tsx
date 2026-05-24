import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { CloudSeerPoint, Language } from '../../types';
import { TRANSLATIONS } from '../../constants';

const BAND_IDS = ['0.64', '1.6', '3.9', '8.6', '10.4', '11.2', '12.3', '13.3'];

interface CloudSeerMetricsProps {
  data: CloudSeerPoint[];
  currentIndex: number;
  language: Language;
  selectedBandId: string;
}

interface MetricsData {
  mae: number[][];
  mse: number[][];
  ssim: number[][];
  psnr: number[][];
}

export const CloudSeerMetrics: React.FC<CloudSeerMetricsProps> = ({
  data,
  currentIndex,
  language,
  selectedBandId,
}) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetch('/metrics.json')
      .then((res) => res.json())
      .then(setMetrics)
      .catch((err) => console.error('Failed to load metrics:', err));
  }, []);

  const bandIndex = BAND_IDS.indexOf(selectedBandId);
  const isLoading = !metrics || bandIndex === -1;
  const isPastFrame = currentIndex <= 5;
  const predStep = currentIndex - 6; // 0~5

  // 构建未来 6 帧图表数据
  const chartData = React.useMemo(() => {
    if (isLoading) return [];

    const maeRow = metrics.mae[bandIndex];
    const mseRow = metrics.mse[bandIndex];
    const ssimRow = metrics.ssim[bandIndex];
    const psnrRow = metrics.psnr[bandIndex];

    return data.slice(6).map((point, idx) => ({
      time: point.time,
      mse: mseRow[idx],
      mae: maeRow[idx],
      ssim: ssimRow[idx],
      psnr: psnrRow[idx],
    }));
  }, [data, metrics, bandIndex, isLoading]);

  const currentMetrics = {
    mse: isPastFrame ? null : metrics?.mse[bandIndex]?.[predStep] ?? null,
    mae: isPastFrame ? null : metrics?.mae[bandIndex]?.[predStep] ?? null,
    ssim: isPastFrame ? null : metrics?.ssim[bandIndex]?.[predStep] ?? null,
    psnr: isPastFrame ? null : metrics?.psnr[bandIndex]?.[predStep] ?? null,
  };

  const commonChartProps = {
    data: chartData,
    margin: { top: 5, right: 10, left: 0, bottom: 0 },
  };

  const commonXAxisProps = {
    dataKey: 'time',
    fontSize: 9,
    tickLine: false,
    axisLine: false,
    interval: 0,
  };

  const commonYAxisProps = {
    fontSize: 9,
    tickLine: false,
    axisLine: false,
    width: 35,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            fontSize: '10px',
            padding: '8px',
            backgroundColor: '#fff',
          }}
        >
          <p style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: 0 }}>
              {entry.name}: {entry.value?.toFixed(entry.name === 'MAE' || entry.name === 'SSIM' ? 3 : 2)}
              {entry.name === 'PSNR' && ' dB'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center text-slate-400 text-sm py-4">Loading metrics...</div>;
  }

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* MSE & MAE 图表 */}
      <div className="flex flex-col">
        <h4 className="text-[10px] font-semibold text-slate-500 mb-2 pl-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {t('mse')} & {t('mae')}
        </h4>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} yAxisId="left" domain={['auto', 'auto']} />
              <YAxis {...commonYAxisProps} yAxisId="right" orientation="right" domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              {!isPastFrame && predStep < chartData.length && (
                <ReferenceLine x={chartData[predStep]?.time} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              )}
              <Legend iconType="plainline" wrapperStyle={{ fontSize: '9px', marginTop: '-5px' }} />
              <Line
                yAxisId="left"
                name={t('mse')}
                type="monotone"
                dataKey="mse"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                yAxisId="right"
                name={t('mae')}
                type="monotone"
                dataKey="mae"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PSNR & SSIM 图表 */}
      <div className="flex flex-col border-t border-slate-100 pt-3">
        <h4 className="text-[10px] font-semibold text-slate-500 mb-2 pl-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t('psnr')} & {t('ssim')}
        </h4>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis {...commonXAxisProps} />
              {/* PSNR 左轴：自动域 */}
              <YAxis
                {...commonYAxisProps}
                yAxisId="left"
                domain={['auto', 'auto']}
              />
              {/* SSIM 右轴：动态域，放大局部变化 */}
              <YAxis
                {...commonYAxisProps}
                yAxisId="right"
                orientation="right"
                domain={['dataMin - 0.05', 'dataMax + 0.05']}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              {!isPastFrame && predStep < chartData.length && (
                <ReferenceLine x={chartData[predStep]?.time} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              )}
              <Legend iconType="plainline" wrapperStyle={{ fontSize: '9px', marginTop: '-5px' }} />
              <Line
                yAxisId="left"
                name={t('psnr')}
                type="monotone"
                dataKey="psnr"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                yAxisId="right"
                name={t('ssim')}
                type="monotone"
                dataKey="ssim"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 当前指标数值卡片 */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div
          className={`p-3 rounded-xl border transition-all ${
            isPastFrame ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('mse')}</p>
          {isPastFrame || currentMetrics.mse === null ? (
            <p className="text-lg font-mono font-bold text-slate-300">—</p>
          ) : (
            <p className="text-lg font-mono font-bold text-red-600">{currentMetrics.mse.toFixed(2)}</p>
          )}
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            isPastFrame ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('mae')}</p>
          {isPastFrame || currentMetrics.mae === null ? (
            <p className="text-lg font-mono font-bold text-slate-300">—</p>
          ) : (
            <p className="text-lg font-mono font-bold text-amber-600">{currentMetrics.mae.toFixed(3)}</p>
          )}
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            isPastFrame ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('psnr')}</p>
          {isPastFrame || currentMetrics.psnr === null ? (
            <p className="text-lg font-mono font-bold text-slate-300">—</p>
          ) : (
            <p className="text-lg font-mono font-bold text-emerald-600">
              {currentMetrics.psnr.toFixed(2)} <span className="text-xs text-slate-400">dB</span>
            </p>
          )}
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            isPastFrame ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('ssim')}</p>
          {isPastFrame || currentMetrics.ssim === null ? (
            <p className="text-lg font-mono font-bold text-slate-300">—</p>
          ) : (
            <p className="text-lg font-mono font-bold text-indigo-600">{currentMetrics.ssim.toFixed(3)}</p>
          )}
        </div>
      </div>

      {isPastFrame && (
        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            {language === 'en'
              ? 'Past observation frame, no prediction error metrics'
              : '过去实况观测帧，无预测误差指标'}
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { TyphoonPoint, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface MetricsChartProps {
  data: TyphoonPoint[];
  currentIndex: number;
  language: Language;
}

const MAX_X_TICKS = 4;

interface TimeMeta {
  dayKey: string;
  hour: number;
}

const parseTimeMeta = (time: string, index: number): TimeMeta => {
  // e.g. 2015-08-15 06:00 or 08-15 06:00
  const dateWithTimeMatch = time.match(/(?:\d{4}-)?(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (dateWithTimeMatch) {
    const [, month, day, hour] = dateWithTimeMatch;
    return {
      dayKey: `${month}-${day}`,
      hour: Number(hour),
    };
  }

  const dateMatch = time.match(/(?:\d{4}-)?(\d{2})-(\d{2})/);
  const hourMatch = time.match(/(\d{1,3}):(\d{2})/);

  if (dateMatch) {
    return {
      dayKey: `${dateMatch[1]}-${dateMatch[2]}`,
      hour: hourMatch ? Number(hourMatch[1]) % 24 : 0,
    };
  }

  // e.g. 27:00 (cumulative hour timeline)
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    const day = Math.floor(hour / 24) + 1;
    return {
      dayKey: `D${day}`,
      hour: hour % 24,
    };
  }

  // Fallback: assume 3-hour interval and 8 points per day
  return {
    dayKey: `D${Math.floor(index / 8) + 1}`,
    hour: (index * 3) % 24,
  };
};

const formatDayLabel = (bucket: string, language: Language): string => {
  if (bucket.startsWith('D')) {
    const dayNumber = bucket.replace('D', '');
    return language === 'zh' ? `第${dayNumber}天` : `Day ${dayNumber}`;
  }

  const [, day] = bucket.split('-');
  if (!day) {
    return bucket;
  }

  return language === 'zh' ? `${Number(day)}日` : day;
};

export const MetricsChart: React.FC<MetricsChartProps> = ({ data, currentIndex, language }) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  const currentPoint = data[currentIndex];

  const xAxisTickConfig = useMemo(() => {
    if (!data.length) {
      return {
        ticks: [] as string[],
        labelMap: new Map<string, string>(),
      };
    }

    const dayOrder: string[] = [];
    const dayToIndices = new Map<string, number[]>();
    const anchorHour = parseTimeMeta(data[0].time, 0).hour;

    data.forEach((point, idx) => {
      const { dayKey } = parseTimeMeta(point.time, idx);
      if (!dayToIndices.has(dayKey)) {
        dayToIndices.set(dayKey, []);
        dayOrder.push(dayKey);
      }
      dayToIndices.get(dayKey)?.push(idx);
    });

    const dayStep = dayOrder.length <= MAX_X_TICKS ? 1 : Math.ceil(dayOrder.length / MAX_X_TICKS);
    const selectedDayKeys = dayOrder
      .filter((_, dayIdx) => dayIdx % dayStep === 0)
      .slice(0, MAX_X_TICKS);

    const selectedIndices = selectedDayKeys
      .map((dayKey) => {
        const candidateIndices = dayToIndices.get(dayKey) || [];
        if (!candidateIndices.length) {
          return null;
        }

        // 统一使用接近起始小时的点作为该天代表，保证日期间隔观感一致
        return candidateIndices.reduce((bestIdx, idx) => {
          const bestDelta = Math.abs(parseTimeMeta(data[bestIdx].time, bestIdx).hour - anchorHour);
          const currentDelta = Math.abs(parseTimeMeta(data[idx].time, idx).hour - anchorHour);
          return currentDelta < bestDelta ? idx : bestIdx;
        }, candidateIndices[0]);
      })
      .filter((idx): idx is number => idx !== null);

    const labelMap = new Map<string, string>();
    selectedIndices.forEach((idx, order) => {
      const rawValue = data[idx].time;
      const dayKey = selectedDayKeys[order] || parseTimeMeta(rawValue, idx).dayKey;
      labelMap.set(rawValue, formatDayLabel(dayKey, language));
    });

    return {
      ticks: selectedIndices.map((idx) => data[idx].time),
      labelMap,
    };
  }, [data, language]);

  const commonChartProps = {
    data: data,
    margin: { top: 5, right: 10, left: 0, bottom: 0 },
    syncId: "typhoonSync"
  };

  const commonXAxisProps = {
    dataKey: "time",
    fontSize: 10,
    tickLine: false,
    axisLine: false,
    interval: 0,
    ticks: xAxisTickConfig.ticks,
    tickFormatter: (value: string) => xAxisTickConfig.labelMap.get(String(value)) || '',
    minTickGap: 48
  };

  const commonYAxisProps = {
    fontSize: 10,
    tickLine: false,
    axisLine: false,
    width: 40
  };

  const tooltipStyle = {
    contentStyle: { borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '8px' },
    labelStyle: { fontWeight: 'bold', marginBottom: '4px' }
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* 图表 1：风速 */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-semibold text-slate-500 mb-2 pl-1">{t('wind_speed')}</h4>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} />
              <ReferenceLine x={currentPoint?.time} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: '10px', marginTop: '-5px' }} />
              <Line
                name={t('traditional_method')}
                type="monotone"
                dataKey="intensity_real"
                stroke="#64748b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                name={t('idol_model')}
                type="monotone"
                dataKey="intensity_pred"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 图表 2：气压 */}
      <div className="flex flex-col border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-semibold text-slate-500 mb-2 pl-1">{t('pressure')}</h4>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} />
              <ReferenceLine x={currentPoint?.time} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: '10px', marginTop: '-5px' }} />
              <Line
                name={t('traditional_method')}
                type="monotone"
                dataKey="pressure"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                name={t('idol_model')}
                type="monotone"
                dataKey="pressure_pred"
                stroke="#c4b5fd"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 图表 3：半径 */}
      <div className="flex flex-col border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-semibold text-slate-500 mb-2 pl-1">{t('wind_radii')}</h4>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} domain={[0, 'auto']} />
              <Tooltip {...tooltipStyle} />
              <ReferenceLine x={currentPoint?.time} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: '10px', marginTop: '-5px' }} />

              {/* RMW */}
              <Line
                name={`${t('traditional_method')} (${t('rmw_short')})`}
                type="monotone"
                dataKey="inner_radius_real"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name={`${t('idol_model')} (${t('rmw_short')})`}
                type="monotone"
                dataKey="inner_radius_pred"
                stroke="#fcd34d"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* R34 */}
              <Line
                name={`${t('traditional_method')} (${t('r34_short')})`}
                type="monotone"
                dataKey="outer_radius_real"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name={`${t('idol_model')} (${t('r34_short')})`}
                type="monotone"
                dataKey="outer_radius_pred"
                stroke="#6ee7b7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};


import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend
} from 'recharts';
import { TyphoonPoint, Language } from '../../types';
import { TRANSLATIONS } from '../../constants';

interface TyphoonMetricsChartProps {
  data: TyphoonPoint[];
  currentIndex: number;
  language: Language;
}

const MAX_X_TICKS = 4;
const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;

interface TimeMeta {
  dayKey: string;
  hour: number;
}

const parseTimeMeta = (time: string, index: number): TimeMeta => {
  // 优先解析标准时间，例如 2015-08-15 06:00 或 08-15 06:00。
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

  // 兼容累计小时格式，例如 27:00 表示第 2 天 03:00。
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    const day = Math.floor(hour / 24) + 1;
    return {
      dayKey: `D${day}`,
      hour: hour % 24,
    };
  }

  // 最后按 3 小时间隔兜底，保证非标准时间字符串仍能生成日期刻度。
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

export const TyphoonMetricsChart: React.FC<TyphoonMetricsChartProps> = ({ data, currentIndex, language }) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  const currentPoint = data[currentIndex];

  // X 轴按“天”抽样，而不是直接显示所有时间点，避免右侧窄面板标签拥挤。
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

        // 每天选接近起始小时的点作为代表，让不同日期之间的视觉间隔更稳定。
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

  // 三张图共享同一套坐标轴和提示框配置，保证对比阅读方式一致。
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
      {/* 风速图对比传统估计和 IDOL 模型输出，参考线标记当前时间点。 */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-semibold text-slate-500 mb-2 pl-1">{t('wind_speed')}</h4>
        <div className="h-[160px] w-full overflow-hidden">
          <LineChart width={CHART_WIDTH} height={CHART_HEIGHT} {...commonChartProps}>
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
        </div>
      </div>

      {/* 气压图使用同一时间轴，便于和风速变化同步观察。 */}
      <div className="flex flex-col border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-semibold text-slate-500 mb-2 pl-1">{t('pressure')}</h4>
        <div className="h-[160px] w-full overflow-hidden">
          <LineChart width={CHART_WIDTH} height={CHART_HEIGHT} {...commonChartProps}>
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
        </div>
      </div>

      {/* 半径图同时展示 RMW 与 R34，突出内外风圈结构的模型差异。 */}
      <div className="flex flex-col border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-semibold text-slate-500 mb-2 pl-1">{t('wind_radii')}</h4>
        <div className="h-[160px] w-full overflow-hidden">
          <LineChart width={CHART_WIDTH} height={CHART_HEIGHT} {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} domain={[0, 'auto']} />
              <Tooltip {...tooltipStyle} />
              <ReferenceLine x={currentPoint?.time} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: '10px', marginTop: '-5px' }} />

              {/* RMW：最大风速半径，对应地图上的内风圈。 */}
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

              {/* R34：34 kt 风圈半径，对应地图上的外风圈。 */}
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
        </div>
      </div>
    </div>
  );
};

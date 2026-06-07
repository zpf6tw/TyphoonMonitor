import React from 'react';
import { Language } from '../../../types';
import { CLOUD_IMAGE_MODE_LABELS, CloudImageMode } from '../../../utils/cloudFrames';

interface CloudLegendStop {
  color: string;
  position: number;
}

// 前端展示用亮温色标，需要与云图生成脚本中的配色方案保持一致。
const CLOUD_TEMPERATURE_LEGENDS: Record<CloudImageMode, CloudLegendStop[]> = {
  pseudoColor: [
    { color: '#6b8094', position: 0 },
    { color: '#b8d1eb', position: 10 },
    { color: '#f5faff', position: 24 },
    { color: '#ffeb80', position: 40 },
    { color: '#ff8a33', position: 56 },
    { color: '#eb242e', position: 72 },
    { color: '#c21fd1', position: 88 },
    { color: '#3ddcff', position: 100 },
  ],
  coolWhite: [
    { color: '#4d617a', position: 0 },
    { color: '#8aa8c7', position: 14 },
    { color: '#c2dbf0', position: 30 },
    { color: '#ebf7ff', position: 50 },
    { color: '#ffffff', position: 72 },
    { color: '#d1f0ff', position: 88 },
    { color: '#9ed6ff', position: 100 },
  ],
};

// 依据当前云图模式生成渐变背景，避免 JSX 中直接拼接色标细节。
const buildLegendGradient = (mode: CloudImageMode): string => {
  const stops = CLOUD_TEMPERATURE_LEGENDS[mode]
    .map(stop => `${stop.color} ${stop.position}%`)
    .join(', ');
  return `linear-gradient(90deg, ${stops})`;
};

// 亮温图例固定为只读浮层，不接收鼠标事件，避免影响地图拖拽。
export const CloudTemperatureLegend: React.FC<{
  mode: CloudImageMode;
  language: Language;
  leftClassName: string;
}> = ({ mode, language, leftClassName }) => (
  <div className={`absolute top-[7.75rem] ${leftClassName} z-[1000] w-[280px] rounded-2xl border border-white bg-white/95 backdrop-blur-md p-3 shadow-xl pointer-events-none`}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold text-slate-700">
        {CLOUD_IMAGE_MODE_LABELS[mode][language]}
      </span>
      <span className="text-[10px] font-semibold text-slate-400">
        {language === 'en' ? 'BT (K)' : '亮温 (K)'}
      </span>
    </div>
    <div
      className="mt-2 h-3 w-full rounded-sm border border-slate-200"
      style={{ background: buildLegendGradient(mode) }}
    />
    <div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-500">
      <span>290K</span>
      <span>240K</span>
      <span>190K</span>
    </div>
    <p className="mt-2 text-[10px] leading-snug text-slate-500">
      {language === 'en'
        ? 'Himawari-8 infrared Band 13, lower brightness temperature means colder cloud tops.'
        : '使用葵花8号红外波段13通道数据，亮温越低表示云顶越冷。'}
    </p>
  </div>
);

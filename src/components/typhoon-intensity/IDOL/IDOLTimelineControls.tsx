import React from 'react';
import { ChevronLeft, ChevronRight, Cloud, Pause, Play, RotateCcw } from 'lucide-react';
import { Language } from '../../../types';
import {
  CLOUD_IMAGE_MODE_LABELS,
  CLOUD_IMAGE_MODES,
  CloudImageMode,
} from '../../../utils/cloudFrames';

interface IDOLTimelineControlsProps {
  language: Language;
  isPlaying: boolean;
  showCloudMap: boolean;
  cloudMode: CloudImageMode;
  isBuffering: boolean;
  bufferProgress: number;
  currentUtcLabel: string;
  currentIndex: number;
  lastIndex: number;
  timelineLabels: string[];
  visibleTimelineLabelIndices: number[];
  t: (key: string) => string;
  onTogglePlaying: () => void;
  onReset: () => void;
  onToggleCloudMap: () => void;
  onCloudModeChange: (mode: CloudImageMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onTimelineChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// 底部时间轴集中处理播放、云图模式、缓冲提示和逐帧跳转控制。
export const IDOLTimelineControls: React.FC<IDOLTimelineControlsProps> = ({
  language,
  isPlaying,
  showCloudMap,
  cloudMode,
  isBuffering,
  bufferProgress,
  currentUtcLabel,
  currentIndex,
  lastIndex,
  timelineLabels,
  visibleTimelineLabelIndices,
  t,
  onTogglePlaying,
  onReset,
  onToggleCloudMap,
  onCloudModeChange,
  onPrevious,
  onNext,
  onScrubStart,
  onScrubEnd,
  onTimelineChange,
}) => (
  <div className="absolute bottom-0 left-0 right-0 z-[1001] pointer-events-none">
    <div className="bg-white/95 backdrop-blur-md p-6 pb-6 border-t border-slate-200 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col gap-4 pointer-events-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlaying}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}
            >
              {isPlaying
                ? <Pause size={20} fill="currentColor" />
                : <Play size={20} className="ml-1" fill="currentColor" />}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
              title={language === 'en' ? 'Reset' : '重置'}
            >
              <RotateCcw size={18} />
            </button>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full p-1 shrink-0">
              <button
                type="button"
                onClick={onToggleCloudMap}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${showCloudMap ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'}`}
                title={language === 'en' ? 'Toggle Cloud Map' : '切换红外云图'}
              >
                <Cloud size={16} />
              </button>
              {CLOUD_IMAGE_MODES.map(mode => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => onCloudModeChange(mode)}
                  className={`h-8 min-w-[52px] px-2 rounded-full text-[11px] font-bold transition-colors ${showCloudMap && cloudMode === mode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-blue-600'}`}
                >
                  {CLOUD_IMAGE_MODE_LABELS[mode][language]}
                </button>
              ))}
            </div>
          </div>
          <div className="whitespace-nowrap">
            <h4 className="text-sm font-bold text-slate-800">{t('timeline')}</h4>
            <p className="text-[10px] text-slate-400 font-medium">
              {isBuffering
                ? (language === 'en' ? `Buffering ${bufferProgress}%` : `缓冲中 ${bufferProgress}%`)
                : t('zoom_hint')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shrink-0">
          <div className="text-right whitespace-nowrap">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {language === 'en' ? 'UTC' : '协调世界时'}
            </p>
            <p className="text-sm font-bold text-blue-600">{currentUtcLabel}</p>
          </div>
          <div className="h-8 w-px bg-slate-200 shrink-0" />
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={onPrevious}
              className="p-1 hover:bg-slate-200 rounded text-slate-400"
              aria-label={language === 'en' ? 'Previous frame' : '上一帧'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1 hover:bg-slate-200 rounded text-slate-400"
              aria-label={language === 'en' ? 'Next frame' : '下一帧'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min="0"
          max={lastIndex}
          value={currentIndex}
          onPointerDown={onScrubStart}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
          onTouchStart={onScrubStart}
          onTouchEnd={onScrubEnd}
          onChange={onTimelineChange}
          className="relative z-10 w-full h-1.5 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-lg pointer-events-none z-0"
          style={{ width: `${lastIndex > 0 ? (currentIndex / lastIndex) * 100 : 0}%` }}
        />
      </div>

      <div className="relative h-4 px-1">
        {visibleTimelineLabelIndices.map(idx => {
          const label = timelineLabels[idx];
          const left = lastIndex > 0 ? (idx / lastIndex) * 100 : 0;

          // 首尾时间标签贴边，中间标签居中，避免时间轴边缘文字溢出。
          const alignClass = idx === 0
            ? 'left-0 translate-x-0 text-left'
            : idx === lastIndex
              ? 'left-full -translate-x-full text-right'
              : '-translate-x-1/2 text-center';

          return (
            <span
              key={`${label}-${idx}`}
              className={`absolute text-[10px] text-slate-400 font-bold whitespace-nowrap ${alignClass}`}
              style={idx === 0 || idx === lastIndex ? undefined : { left: `${left}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  </div>
);

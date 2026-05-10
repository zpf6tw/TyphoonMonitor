
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TyphoonMap } from './components/TyphoonMap';
import { MetricsChart } from './components/MetricsChart';
import { LabOverview, LabTeam, LabResearch, LabPublications } from './components/LabPages';
import { MOCK_CASES } from './utils/dataGenerator';
import { Language, ViewType } from './types';
import { TRANSLATIONS } from './constants';
import {
  CLOUD_FRAMES_BY_STORM,
  CLOUD_IMAGE_MODE_LABELS,
  CLOUD_IMAGE_MODES,
  CloudImageMode,
  getPrimaryCloudFrames,
  resolveStormCloudKey
} from './utils/cloudFrames';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  ChevronDown,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Settings2,
  Cloud
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// 可折叠面板组件
const CollapsiblePanel: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  extraHeader?: React.ReactNode;
}> = ({ title, isOpen, onToggle, children, extraHeader }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0 transition-all duration-300">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100 transition-colors border-b border-transparent data-[open=true]:border-slate-100"
      data-open={isOpen}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">{title}</span>
        {extraHeader}
      </div>
      <ChevronDown
        size={16}
        className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    <div
      className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className="p-4 pt-4">
        {children}
      </div>
    </div>
  </div>
);

const CaseSelectorDropdown: React.FC<{
  options: typeof MOCK_CASES;
  value: string;
  onChange: (id: string) => void;
  language: Language;
}> = ({ options, value, onChange, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 bg-slate-100/50 text-sm font-semibold text-slate-700 outline-none border-none py-1.5 px-3 rounded-lg hover:bg-slate-200/50 cursor-pointer transition-colors"
      >
        {selectedOption ? (language === 'en' ? selectedOption.nameEn : selectedOption.nameZh) : ''}
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-full max-h-72 overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl z-50"
          >
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 truncate ${value === option.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
              >
                {language === 'en' ? option.nameEn : option.nameZh}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PLAYBACK_INTERVAL_MS = 1200;
const POINT_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;

const toPointTimestamp = (time: string): string => {
  const match = String(time).match(POINT_TIME_PATTERN);
  if (!match) {
    return String(time).replace(/\D/g, '').slice(0, 10);
  }

  const [, year, month, day, hour] = match;
  return `${year}${month}${day}${hour}`;
};

const toTimelineShortLabel = (time: string): string => {
  const match = String(time).match(POINT_TIME_PATTERN);
  if (!match) {
    return time;
  }

  const [, , month, day, hour, minute] = match;
  return `${month}-${day} ${hour}:${minute}`;
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh');
  const [selectedCaseId, setSelectedCaseId] = useState(MOCK_CASES[0].id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const readyFrameIndicesRef = useRef<Set<number>>(new Set());
  const [loadedFrameCount, setLoadedFrameCount] = useState(0);

  // 导航状态
  const [currentView, setCurrentView] = useState<ViewType>('map');

  // 布局状态
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [showCloudMap, setShowCloudMap] = useState(true);
  const [cloudMode, setCloudMode] = useState<CloudImageMode>('pseudoColor');

  // 面板内部状态
  const [panels, setPanels] = useState({
    metrics: true,
    physics: true
  });

  const togglePanel = (key: keyof typeof panels) => {
    setPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCase = useMemo(
    () => MOCK_CASES.find(c => c.id === selectedCaseId) || MOCK_CASES[0],
    [selectedCaseId]
  );

  const activeStormCloudKey = useMemo(
    () => resolveStormCloudKey(selectedCase.stormCode, selectedCase.nameEn),
    [selectedCase.stormCode, selectedCase.nameEn]
  );

  const activeCloudFrameGroups = useMemo(
    () => (activeStormCloudKey ? CLOUD_FRAMES_BY_STORM[activeStormCloudKey] : null),
    [activeStormCloudKey]
  );

  const activeCloudFrames = useMemo(
    () => activeCloudFrameGroups?.[cloudMode] || [],
    [activeCloudFrameGroups, cloudMode]
  );

  const timelineCloudFrames = useMemo(
    () => {
      if (activeCloudFrames.length > 0) {
        return activeCloudFrames;
      }
      return activeCloudFrameGroups ? getPrimaryCloudFrames(activeCloudFrameGroups) : [];
    },
    [activeCloudFrameGroups, activeCloudFrames]
  );

  const timelineData = useMemo(() => selectedCase.data, [selectedCase.data]);

  const timelineLabels = useMemo(
    () => timelineData.map(point => toTimelineShortLabel(point.time)),
    [timelineData]
  );

  const cloudFrameUrls = useMemo(() => {
    const framesByTimestamp = new Map(
      timelineCloudFrames.map(frame => [frame.timestamp, frame.url])
    );

    return timelineData.map(point => framesByTimestamp.get(toPointTimestamp(point.time)) || null);
  }, [timelineCloudFrames, timelineData]);

  const validCloudFrameCount = useMemo(
    () => cloudFrameUrls.filter(Boolean).length,
    [cloudFrameUrls]
  );

  const handleCloudFrameLoaded = useCallback((frameIndex: number) => {
    const readyFrames = readyFrameIndicesRef.current;
    if (frameIndex < 0 || frameIndex >= timelineData.length || !cloudFrameUrls[frameIndex] || readyFrames.has(frameIndex)) {
      return;
    }

    readyFrames.add(frameIndex);
    setLoadedFrameCount(readyFrames.size);
  }, [cloudFrameUrls, timelineData.length]);

  const currentPoint = timelineData[currentIndex] || timelineData[0];
  const currentUtcLabel = currentPoint?.time || timelineLabels[currentIndex] || '--:--';
  const nextFrameIndex = Math.min(currentIndex + 1, Math.max(0, timelineData.length - 1));
  const nextFrameHasCloudImage = Boolean(cloudFrameUrls[nextFrameIndex]);
  const shouldBufferCloudFrames = showCloudMap && validCloudFrameCount > 0;
  const isBuffering = isPlaying
    && shouldBufferCloudFrames
    && nextFrameHasCloudImage
    && currentIndex < timelineData.length - 1
    && !readyFrameIndicesRef.current.has(nextFrameIndex);
  const bufferProgress = validCloudFrameCount > 0
    ? Math.min(100, Math.round((loadedFrameCount / validCloudFrameCount) * 100))
    : 100;

  const timelineLabelStep = useMemo(() => {
    if (timelineLabels.length <= 10) {
      return 1;
    }
    return Math.ceil(timelineLabels.length / 9);
  }, [timelineLabels.length]);

  const visibleTimelineLabelIndices = useMemo(() => {
    if (!timelineLabels.length) {
      return [] as number[];
    }

    const lastIndex = timelineLabels.length - 1;
    const indices = new Set<number>([0, lastIndex]);

    for (let i = 0; i < timelineLabels.length; i += timelineLabelStep) {
      indices.add(i);
    }

    const sortedIndices = Array.from(indices).sort((a, b) => a - b);

    // 数据量很大时，过滤掉与首尾过近的标签，避免末尾文本重叠
    if (timelineLabels.length <= 12 || sortedIndices.length <= 2) {
      return sortedIndices;
    }

    const minIndexGap = Math.max(2, Math.floor(lastIndex * 0.1));

    return sortedIndices.filter((idx, order, arr) => {
      if (order === 0 || order === arr.length - 1) {
        return true;
      }

      const prev = arr[order - 1];
      const next = arr[order + 1];
      return idx - prev >= minIndexGap && next - idx >= minIndexGap;
    });
  }, [timelineLabels, timelineLabelStep]);

  const t = (key: string) => TRANSLATIONS[key][language];

  const startScrubbing = useCallback(() => {
    setIsScrubbing(true);
  }, []);

  const stopScrubbing = useCallback(() => {
    setIsScrubbing(false);
  }, []);

  useEffect(() => {
    if (!timelineData.length) {
      return;
    }

    if (currentIndex > timelineData.length - 1) {
      setCurrentIndex(Math.max(0, timelineData.length - 1));
    }
  }, [currentIndex, timelineData.length]);

  useEffect(() => {
    readyFrameIndicesRef.current = new Set<number>();
    setLoadedFrameCount(0);
  }, [selectedCaseId, cloudFrameUrls, cloudMode]);

  useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    const handlePointerRelease = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('pointerup', handlePointerRelease);
    window.addEventListener('pointercancel', handlePointerRelease);

    return () => {
      window.removeEventListener('pointerup', handlePointerRelease);
      window.removeEventListener('pointercancel', handlePointerRelease);
    };
  }, [isScrubbing]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && currentView === 'map') {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= timelineData.length - 1) {
            setIsPlaying(false);
            return prev;
          }

          if (!shouldBufferCloudFrames) {
            return prev + 1;
          }

          const next = prev + 1;
          if (!cloudFrameUrls[next]) {
            return next;
          }

          const readyFrames = readyFrameIndicesRef.current;
          if (readyFrames.has(next)) {
            return next;
          }

          return prev;
        });
      }, PLAYBACK_INTERVAL_MS);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timelineData.length, currentView, shouldBufferCloudFrames, cloudFrameUrls]);

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextIndex = Number.parseInt(e.target.value, 10);
    const clamped = Math.min(Math.max(nextIndex, 0), Math.max(0, timelineData.length - 1));
    setCurrentIndex(clamped);
    setIsPlaying(false);
  };

  const resetSimulation = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  // 基于 currentView 的主内容渲染器
  const renderMainContent = () => {
    switch (currentView) {
      case 'lab_overview':
        return <LabOverview language={language} />;
      case 'lab_team':
        return <LabTeam language={language} />;
      case 'lab_research':
        return <LabResearch language={language} />;
      case 'lab_publications':
        return <LabPublications language={language} />;
      case 'map':
      default:
        // 渲染地图及其覆盖层
        return (
          <>
            {/* 地图视图 */}
            <div className="absolute inset-0 z-0">
              <TyphoonMap
                data={timelineData}
                currentIndex={currentIndex}
                showCloudMap={showCloudMap}
                cloudMode={cloudMode}
                cloudFrameUrls={cloudFrameUrls}
                language={language}
                isPlaying={isPlaying}
                isScrubbing={isScrubbing}
                legendLeftClassName={!isLeftPanelOpen ? 'left-[4.5rem]' : 'left-6'}
                onCloudFrameLoaded={handleCloudFrameLoaded}
              />
            </div>

            {/* 悬浮展开按钮 - 右侧 */}
            {!isRightPanelOpen && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setIsRightPanelOpen(true)}
                className="absolute top-6 right-6 z-[1002] bg-white p-2 rounded-lg shadow-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                title="Expand Dashboard"
              >
                <PanelRightOpen size={20} />
              </motion.button>
            )}

            {/* 顶部悬浮控制区域 */}
            <div
              className={`absolute top-6 right-6 z-[1001] transition-all duration-300 ease-in-out pointer-events-none flex flex-wrap gap-4 items-start ${!isLeftPanelOpen ? 'left-[4.5rem]' : 'left-6'
                }`}
            >
              {/* 场次选择器 */}
              <div className="bg-white/95 backdrop-blur-md w-[280px] p-3 rounded-2xl shadow-xl border border-white flex flex-col items-stretch gap-2 pointer-events-auto shrink-0 h-fit">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-blue-500" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('active_case')}</span>
                </div>
                <CaseSelectorDropdown
                  options={MOCK_CASES}
                  value={selectedCaseId}
                  language={language}
                  onChange={(id) => {
                    setSelectedCaseId(id);
                    setCurrentIndex(0);
                    setIsPlaying(false);
                  }}
                />
              </div>

              {/* 占位，让右侧的仪表盘靠右 */}
              <div className="flex-1 min-w-[20px]"></div>

              {/* 悬浮指示器 - 8 参数对比仪表盘 */}
              <div className={`bg-white/95 backdrop-blur-md p-5 rounded-[20px] border border-white shadow-2xl flex flex-col gap-4 min-w-[280px] pointer-events-auto shrink-0 h-fit transition-all duration-300 ${!isRightPanelOpen ? 'mt-12' : ''}`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  <span>{t('model_comparison')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                </div>

                {/* 对比网格 */}
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-3">
                  {/* 表头 */}
                  <div className="h-4"></div> {/* 空白角 */}
                  <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter bg-slate-50 rounded py-0.5">
                    {t('traditional_method')}
                  </div>
                  <div className="text-[10px] font-bold text-blue-500 text-center uppercase tracking-tighter bg-blue-50 rounded py-0.5">
                    {t('idol_model')}
                  </div>

                  {/* 第 1 行：内半径 */}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                    {t('r_inner')}
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_0_1px_rgba(59,130,246,0.3)]" />
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-slate-600">
                    {currentPoint.inner_radius_real}<span className="text-[8px] text-slate-400 ml-0.5 font-normal">km</span>
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-blue-600">
                    {currentPoint.inner_radius_pred}<span className="text-[8px] text-blue-400 ml-0.5 font-normal">km</span>
                  </div>

                  {/* 第 2 行：外半径 */}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                    {t('r_outer')}
                    <div className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-blue-50" />
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-slate-600">
                    {currentPoint.outer_radius_real}<span className="text-[8px] text-slate-400 ml-0.5 font-normal">km</span>
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-blue-600">
                    {currentPoint.outer_radius_pred}<span className="text-[8px] text-blue-400 ml-0.5 font-normal">km</span>
                  </div>

                  {/* 第 3 行：风速 */}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center">
                    {t('wind_label_short')} <span className="ml-1 text-[8px] opacity-60">m/s</span>
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-slate-600">
                    {currentPoint.intensity_real}
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-blue-600">
                    {currentPoint.intensity_pred}
                  </div>

                  {/* 第 4 行：气压 */}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center">
                    {t('pressure_label_short')} <span className="ml-1 text-[8px] opacity-60">hPa</span>
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-slate-600">
                    {currentPoint.pressure.toFixed(0)}
                  </div>
                  <div className="text-right font-mono text-sm font-bold text-blue-600">
                    {currentPoint.pressure_pred.toFixed(0)}
                  </div>

                  {/* 第 5 行：经度 */}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center">
                    {language === 'en' ? 'Longitude' : '经度'} <span className="ml-1 text-[8px] opacity-60">°E</span>
                  </div>
                  <div className="col-span-2 text-right font-mono text-sm font-bold text-teal-600">
                    {currentPoint.lng.toFixed(2)}
                  </div>

                  {/* 第 6 行：纬度 */}
                  <div className="text-[10px] font-bold text-slate-400 flex items-center">
                    {language === 'en' ? 'Latitude' : '纬度'} <span className="ml-1 text-[8px] opacity-60">°N</span>
                  </div>
                  <div className="col-span-2 text-right font-mono text-sm font-bold text-teal-600">
                    {currentPoint.lat.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部时间轴控制 */}
            <div className="absolute bottom-0 left-0 right-0 z-[1001] pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md p-6 pb-6 border-t border-slate-200 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col gap-4 pointer-events-auto w-full">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            }`}
                        >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                      </button>
                      <button
                        onClick={resetSimulation}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                        title={language === 'en' ? 'Reset' : '重置'}
                      >
                        <RotateCcw size={18} />
                      </button>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full p-1 shrink-0">
                        <button
                          onClick={() => setShowCloudMap(!showCloudMap)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${showCloudMap ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'
                            }`}
                        title={language === 'en' ? 'Toggle Cloud Map' : '切换红外云图'}
                      >
                          <Cloud size={16} />
                        </button>
                        {CLOUD_IMAGE_MODES.map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setCloudMode(mode);
                              setShowCloudMap(true);
                            }}
                            className={`h-8 min-w-[52px] px-2 rounded-full text-[11px] font-bold transition-colors ${showCloudMap && cloudMode === mode
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-white hover:text-blue-600'
                              }`}
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
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{language === 'en' ? 'UTC' : '协调世界时'}</p>
                      <p className="text-sm font-bold text-blue-600">{currentUtcLabel}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 shrink-0" />
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setCurrentIndex(Math.min(timelineData.length - 1, currentIndex + 1))}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400"
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
                    max={Math.max(0, timelineData.length - 1)}
                    value={currentIndex}
                    onPointerDown={startScrubbing}
                    onPointerUp={stopScrubbing}
                    onPointerCancel={stopScrubbing}
                    onTouchStart={startScrubbing}
                    onTouchEnd={stopScrubbing}
                    onChange={handleTimelineChange}
                    className="relative z-10 w-full h-1.5 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-lg pointer-events-none z-0"
                    style={{ width: `${timelineData.length > 1 ? (currentIndex / (timelineData.length - 1)) * 100 : 0}%` }}
                  />
                </div>

                <div className="relative h-4 px-1">
                  {visibleTimelineLabelIndices.map((idx) => {
                    const label = timelineLabels[idx];
                    const lastIndex = timelineLabels.length - 1;
                    const left = lastIndex > 0 ? (idx / lastIndex) * 100 : 0;

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
          </>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">

      {/* --- 左侧边栏容器 --- */}
      <motion.aside
        initial={{ width: 240 }} // w-60 = 240px
        animate={{ width: isLeftPanelOpen ? 240 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex-shrink-0 overflow-hidden relative z-20"
      >
        <Sidebar
          language={language}
          onLanguageToggle={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
          currentView={currentView}
          onNavigate={setCurrentView}
          onCollapse={() => setIsLeftPanelOpen(false)}
        />
      </motion.aside>

      {/* --- 主内容区域 --- */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-100">

        {/* 渲染视图内容 */}
        {renderMainContent()}

        {/* 悬浮展开按钮 - 左侧 */}
        {!isLeftPanelOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsLeftPanelOpen(true)}
            className="absolute top-6 left-6 z-[1002] bg-white p-2 rounded-lg shadow-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={20} />
          </motion.button>
        )}
      </main>

      {/* --- 右侧仪表盘面板 - 仅在地图视图中可见 --- */}
      <AnimatePresence>
        {currentView === 'map' && (
          <motion.aside
            initial={{ width: 420, opacity: 1 }}
            animate={{ width: isRightPanelOpen ? 420 : 0, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-full border-l border-slate-200 bg-white z-10 relative flex-shrink-0 overflow-hidden shadow-xl"
          >
            {/* 内部容器固定宽度，防止动画期间内容挤压 */}
            <div className="w-[420px] h-full flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Settings2 size={18} className="text-blue-500" />
                  <span>{t('analysis_dashboard')}</span>
                </div>
                <button
                  onClick={() => setIsRightPanelOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <PanelRightClose size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 gap-4 flex flex-col">
                {/* Metrics Chart Panel */}
                <CollapsiblePanel
                  title={t('metrics')}
                  isOpen={panels.metrics}
                  onToggle={() => togglePanel('metrics')}
                >
                  <MetricsChart
                    data={timelineData}
                    currentIndex={currentIndex}
                    language={language}
                  />
                </CollapsiblePanel>

                {/* 物理先验解释面板 */}
                <CollapsiblePanel
                  title={t('physics_prior')}
                  isOpen={panels.physics}
                  onToggle={() => togglePanel('physics')}
                  extraHeader={<Zap size={14} className="text-blue-500 fill-blue-500" />}
                >
                  <div className="space-y-4">
                    <div className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-xl border border-slate-100 font-serif relative">
                      <p className="text-[9px] text-slate-400 font-mono mb-2 uppercase tracking-tighter">{t('holland_model')}</p>
                      <div className="text-[15px] italic text-slate-800 leading-tight tracking-tight py-1">
                        r<sup>B</sup> ln[(p<sub>n</sub> - p<sub>c</sub>) / (p<sub>r</sub> - p<sub>c</sub>)] = A
                      </div>

                      {/* 公式图例 */}
                      <div className="mt-3 pt-2 border-t border-slate-200/50 grid grid-cols-2 gap-y-1.5 gap-x-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic font-bold text-slate-600 text-[10px]">r</span>
                          <span className="text-[9px] text-slate-500 leading-none">{t('physics_param_r')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic font-bold text-slate-600 text-[10px]">B</span>
                          <span className="text-[9px] text-slate-500 leading-none">{t('physics_param_B')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic font-bold text-slate-600 text-[10px]">p<sub>n</sub></span>
                          <span className="text-[9px] text-slate-500 leading-none">{t('physics_param_pn')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic font-bold text-slate-600 text-[10px]">p<sub>c</sub></span>
                          <span className="text-[9px] text-slate-500 leading-none">{t('physics_param_pc')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic font-bold text-slate-600 text-[10px]">p<sub>r</sub></span>
                          <span className="text-[9px] text-slate-500 leading-none">{t('physics_param_pr')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif italic font-bold text-slate-600 text-[10px]">A</span>
                          <span className="text-[9px] text-slate-500 leading-none">{t('physics_param_A')}</span>
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-100" />
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        {t('physics_desc')}
                      </p>
                    </div>
                  </div>
                </CollapsiblePanel>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

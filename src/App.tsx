import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TyphoonMap } from './components/TyphoonMap';
import { LabOverview, LabPublications, LabResearch, LabTeam } from './components/LabPages';
import { TyphoonAnalysisPanel, TyphoonAnalysisPanelKey, TyphoonAnalysisPanelState } from './components/typhoon/TyphoonAnalysisPanel';
import { TyphoonOverlayControls } from './components/typhoon/TyphoonOverlayControls';
import { TyphoonTimelineControls } from './components/typhoon/TyphoonTimelineControls';
import {
  CASE_SELECTOR_OPTIONS,
  DUAL_TYPHOON_STORM_CODES,
  getCaseGroupBySelection,
  getStormCodeKey,
} from './features/typhoon/caseCatalog';
import {
  buildCloudFrameUrlsForTimeline,
  selectCloudFramesForMode,
} from './features/typhoon/cloudFrameMatcher';
import { toTimelineShortLabel } from './features/typhoon/time';
import { TRANSLATIONS } from './constants';
import { Language, ViewType } from './types';
import { MOCK_CASES } from './utils/dataGenerator';
import {
  CLOUD_FRAMES_BY_STORM,
  CloudImageMode,
  resolveSharedStormCloudKey,
  resolveStormCloudKey,
} from './utils/cloudFrames';

const PLAYBACK_INTERVAL_MS = 1200;
const SIDEBAR_WIDTH = 240;
const RIGHT_PANEL_WIDTH = 420;

const App: React.FC = () => {
  // 应用级状态集中在入口层维护，地图、时间轴和右侧分析面板都从这里同步当前场次。
  const [language, setLanguage] = useState<Language>('zh');
  const [selectedCaseId, setSelectedCaseId] = useState(CASE_SELECTOR_OPTIONS[0]?.id || MOCK_CASES[0].id);
  const [activeAnalysisStormCode, setActiveAnalysisStormCode] = useState(DUAL_TYPHOON_STORM_CODES[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const readyFrameIndicesRef = useRef<Set<number>>(new Set());
  const [loadedFrameCount, setLoadedFrameCount] = useState(0);

  const [currentView, setCurrentView] = useState<ViewType>('map');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [showCloudMap, setShowCloudMap] = useState(true);
  const [cloudMode, setCloudMode] = useState<CloudImageMode>('pseudoColor');

  const [panels, setPanels] = useState<TyphoonAnalysisPanelState>({
    brief: true,
    metrics: true,
    physics: true,
  });

  const t = useCallback((key: string) => TRANSLATIONS[key][language], [language]);

  const togglePanel = (key: TyphoonAnalysisPanelKey) => {
    setPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCaseGroup = useMemo(
    () => getCaseGroupBySelection(selectedCaseId),
    [selectedCaseId]
  );

  // 场次选择可能返回单台风，也可能返回双台风展示组；右侧面板需要明确当前分析对象。
  const selectedCase = useMemo(
    () => selectedCaseGroup.find(typhoonCase => getStormCodeKey(typhoonCase) === activeAnalysisStormCode)
      || selectedCaseGroup[0]
      || MOCK_CASES[0],
    [activeAnalysisStormCode, selectedCaseGroup]
  );

  // 切换场次后如果原分析对象不在新分组中，自动回到该分组的第一个台风。
  useEffect(() => {
    if (selectedCaseGroup.some(typhoonCase => getStormCodeKey(typhoonCase) === activeAnalysisStormCode)) {
      return;
    }

    const firstStormCode = selectedCaseGroup[0] ? getStormCodeKey(selectedCaseGroup[0]) : '';
    if (firstStormCode) {
      setActiveAnalysisStormCode(firstStormCode);
    }
  }, [activeAnalysisStormCode, selectedCaseGroup]);

  const selectedStormCode = getStormCodeKey(selectedCase);

  // 双台风场景中，地图会把另一条路径作为联动对象同步展示。
  const linkedTyphoonCase = useMemo(
    () => selectedCaseGroup.find(typhoonCase => getStormCodeKey(typhoonCase) !== selectedStormCode) || null,
    [selectedCaseGroup, selectedStormCode]
  );

  const activeStormCloudKey = useMemo(
    () => resolveStormCloudKey(selectedCase.stormCode, selectedCase.nameEn),
    [selectedCase.stormCode, selectedCase.nameEn]
  );

  const sharedStormCloudKey = useMemo(
    () => resolveSharedStormCloudKey(activeStormCloudKey),
    [activeStormCloudKey]
  );

  const activeCloudFrameGroups = useMemo(
    () => (activeStormCloudKey ? CLOUD_FRAMES_BY_STORM[activeStormCloudKey] : null),
    [activeStormCloudKey]
  );

  const sharedCloudFrameGroups = useMemo(
    () => (sharedStormCloudKey ? CLOUD_FRAMES_BY_STORM[sharedStormCloudKey] : null),
    [sharedStormCloudKey]
  );

  // 云图优先使用共享资源组，缺失时再用当前台风自己的资源补位。
  const preferredCloudFrames = useMemo(
    () => selectCloudFramesForMode(sharedCloudFrameGroups, cloudMode),
    [sharedCloudFrameGroups, cloudMode]
  );

  const fallbackCloudFrames = useMemo(
    () => selectCloudFramesForMode(activeCloudFrameGroups, cloudMode),
    [activeCloudFrameGroups, cloudMode]
  );

  const timelineData = useMemo(() => selectedCase.data, [selectedCase.data]);

  const timelineLabels = useMemo(
    () => timelineData.map(point => toTimelineShortLabel(point.time)),
    [timelineData]
  );

  const cloudFrameUrls = useMemo(
    () => buildCloudFrameUrlsForTimeline(timelineData, preferredCloudFrames, fallbackCloudFrames),
    [timelineData, preferredCloudFrames, fallbackCloudFrames]
  );

  const validCloudFrameCount = useMemo(
    () => cloudFrameUrls.filter(Boolean).length,
    [cloudFrameUrls]
  );

  // 只统计与时间轴索引对应的有效帧，避免重复加载影响缓冲进度。
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

  // 右侧面板切换双台风分析对象时，尽量保持同一 UTC 时刻，便于横向比较。
  const handleAnalysisCaseChange = useCallback((stormCode: string) => {
    const nextCase = selectedCaseGroup.find(typhoonCase => getStormCodeKey(typhoonCase) === stormCode);
    if (!nextCase) {
      return;
    }

    const matchingIndex = currentPoint
      ? nextCase.data.findIndex(point => point.time === currentPoint.time)
      : -1;

    setActiveAnalysisStormCode(stormCode);
    setCurrentIndex(matchingIndex >= 0 ? matchingIndex : 0);
    setIsPlaying(false);
  }, [currentPoint, selectedCaseGroup]);

  // 联动台风按当前 UTC 时刻查找位置，没有相同时刻则不绘制当前点。
  const linkedTyphoonCurrentIndex = useMemo(() => {
    if (!linkedTyphoonCase || !currentPoint) {
      return -1;
    }

    return linkedTyphoonCase.data.findIndex(point => point.time === currentPoint.time);
  }, [currentPoint, linkedTyphoonCase]);

  const nextFrameIndex = Math.min(currentIndex + 1, Math.max(0, timelineData.length - 1));
  const nextFrameHasCloudImage = Boolean(cloudFrameUrls[nextFrameIndex]);
  const shouldBufferCloudFrames = showCloudMap && validCloudFrameCount > 0;
  // 播放时等待下一帧云图准备好，再推进时间轴，避免路径和云图短暂错位。
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

  // 时间点较多时只保留首尾和少量中间刻度，保证底部时间轴在窄屏下仍可读。
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

  const startScrubbing = useCallback(() => {
    setIsScrubbing(true);
  }, []);

  const stopScrubbing = useCallback(() => {
    setIsScrubbing(false);
  }, []);

  // 数据长度变化时夹紧当前索引，防止切换到较短场次后访问越界点。
  useEffect(() => {
    if (!timelineData.length) {
      return;
    }

    if (currentIndex > timelineData.length - 1) {
      setCurrentIndex(Math.max(0, timelineData.length - 1));
    }
  }, [currentIndex, timelineData.length]);

  // 场次或云图模式变化后重新统计可播放帧，缓冲进度从新资源集合开始计算。
  useEffect(() => {
    readyFrameIndicesRef.current = new Set<number>();
    setLoadedFrameCount(0);
  }, [selectedCaseId, cloudFrameUrls, cloudMode]);

  // 用户拖动时间轴后即使指针移出滑块，也能在全局释放时结束拖动状态。
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

  // 自动播放以固定节奏推进；如果下一帧云图未就绪，就保持在当前帧等待缓存完成。
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
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

          return readyFrameIndicesRef.current.has(next) ? next : prev;
        });
      }, PLAYBACK_INTERVAL_MS);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, timelineData.length, currentView, shouldBufferCloudFrames, cloudFrameUrls]);

  const handleTimelineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextIndex = Number.parseInt(event.target.value, 10);
    const clamped = Math.min(Math.max(nextIndex, 0), Math.max(0, timelineData.length - 1));
    setCurrentIndex(clamped);
    setIsPlaying(false);
  };

  const resetSimulation = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  // 切换主场次时同步重置分析对象、时间轴和播放状态，避免跨场次残留。
  const handleCaseSelectionChange = useCallback((id: string) => {
    setSelectedCaseId(id);

    const nextGroup = getCaseGroupBySelection(id);
    const nextStormCode = nextGroup[0] ? getStormCodeKey(nextGroup[0]) : '';
    if (nextStormCode) {
      setActiveAnalysisStormCode(nextStormCode);
    }

    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  // 选择云图色彩模式时默认打开云图层，符合用户对模式按钮的即时反馈预期。
  const handleCloudModeChange = useCallback((mode: CloudImageMode) => {
    setCloudMode(mode);
    setShowCloudMap(true);
  }, []);

  // 地图视图组合 Leaflet 图层、浮层控制和右侧分析面板的当前状态输入。
  const renderMapView = () => {
    if (!currentPoint) {
      return null;
    }

    return (
      <>
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
            linkedTyphoon={linkedTyphoonCase ? {
              name: language === 'en' ? linkedTyphoonCase.nameEn : linkedTyphoonCase.nameZh,
              data: linkedTyphoonCase.data,
              currentIndex: linkedTyphoonCurrentIndex,
            } : null}
          />
        </div>

        {!isRightPanelOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsRightPanelOpen(true)}
            className="absolute top-6 right-6 z-[1002] bg-white p-2 rounded-lg shadow-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
            title="Expand Dashboard"
          >
            <PanelRightOpen size={20} />
          </motion.button>
        )}

        <TyphoonOverlayControls
          language={language}
          currentPoint={currentPoint}
          selectedCaseId={selectedCaseId}
          caseOptions={CASE_SELECTOR_OPTIONS}
          isLeftPanelOpen={isLeftPanelOpen}
          isRightPanelOpen={isRightPanelOpen}
          t={t}
          onCaseChange={handleCaseSelectionChange}
        />

        <TyphoonTimelineControls
          language={language}
          isPlaying={isPlaying}
          showCloudMap={showCloudMap}
          cloudMode={cloudMode}
          isBuffering={isBuffering}
          bufferProgress={bufferProgress}
          currentUtcLabel={currentUtcLabel}
          currentIndex={currentIndex}
          lastIndex={Math.max(0, timelineData.length - 1)}
          timelineLabels={timelineLabels}
          visibleTimelineLabelIndices={visibleTimelineLabelIndices}
          t={t}
          onTogglePlaying={() => setIsPlaying(prev => !prev)}
          onReset={resetSimulation}
          onToggleCloudMap={() => setShowCloudMap(prev => !prev)}
          onCloudModeChange={handleCloudModeChange}
          onPrevious={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          onNext={() => setCurrentIndex(prev => Math.min(timelineData.length - 1, prev + 1))}
          onScrubStart={startScrubbing}
          onScrubEnd={stopScrubbing}
          onTimelineChange={handleTimelineChange}
        />
      </>
    );
  };

  // 主内容区根据侧边栏导航切换，地图页面保留完整交互状态。
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
        return renderMapView();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      <motion.aside
        initial={{ width: SIDEBAR_WIDTH }}
        animate={{ width: isLeftPanelOpen ? SIDEBAR_WIDTH : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="flex-shrink-0 overflow-hidden relative z-20"
      >
        <Sidebar
          language={language}
          onLanguageToggle={() => setLanguage(currentLanguage => currentLanguage === 'en' ? 'zh' : 'en')}
          currentView={currentView}
          onNavigate={setCurrentView}
          onCollapse={() => setIsLeftPanelOpen(false)}
        />
      </motion.aside>

      <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-100">
        {renderMainContent()}

        {!isLeftPanelOpen && (
          <motion.button
            type="button"
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

      <AnimatePresence>
        {currentView === 'map' && (
          <motion.aside
            initial={{ width: RIGHT_PANEL_WIDTH, opacity: 1 }}
            animate={{ width: isRightPanelOpen ? RIGHT_PANEL_WIDTH : 0, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="h-full border-l border-slate-200 bg-white z-10 relative flex-shrink-0 overflow-hidden shadow-xl"
          >
            {isRightPanelOpen && (
              <TyphoonAnalysisPanel
                width={RIGHT_PANEL_WIDTH}
                language={language}
                selectedCase={selectedCase}
                selectedCaseGroup={selectedCaseGroup}
                selectedStormCode={selectedStormCode}
                panels={panels}
                timelineData={timelineData}
                currentIndex={currentIndex}
                t={t}
                onTogglePanel={togglePanel}
                onAnalysisCaseChange={handleAnalysisCaseChange}
                onClose={() => setIsRightPanelOpen(false)}
              />
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

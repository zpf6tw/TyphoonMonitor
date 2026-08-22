import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftOpen, PanelRightOpen, Activity, Wind, PanelRightClose } from 'lucide-react';
import { Sidebar } from './components/layout';
import type {
  IDOLAnalysisPanelKey,
  IDOLAnalysisPanelState,
} from './components/typhoon-intensity';
import { CLOUDSEER_CASES, CLOUDSEER_BANDS } from './utils/dataGenerator';
import { CollapsiblePanel } from './components/common';
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
import { LabSectionId, Language, ViewType } from './types';
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

const LabHome = React.lazy(() => import('./components/lab').then(module => ({ default: module.LabHome })));
const LabPublicationsPage = React.lazy(() => import('./components/lab').then(module => ({ default: module.LabPublicationsPage })));
const LabTeamPage = React.lazy(() => import('./components/lab').then(module => ({ default: module.LabTeamPage })));
const IDOLAnalysisPanel = React.lazy(() => import('./components/typhoon-intensity').then(module => ({ default: module.IDOLAnalysisPanel })));
const IDOLMap = React.lazy(() => import('./components/typhoon-intensity').then(module => ({ default: module.IDOLMap })));
const IDOLOverlayControls = React.lazy(() => import('./components/typhoon-intensity').then(module => ({ default: module.IDOLOverlayControls })));
const IDOLTimelineControls = React.lazy(() => import('./components/typhoon-intensity').then(module => ({ default: module.IDOLTimelineControls })));
const CloudSeerMetrics = React.lazy(() => import('./components/cloud-evolution').then(module => ({ default: module.CloudSeerMetrics })));
const CloudSeerView = React.lazy(() => import('./components/cloud-evolution').then(module => ({ default: module.CloudSeerView })));
const MotionVectorField = React.lazy(() => import('./components/cloud-evolution').then(module => ({ default: module.MotionVectorField })));

const LoadingSurface: React.FC<{ panel?: boolean }> = ({ panel = false }) => (
  <div className={`flex ${panel ? 'h-full w-[420px]' : 'h-full w-full'} items-center justify-center bg-brand-cool`}>
    <div className="h-8 w-8 rounded-full border-2 border-brand-accent/30 border-t-brand-primary motion-safe:animate-spin" />
  </div>
);

const App: React.FC = () => {
  // ===== 台风模块状态 =====
  const language: Language = 'zh';
  const [selectedCaseId, setSelectedCaseId] = useState(CASE_SELECTOR_OPTIONS[0]?.id || MOCK_CASES[0].id);
  const [activeAnalysisStormCode, setActiveAnalysisStormCode] = useState(DUAL_TYPHOON_STORM_CODES[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const readyFrameIndicesRef = useRef<Set<number>>(new Set());
  const [loadedFrameCount, setLoadedFrameCount] = useState(0);

  const [currentView, setCurrentView] = useState<ViewType>('lab_home');
  const [activeLabSection, setActiveLabSection] = useState<LabSectionId>('overview');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [showCloudMap, setShowCloudMap] = useState(true);
  const [cloudMode, setCloudMode] = useState<CloudImageMode>('pseudoColor');

  const [panels, setPanels] = useState<IDOLAnalysisPanelState>({
    brief: true,
    metrics: true,
  });

  // ===== CloudSeer 模块状态 =====
  const [cloudseerSelectedCaseId, setCloudseerSelectedCaseId] = useState(CLOUDSEER_CASES[0].id);
  const [cloudseerSelectedBandId, setCloudseerSelectedBandId] = useState(CLOUDSEER_BANDS[0].id);
  const [cloudseerSelectedModelId, setCloudseerSelectedModelId] = useState('cloudseer-b');
  const [cloudseerCurrentIndex, setCloudseerCurrentIndex] = useState(5);
  const [cloudseerIsPlaying, setCloudseerIsPlaying] = useState(false);
  const [isCloudseerRightPanelOpen, setIsCloudseerRightPanelOpen] = useState(true);
  const [cloudseerPanels, setCloudseerPanels] = useState({
    metrics: true,
    motion: true,
  });

  const t = useCallback((key: string) => TRANSLATIONS[key]?.zh || key, []);

  const togglePanel = (key: IDOLAnalysisPanelKey) => {
    setPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCloudseerPanel = (key: keyof typeof cloudseerPanels) => {
    setCloudseerPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ===== 台风逻辑（保持不变） =====
  const selectedCaseGroup = useMemo(
    () => getCaseGroupBySelection(selectedCaseId),
    [selectedCaseId]
  );

  const selectedCase = useMemo(
    () => selectedCaseGroup.find(typhoonCase => getStormCodeKey(typhoonCase) === activeAnalysisStormCode)
      || selectedCaseGroup[0]
      || MOCK_CASES[0],
    [activeAnalysisStormCode, selectedCaseGroup]
  );

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

  const handleAnalysisCaseChange = useCallback((stormCode: string) => {
    const nextCase = selectedCaseGroup.find(typhoonCase => getStormCodeKey(typhoonCase) === stormCode);
    if (!nextCase) return;
    const matchingIndex = currentPoint
      ? nextCase.data.findIndex(point => point.time === currentPoint.time)
      : -1;
    setActiveAnalysisStormCode(stormCode);
    setCurrentIndex(matchingIndex >= 0 ? matchingIndex : 0);
    setIsPlaying(false);
  }, [currentPoint, selectedCaseGroup]);

  const linkedTyphoonCurrentIndex = useMemo(() => {
    if (!linkedTyphoonCase || !currentPoint) return -1;
    return linkedTyphoonCase.data.findIndex(point => point.time === currentPoint.time);
  }, [currentPoint, linkedTyphoonCase]);

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
    if (timelineLabels.length <= 10) return 1;
    return Math.ceil(timelineLabels.length / 9);
  }, [timelineLabels.length]);

  const visibleTimelineLabelIndices = useMemo(() => {
    if (!timelineLabels.length) return [] as number[];
    const lastIndex = timelineLabels.length - 1;
    const indices = new Set<number>([0, lastIndex]);
    for (let i = 0; i < timelineLabels.length; i += timelineLabelStep) {
      indices.add(i);
    }
    const sortedIndices = Array.from(indices).sort((a, b) => a - b);
    if (timelineLabels.length <= 12 || sortedIndices.length <= 2) return sortedIndices;
    const minIndexGap = Math.max(2, Math.floor(lastIndex * 0.1));
    return sortedIndices.filter((idx, order, arr) => {
      if (order === 0 || order === arr.length - 1) return true;
      const prev = arr[order - 1];
      const next = arr[order + 1];
      return idx - prev >= minIndexGap && next - idx >= minIndexGap;
    });
  }, [timelineLabels, timelineLabelStep]);

  const startScrubbing = useCallback(() => setIsScrubbing(true), []);
  const stopScrubbing = useCallback(() => setIsScrubbing(false), []);

  useEffect(() => {
    if (!timelineData.length) return;
    if (currentIndex > timelineData.length - 1) {
      setCurrentIndex(Math.max(0, timelineData.length - 1));
    }
  }, [currentIndex, timelineData.length]);

  useEffect(() => {
    readyFrameIndicesRef.current = new Set<number>();
    setLoadedFrameCount(0);
  }, [selectedCaseId, cloudFrameUrls, cloudMode]);

  useEffect(() => {
    if (!isScrubbing) return;
    const handlePointerRelease = () => setIsScrubbing(false);
    window.addEventListener('pointerup', handlePointerRelease);
    window.addEventListener('pointercancel', handlePointerRelease);
    return () => {
      window.removeEventListener('pointerup', handlePointerRelease);
      window.removeEventListener('pointercancel', handlePointerRelease);
    };
  }, [isScrubbing]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isPlaying && currentView === 'idol') {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= timelineData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          if (!shouldBufferCloudFrames) return prev + 1;
          const next = prev + 1;
          if (!cloudFrameUrls[next]) return next;
          return readyFrameIndicesRef.current.has(next) ? next : prev;
        });
      }, PLAYBACK_INTERVAL_MS);
    }
    return () => { if (interval) clearInterval(interval); };
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

  const handleCaseSelectionChange = useCallback((id: string) => {
    setSelectedCaseId(id);
    const nextGroup = getCaseGroupBySelection(id);
    const nextStormCode = nextGroup[0] ? getStormCodeKey(nextGroup[0]) : '';
    if (nextStormCode) setActiveAnalysisStormCode(nextStormCode);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const handleCloudModeChange = useCallback((mode: CloudImageMode) => {
    setCloudMode(mode);
    setShowCloudMap(true);
  }, []);

  // ===== IDOL 视图渲染 =====
  const renderIdolView = () => {
    if (!currentPoint) return null;
    return (
      <>
        <div className="absolute inset-0 z-0">
          <IDOLMap
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
              name: linkedTyphoonCase.nameZh,
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
            className="absolute top-6 right-6 z-[1002] bg-brand-warm p-2 rounded-lg shadow-lg border border-brand-accent/30 text-slate-500 hover:text-brand-primary hover:bg-brand-cool transition-colors"
            title="Expand Dashboard"
          >
            <PanelRightOpen size={20} />
          </motion.button>
        )}

        <IDOLOverlayControls
          language={language}
          currentPoint={currentPoint}
          selectedCaseId={selectedCaseId}
          caseOptions={CASE_SELECTOR_OPTIONS}
          isLeftPanelOpen={isLeftPanelOpen}
          isRightPanelOpen={isRightPanelOpen}
          t={t}
          onCaseChange={handleCaseSelectionChange}
        />

        <IDOLTimelineControls
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

  // ===== 主内容渲染 =====
  const renderMainContent = () => {
    switch (currentView) {
      case 'lab_home':
        return <LabHome onNavigate={setCurrentView} onActiveSectionChange={setActiveLabSection} />;
      case 'lab_team':
        return <LabTeamPage onNavigate={setCurrentView} />;
      case 'lab_publications':
        return <LabPublicationsPage onNavigate={setCurrentView} />;
      case 'cloudseer':
        return (
          <CloudSeerView
            language={language}
            onNavigate={setCurrentView}
            isLeftPanelOpen={isLeftPanelOpen}
            onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            selectedCaseId={cloudseerSelectedCaseId}
            setSelectedCaseId={setCloudseerSelectedCaseId}
            selectedBandId={cloudseerSelectedBandId}
            setSelectedBandId={setCloudseerSelectedBandId}
            selectedModelId={cloudseerSelectedModelId}
            setSelectedModelId={setCloudseerSelectedModelId}
            currentIndex={cloudseerCurrentIndex}
            setCurrentIndex={setCloudseerCurrentIndex}
            isPlaying={cloudseerIsPlaying}
            setIsPlaying={setCloudseerIsPlaying}
            isRightPanelOpen={isCloudseerRightPanelOpen}
            onToggleRightPanel={() => setIsCloudseerRightPanelOpen(!isCloudseerRightPanelOpen)}
          />
        );
      case 'idol':
        return renderIdolView();
      default:
        return <LabHome onNavigate={setCurrentView} onActiveSectionChange={setActiveLabSection} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-cool font-sans">
      {/* 左侧边栏 */}
      <motion.aside
        initial={false}
        animate={{ width: isLeftPanelOpen ? SIDEBAR_WIDTH : 0 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 left-0 z-30 flex-shrink-0 overflow-hidden lg:relative lg:inset-auto"
      >
        <Sidebar
          currentView={currentView}
          activeLabSection={activeLabSection}
          onNavigate={setCurrentView}
          onCollapse={() => setIsLeftPanelOpen(false)}
        />
      </motion.aside>

      {/* 主内容 */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-brand-cool">
        <React.Suspense fallback={<LoadingSurface />}>
          {renderMainContent()}
        </React.Suspense>

        {!isLeftPanelOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsLeftPanelOpen(true)}
            className="absolute top-6 left-6 z-[1002] rounded-lg border border-brand-accent/30 bg-brand-warm p-2 text-slate-500 shadow-lg transition-colors hover:bg-brand-cool hover:text-brand-primary"
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={20} />
          </motion.button>
        )}
      </main>

      {/* 台风右侧面板 */}
      <AnimatePresence>
        {currentView === 'idol' && (
          <motion.aside
            initial={{ width: RIGHT_PANEL_WIDTH, opacity: 1 }}
            animate={{ width: isRightPanelOpen ? RIGHT_PANEL_WIDTH : 0, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="h-full border-l border-brand-accent/30 bg-brand-warm z-10 relative flex-shrink-0 overflow-hidden shadow-xl"
          >
            <React.Suspense fallback={<LoadingSurface panel />}>
              {isRightPanelOpen && (
                <IDOLAnalysisPanel
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
            </React.Suspense>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* CloudSeer 右侧面板 */}
      <AnimatePresence>
        {currentView === 'cloudseer' && (
          <motion.aside
            initial={{ width: RIGHT_PANEL_WIDTH, opacity: 1 }}
            animate={{ width: isCloudseerRightPanelOpen ? RIGHT_PANEL_WIDTH : 0, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="h-full border-l border-brand-accent/30 bg-brand-warm z-10 relative flex-shrink-0 overflow-hidden shadow-xl"
          >
            <React.Suspense fallback={<LoadingSurface panel />}>
              <div className="w-[420px] h-full flex flex-col">
                <div className="p-4 border-b border-brand-accent/20 flex items-center justify-between bg-brand-cool/50">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Activity size={18} className="text-brand-accent" />
                    <span>{t('analysis_dashboard')}</span>
                  </div>
                  <button
                    onClick={() => setIsCloudseerRightPanelOpen(false)}
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                  >
                    <PanelRightClose size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 gap-4 flex flex-col">
                  <CollapsiblePanel
                    title={t('cloudseer_metrics')}
                    isOpen={cloudseerPanels.metrics}
                    onToggle={() => toggleCloudseerPanel('metrics')}
                  >
                    <CloudSeerMetrics
                      data={CLOUDSEER_CASES.find(c => c.id === cloudseerSelectedCaseId)?.data || CLOUDSEER_CASES[0].data}
                      currentIndex={cloudseerCurrentIndex}
                      language={language}
                      selectedBandId={cloudseerSelectedBandId}
                    />
                  </CollapsiblePanel>

                  <CollapsiblePanel
                    title={t('motion_vector_field')}
                    isOpen={cloudseerPanels.motion}
                    onToggle={() => toggleCloudseerPanel('motion')}
                    extraHeader={<Wind size={14} className="text-brand-accent" />}
                  >
                    <MotionVectorField
                      data={
                        (CLOUDSEER_CASES.find(c => c.id === cloudseerSelectedCaseId)?.data || CLOUDSEER_CASES[0].data)
                        [cloudseerCurrentIndex]?.displacementField || []
                      }
                      language={language}
                      currentIndex={cloudseerCurrentIndex}
                    />
                  </CollapsiblePanel>
                </div>
              </div>
            </React.Suspense>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

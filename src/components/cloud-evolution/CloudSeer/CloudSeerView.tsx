import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Activity,
  PanelRightOpen,
  PanelLeftOpen,
  Target,
  ChevronDown,
  Droplet // 新增透明度图标
} from 'lucide-react';
import { Language, ViewType, CloudSeerCase, CloudSeerBand, CloudSeerModel } from '../../../types';
import { TRANSLATIONS } from '../../../constants';
import { CLOUDSEER_CASES, CLOUDSEER_BANDS, CLOUDSEER_MODELS } from '../../../utils/dataGenerator';
import { CloudSeerMap } from './CloudSeerMap';

// 可折叠面板组件（保持不变）
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

// 案例选择下拉组件（保持不变）
const CaseSelectorDropdown: React.FC<{
  options: CloudSeerCase[];
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-100/50 text-sm font-semibold text-slate-700 outline-none border-none py-1.5 px-3 rounded-lg hover:bg-slate-200/50 cursor-pointer transition-colors"
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
            className="absolute top-full mt-2 left-0 w-48 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 ${
                  value === option.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
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

// 波段下拉选择器（保持不变）
const BandDropdown: React.FC<{
  bands: CloudSeerBand[];
  value: string;
  onChange: (id: string) => void;
  language: Language;
}> = ({ bands, value, onChange, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const selectedBand = bands.find(b => b.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-100/50 text-sm font-semibold text-slate-700 outline-none border-none py-1.5 px-3 rounded-lg hover:bg-slate-200/50 cursor-pointer transition-colors"
      >
        {selectedBand ? `${selectedBand.wavelength} ${selectedBand.unit}` : ''}
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-36 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {bands.map((band) => (
              <button
                key={band.id}
                onClick={() => {
                  onChange(band.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 ${
                  value === band.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                }`}
              >
                {band.wavelength} {band.unit}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OpacitySlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  language: Language;
}> = ({ value, onChange, language }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div 
      className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-white"
      style={{ pointerEvents: 'auto' }} // 强制允许事件
    >
      <Droplet size={14} className="text-sky-500" />
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {language === 'en' ? 'Opacity' : '透明度'}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={handleSliderChange}
          className="w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
        />
        <span className="text-xs font-mono font-bold text-slate-600 w-8 text-right">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

interface CloudSeerViewProps {
  language: Language;
  onNavigate: (view: ViewType) => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  // 从App.tsx传递的状态
  selectedCaseId: string;
  setSelectedCaseId: (id: string) => void;
  selectedBandId: string;
  setSelectedBandId: (id: string) => void;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
}

export const CloudSeerView: React.FC<CloudSeerViewProps> = ({ 
  language, 
  onNavigate,
  isLeftPanelOpen,
  onToggleLeftPanel,
  selectedCaseId,
  setSelectedCaseId,
  selectedBandId,
  setSelectedBandId,
  selectedModelId,
  setSelectedModelId,
  currentIndex,
  setCurrentIndex,
  isPlaying,
  setIsPlaying,
  isRightPanelOpen,
  onToggleRightPanel
}) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  
  // 加载状态
  const [isAllImagesLoaded, setIsAllImagesLoaded] = useState(false);
  
  // 底图显示控制
  const [showBaseMap, setShowBaseMap] = useState(false);
  
  // ===================== 新增：透明度状态 =====================
  const [cloudOpacity, setCloudOpacity] = useState(0.6);
  // ============================================================
  
  const selectedCase = CLOUDSEER_CASES.find(c => c.id === selectedCaseId) || CLOUDSEER_CASES[0];
  const selectedBand = CLOUDSEER_BANDS.find(b => b.id === selectedBandId) || CLOUDSEER_BANDS[0];
  const currentPoint = selectedCase.data[currentIndex];

  // 播放控制
  useEffect(() => {
  let interval: any;
  if (isPlaying) {
    interval = setInterval(() => {
      const next = currentIndex + 1;
      if (next >= selectedCase.data.length) {
        setIsPlaying(false);
      } else {
        setCurrentIndex(next);
      }
    }, 1000);
  }
  return () => clearInterval(interval);
}, [isPlaying, currentIndex, selectedCase.data.length, setCurrentIndex, setIsPlaying]);
  /**
   *   useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= selectedCase.data.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedCase.data.length, setCurrentIndex, setIsPlaying]);

   * 
   */

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(parseInt(e.target.value));
    setIsPlaying(false);
  };

  const resetSimulation = () => {
    setCurrentIndex(5); // 重置到 T+0
    setIsPlaying(false);
  };

  return (
    <div className="w-full h-full relative">
      {/* 核心云图渲染 */}
      <div className="absolute inset-0 z-0">
        <CloudSeerMap 
          data={selectedCase.data}
          currentIndex={currentIndex}
          selectedBand={selectedBand}
          selectedModelId={selectedModelId}
          language={language}
          isRightPanelOpen={isRightPanelOpen}
          onAllImagesLoaded={() => setIsAllImagesLoaded(true)}
          showBaseMap={showBaseMap}
          opacity={cloudOpacity}  // 传入透明度
        />
      </div>

      {/* 悬浮展开按钮 - 左侧 */}
      {!isLeftPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onToggleLeftPanel}
          className="absolute top-6 left-6 z-[1002] bg-white p-2 rounded-lg shadow-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
          title="Expand Sidebar"
        >
          <PanelLeftOpen size={20} />
        </motion.button>
      )}

      {/* 悬浮展开按钮 - 右侧 */}
      {!isRightPanelOpen && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onToggleRightPanel}
          className="absolute top-6 right-6 z-[1002] bg-white p-2 rounded-lg shadow-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
          title="Expand Dashboard"
        >
          <PanelRightOpen size={20} />
        </motion.button>
      )}

      {/* 顶部工具栏 */}
      <div 
        className={`absolute top-6 z-[1001] transition-all duration-300 ease-in-out pointer-events-none flex flex-row gap-3 items-center flex-wrap ${
            !isLeftPanelOpen ? 'left-[4.5rem]' : 'left-6'
        }`}
      >
        {/* 波段选择 */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-2xl shadow-xl border border-white flex items-center gap-3 pointer-events-auto shrink-0">
          <div className="flex items-center gap-2">
             <Layers size={14} className="text-indigo-500 shrink-0" />
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
               {t('band_selection')}
             </span>
          </div>
          <BandDropdown
            bands={CLOUDSEER_BANDS}
            value={selectedBandId}
            language={language}
            onChange={setSelectedBandId}
          />
        </div>

        {/* 底图开关 */}
        <button
          onClick={() => setShowBaseMap(!showBaseMap)}
          className={`bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-2xl shadow-xl border border-white flex items-center gap-2 pointer-events-auto shrink-0 transition-colors ${
            showBaseMap ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-slate-700'
          }`}
        >
          <Target size={14} className={showBaseMap ? 'text-blue-500' : 'text-slate-500'} />
          <span className="text-sm font-semibold">
            {showBaseMap ? (language === 'en' ? 'Hide Map' : '隐藏底图') : (language === 'en' ? 'Show Map' : '显示底图')}
          </span>
        </button>

        {/* ===================== 新增：透明度滑块 ===================== */}
        <OpacitySlider 
          value={cloudOpacity} 
          onChange={setCloudOpacity} 
          language={language} 
        />
        {/* ============================================================ */}
      </div>

      {/* 底部时间轴控制 */}
      <div className="absolute bottom-0 left-0 right-0 z-[1001] pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md p-6 pb-6 border-t border-slate-200 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col gap-4 pointer-events-auto w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isPlaying ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  }`}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                </button>
                <button 
                  onClick={resetSimulation}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              <div>
                 <h4 className="text-sm font-bold text-slate-800">{t('cloud_timeline')}</h4>
                 <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                   <span className="inline-block w-2 h-2 rounded-full bg-slate-400" /> {t('past_input')}
                   <span className="mx-2">|</span>
                   <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> {t('future_pred')}
                 </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
               <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{language === 'en' ? 'Nowcasting Time' : '预报时间'}</p>
                  <p className="text-sm font-bold text-blue-600">{currentPoint.time}</p>
               </div>
               <div className="h-8 w-px bg-slate-200" />
               <div className="flex gap-1">
                  <button 
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400"
                  >
                    <ChevronLeft size={16}/>
                  </button>
                  <button 
                    onClick={() => setCurrentIndex(Math.min(selectedCase.data.length - 1, currentIndex + 1))}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400"
                  >
                    <ChevronRight size={16}/>
                  </button>
               </div>
            </div>
          </div>

          <div className="relative h-6 flex items-center">
            <input 
              type="range" 
              min="0" 
              max={selectedCase.data.length - 1} 
              value={currentIndex}
              onChange={handleTimelineChange}
              className="relative z-10 w-full h-1.5 bg-slate-200/50 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-lg pointer-events-none z-0" 
              style={{ width: `${(currentIndex / (selectedCase.data.length - 1)) * 100}%` }} 
            />
            {/* 输入/预报分割线 */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-500 z-20"
              style={{ left: `${(5 / (selectedCase.data.length - 1)) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between px-1">
              {['T-3h', 'T-2h', 'T-1h', 'T+0', 'T+1h', 'T+2h', 'T+3h'].map((label, i) => (
                  <span 
                    key={i} 
                    className={`text-[10px] font-bold ${i < 3 ? 'text-slate-400' : 'text-blue-600'}`}
                  >
                    {label}
                  </span>
              ))}
          </div>
        </div>
      </div>

      {/* 加载提示 */}
      {!isAllImagesLoaded && (
        <div className="absolute top-6 right-6 z-[2000] bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl border border-white flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-700">
            {language === 'en' ? 'Loading...' : '加载中...'}
          </span>
        </div>
      )}
    </div>
  );
};

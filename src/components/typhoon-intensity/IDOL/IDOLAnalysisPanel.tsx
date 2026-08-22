import React, { useEffect, useState } from 'react';
import { PanelRightClose, Settings2 } from 'lucide-react';
import { Language, TyphoonCase, TyphoonPoint } from '../../../types';
import { getStormCodeKey, getTyphoonIntro } from '../../../features/typhoon/caseCatalog';
import { IDOLMetricsChart } from './IDOLMetricsChart';
import { CollapsiblePanel } from '../../common/CollapsiblePanel';

export interface IDOLAnalysisPanelState {
  brief: boolean;
  metrics: boolean;
}

export type IDOLAnalysisPanelKey = keyof IDOLAnalysisPanelState;

interface IDOLAnalysisPanelProps {
  width: number;
  language: Language;
  selectedCase: TyphoonCase;
  selectedCaseGroup: TyphoonCase[];
  selectedStormCode: string;
  panels: IDOLAnalysisPanelState;
  timelineData: TyphoonPoint[];
  currentIndex: number;
  t: (key: string) => string;
  onTogglePanel: (key: IDOLAnalysisPanelKey) => void;
  onAnalysisCaseChange: (stormCode: string) => void;
  onClose: () => void;
}

// 台风简介卡片只负责展示当前分析对象的说明文本。
const TyphoonIntroCard: React.FC<{
  typhoonCase: TyphoonCase;
  language: Language;
}> = ({ typhoonCase, language }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
    <h3 className="text-sm font-extrabold text-slate-800">
      {language === 'en' ? typhoonCase.nameEn : typhoonCase.nameZh}
    </h3>
    <p className="mt-2 text-[12px] leading-6 text-slate-600">
      {getTyphoonIntro(typhoonCase, language)}
    </p>
  </div>
);

// 双台风场景复用同一组切换标签，保证简介和指标图表的分析对象一致。
const TyphoonCaseTabs: React.FC<{
  cases: TyphoonCase[];
  activeStormCode: string;
  language: Language;
  onChange: (stormCode: string) => void;
}> = ({ cases, activeStormCode, language, onChange }) => (
  <div className="mb-3 flex rounded-xl border border-slate-100 bg-slate-50 p-1">
    {cases.map(typhoonCase => {
      const stormCode = getStormCodeKey(typhoonCase);
      const isActive = stormCode === activeStormCode;

      return (
        <button
          type="button"
          key={stormCode}
          onClick={() => onChange(stormCode)}
          className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${isActive ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:bg-brand-warm hover:text-brand-primary'}`}
        >
          {language === 'en' ? typhoonCase.nameEn : typhoonCase.nameZh}
        </button>
      );
    })}
  </div>
);

// 右侧分析面板聚合台风特征和指标图表两类辅助信息。
export const IDOLAnalysisPanel: React.FC<IDOLAnalysisPanelProps> = ({
  width,
  language,
  selectedCase,
  selectedCaseGroup,
  selectedStormCode,
  panels,
  timelineData,
  currentIndex,
  t,
  onTogglePanel,
  onAnalysisCaseChange,
  onClose,
}) => {
  const [isChartReady, setIsChartReady] = useState(false);

  // 等右侧面板宽度动画结束后再挂载 Recharts，避免首次测量得到无效尺寸。
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsChartReady(true);
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ width }}>
      <div className="p-4 border-b border-brand-accent/20 flex items-center justify-between bg-brand-cool/50">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Settings2 size={18} className="text-brand-accent" />
          <span>{t('analysis_dashboard')}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          aria-label={language === 'en' ? 'Collapse dashboard' : '收起分析控制台'}
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 gap-4 flex flex-col">
        <CollapsiblePanel
          title={language === 'en' ? 'Typhoon Features' : '台风特点'}
          isOpen={panels.brief}
          onToggle={() => onTogglePanel('brief')}
        >
          {selectedCaseGroup.length > 1 && (
            <TyphoonCaseTabs
              cases={selectedCaseGroup}
              activeStormCode={selectedStormCode}
              language={language}
              onChange={onAnalysisCaseChange}
            />
          )}
          <TyphoonIntroCard typhoonCase={selectedCase} language={language} />
        </CollapsiblePanel>

        <CollapsiblePanel
          title={t('metrics')}
          isOpen={panels.metrics}
          onToggle={() => onTogglePanel('metrics')}
        >
          {selectedCaseGroup.length > 1 && (
            <TyphoonCaseTabs
              cases={selectedCaseGroup}
              activeStormCode={selectedStormCode}
              language={language}
              onChange={onAnalysisCaseChange}
            />
          )}
          {isChartReady && (
            <IDOLMetricsChart data={timelineData} currentIndex={currentIndex} language={language} />
          )}
        </CollapsiblePanel>
      </div>
    </div>
  );
};

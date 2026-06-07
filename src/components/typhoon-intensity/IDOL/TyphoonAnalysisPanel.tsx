import React, { useEffect, useState } from 'react';
import { PanelRightClose, Settings2, Zap } from 'lucide-react';
import { Language, TyphoonCase, TyphoonPoint } from '../../../types';
import { getStormCodeKey, getTyphoonIntro } from '../../../features/typhoon/caseCatalog';
import { TyphoonMetricsChart } from './TyphoonMetricsChart';
import { CollapsiblePanel } from '../../common/CollapsiblePanel';

export interface TyphoonAnalysisPanelState {
  brief: boolean;
  metrics: boolean;
  physics: boolean;
}

export type TyphoonAnalysisPanelKey = keyof TyphoonAnalysisPanelState;

interface TyphoonAnalysisPanelProps {
  width: number;
  language: Language;
  selectedCase: TyphoonCase;
  selectedCaseGroup: TyphoonCase[];
  selectedStormCode: string;
  panels: TyphoonAnalysisPanelState;
  timelineData: TyphoonPoint[];
  currentIndex: number;
  t: (key: string) => string;
  onTogglePanel: (key: TyphoonAnalysisPanelKey) => void;
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
          className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-blue-600'}`}
        >
          {language === 'en' ? typhoonCase.nameEn : typhoonCase.nameZh}
        </button>
      );
    })}
  </div>
);

// 物理先验面板展示 Holland 模型符号释义，帮助解释 IDOL 估计约束来源。
const PhysicsPriorPanel: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <div className="space-y-4">
    <div className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-xl border border-slate-100 font-serif relative">
      <p className="text-[9px] text-slate-400 font-mono mb-2 uppercase tracking-tighter">
        {t('holland_model')}
      </p>
      <div className="text-[15px] italic text-slate-800 leading-tight tracking-tight py-1">
        r<sup>B</sup> ln[(p<sub>n</sub> - p<sub>c</sub>) / (p<sub>r</sub> - p<sub>c</sub>)] = A
      </div>

      <div className="mt-3 pt-2 border-t border-slate-200/50 grid grid-cols-2 gap-y-1.5 gap-x-2">
        {[
          ['r', 'physics_param_r'],
          ['B', 'physics_param_B'],
          ['p_n', 'physics_param_pn'],
          ['p_c', 'physics_param_pc'],
          ['p_r', 'physics_param_pr'],
          ['A', 'physics_param_A'],
        ].map(([symbol, labelKey]) => (
          <div key={symbol} className="flex items-center gap-1.5">
            <span className="font-serif italic font-bold text-slate-600 text-[10px]">
              {symbol.startsWith('p_') ? (
                <>
                  p<sub>{symbol.slice(2)}</sub>
                </>
              ) : symbol}
            </span>
            <span className="text-[9px] text-slate-500 leading-none">{t(labelKey)}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-100" />
    </div>

    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
      {t('physics_desc')}
    </p>
  </div>
);

// 右侧分析面板聚合台风特征、指标图表和物理先验三类辅助信息。
export const TyphoonAnalysisPanel: React.FC<TyphoonAnalysisPanelProps> = ({
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
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Settings2 size={18} className="text-blue-500" />
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
            <TyphoonMetricsChart data={timelineData} currentIndex={currentIndex} language={language} />
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          title={t('physics_prior')}
          isOpen={panels.physics}
          onToggle={() => onTogglePanel('physics')}
          extraHeader={<Zap size={14} className="text-blue-500 fill-blue-500" />}
        >
          <PhysicsPriorPanel t={t} />
        </CollapsiblePanel>
      </div>
    </div>
  );
};

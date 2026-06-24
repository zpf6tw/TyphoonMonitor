import React from 'react';
import { Target } from 'lucide-react';
import { Language, TyphoonPoint } from '../../../types';
import { CaseSelectorOption } from '../../../features/typhoon/caseCatalog';
import { CaseSelectorDropdown } from './CaseSelectorDropdown';

interface IDOLOverlayControlsProps {
  language: Language;
  currentPoint: TyphoonPoint;
  selectedCaseId: string;
  caseOptions: CaseSelectorOption[];
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  t: (key: string) => string;
  onCaseChange: (id: string) => void;
}

// 数值单元格统一右对齐，便于传统方法和 IDOL 结果逐行比较。
const NumberValue: React.FC<{ value: number; unit?: string; colorClassName?: string }> = ({
  value,
  unit,
  colorClassName = 'text-slate-600',
}) => (
  <div className={`text-right font-mono text-sm font-bold ${colorClassName}`}>
    {value}
    {unit && <span className="text-[8px] opacity-70 ml-0.5 font-normal">{unit}</span>}
  </div>
);

// 地图上方浮层同时承载案例切换和当前时刻的关键参数对比。
export const IDOLOverlayControls: React.FC<IDOLOverlayControlsProps> = ({
  language,
  currentPoint,
  selectedCaseId,
  caseOptions,
  isLeftPanelOpen,
  isRightPanelOpen,
  t,
  onCaseChange,
}) => (
  // 地图浮层根据左右面板开合调整位置，避免遮挡侧栏控制区。
  <div
    className={`absolute top-6 right-6 z-[1001] transition-all duration-300 ease-in-out pointer-events-none flex flex-wrap gap-4 items-start ${!isLeftPanelOpen ? 'left-[4.5rem]' : 'left-6'}`}
  >
    <div className="bg-white/95 backdrop-blur-md w-[280px] p-3 rounded-2xl shadow-xl border border-white flex flex-col items-stretch gap-2 pointer-events-auto shrink-0 h-fit">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-blue-500" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('active_case')}</span>
      </div>
      <CaseSelectorDropdown
        options={caseOptions}
        value={selectedCaseId}
        language={language}
        onChange={onCaseChange}
      />
    </div>

    <div className="flex-1 min-w-[20px]" />

    <div className={`bg-white/95 backdrop-blur-md w-[280px] p-5 rounded-2xl border border-white shadow-xl flex flex-col gap-4 pointer-events-auto shrink-0 h-fit transition-all duration-300 ${!isRightPanelOpen ? 'mt-12' : ''}`}>
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>{t('model_comparison')}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-3">
        <div className="h-4" />
        <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter bg-slate-50 rounded py-0.5">
          {t('traditional_method')}
        </div>
        <div className="text-[10px] font-bold text-blue-500 text-center uppercase tracking-tighter bg-blue-50 rounded py-0.5">
          {t('idol_model')}
        </div>

        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
          {t('r_inner')}
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_0_1px_rgba(59,130,246,0.3)]" />
        </div>
        <NumberValue value={currentPoint.inner_radius_real} unit="km" />
        <NumberValue value={currentPoint.inner_radius_pred} unit="km" colorClassName="text-blue-600" />

        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
          {t('r_outer')}
          <div className="w-2.5 h-2.5 rounded-full border border-blue-500 bg-blue-50" />
        </div>
        <NumberValue value={currentPoint.outer_radius_real} unit="km" />
        <NumberValue value={currentPoint.outer_radius_pred} unit="km" colorClassName="text-blue-600" />

        <div className="text-[10px] font-bold text-slate-400 flex items-center">
          {t('wind_label_short')} <span className="ml-1 text-[8px] opacity-60">m/s</span>
        </div>
        <NumberValue value={currentPoint.intensity_real} />
        <NumberValue value={currentPoint.intensity_pred} colorClassName="text-blue-600" />

        <div className="text-[10px] font-bold text-slate-400 flex items-center">
          {t('pressure_label_short')} <span className="ml-1 text-[8px] opacity-60">hPa</span>
        </div>
        <NumberValue value={Number(currentPoint.pressure.toFixed(0))} />
        <NumberValue value={Number(currentPoint.pressure_pred.toFixed(0))} colorClassName="text-blue-600" />

        <div className="text-[10px] font-bold text-slate-400 flex items-center">
          {language === 'en' ? 'Longitude' : '经度'} <span className="ml-1 text-[8px] opacity-60">°E</span>
        </div>
        <div className="col-span-2 text-right font-mono text-sm font-bold text-teal-600">
          {currentPoint.lng.toFixed(2)}
        </div>

        <div className="text-[10px] font-bold text-slate-400 flex items-center">
          {language === 'en' ? 'Latitude' : '纬度'} <span className="ml-1 text-[8px] opacity-60">°N</span>
        </div>
        <div className="col-span-2 text-right font-mono text-sm font-bold text-teal-600">
          {currentPoint.lat.toFixed(2)}
        </div>
      </div>
    </div>
  </div>
);

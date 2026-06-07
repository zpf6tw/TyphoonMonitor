import React from 'react';
import { Language } from '../../../types';
import { TRANSLATIONS } from '../../../constants';
import { GitMerge, Wind, Palette } from 'lucide-react';

interface ModelPrinciplePanelProps {
  language: Language;
}

export const ModelPrinciplePanel: React.FC<ModelPrinciplePanelProps> = ({ language }) => {
  const t = (key: string) => TRANSLATIONS[key][language];

  return (
    <div className="space-y-4">
      {/* 架构图 */}
      <div className="relative bg-slate-900 rounded-xl p-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-slate-900" />
        
        <div className="relative z-10 space-y-4">
          {/* 输入 */}
          <div className="flex items-center justify-center">
            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                Satellite Observations
              </p>
              <p className="text-[9px] text-slate-400 font-mono mt-1">
                [B, 6, 8, 256, 256]
              </p>
            </div>
          </div>
          
          {/* 双分支 */}
          <div className="grid grid-cols-2 gap-4">
            {/* ADCMP 分支 */}
            <div className="bg-blue-900/30 backdrop-blur p-3 rounded-lg border border-blue-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Wind size={14} className="text-blue-400" />
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  {t('adcmp_branch')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="bg-blue-950/50 px-2 py-1 rounded text-[8px] text-blue-200">
                  Motion Predictor (UNet)
                </div>
                <div className="bg-blue-950/50 px-2 py-1 rounded text-[8px] text-blue-200">
                  Refinement Network
                </div>
                <div className="bg-blue-950/50 px-2 py-1 rounded text-[8px] text-blue-200">
                  Atmospheric Dynamics Loss
                </div>
              </div>
            </div>
            
            {/* FGTP 分支 */}
            <div className="bg-emerald-900/30 backdrop-blur p-3 rounded-lg border border-emerald-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Palette size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  {t('fgtp_branch')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="bg-emerald-950/50 px-2 py-1 rounded text-[8px] text-emerald-200">
                  High-Fidelity Encoder
                </div>
                <div className="bg-emerald-950/50 px-2 py-1 rounded text-[8px] text-emerald-200">
                  Long Memory SSM (Mamba2)
                </div>
                <div className="bg-emerald-950/50 px-2 py-1 rounded text-[8px] text-emerald-200">
                  High-Fidelity Decoder
                </div>
              </div>
            </div>
          </div>
          
          {/* 融合 */}
          <div className="flex items-center justify-center">
            <div className="bg-purple-900/30 backdrop-blur px-4 py-2 rounded-lg border border-purple-800/50 flex items-center gap-2">
              <GitMerge size={14} className="text-purple-400" />
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                {t('gate_fusion')}
              </span>
            </div>
          </div>
          
          {/* 输出 */}
          <div className="flex items-center justify-center">
            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                Future Predictions
              </p>
              <p className="text-[9px] text-slate-400 font-mono mt-1">
                [B, 6, 8, 256, 256]
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 关键贡献 */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            <span className="font-bold text-slate-800">{t('motion_texture_decouple')}:</span>{' '}
            {language === 'en' 
              ? 'Explicitly decouples cloud motion modeling and texture reconstruction' 
              : '显式解耦云运动建模和纹理重建'}
          </p>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            <span className="font-bold text-slate-800">{t('physics_constraints')}:</span>{' '}
            {language === 'en' 
              ? 'Advection, shear-stretch, and vorticity constraints for physical plausibility' 
              : '平流、剪切-拉伸和涡度约束保证物理合理性'}
          </p>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            <span className="font-bold text-slate-800">SOTA Performance:</span>{' '}
            {language === 'en' 
              ? '15.8% MSE reduction, 0.7dB PSNR gain on Himawari-8/9' 
              : '在Himawari-8/9数据集上MSE降低15.8%，PSNR提升0.7dB'}
          </p>
        </div>
      </div>
    </div>
  );
};

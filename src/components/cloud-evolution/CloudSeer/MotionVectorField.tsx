import React, { useEffect, useMemo } from 'react';
import { Language } from '../../../types';
import { TRANSLATIONS } from '../../../constants';



interface MotionVectorFieldProps {
  data: any[];
  language: Language;
  currentIndex: number;
}


// 固定配置
// ===================== COS 图片基础 URL =====================
const COS_BASE = (import.meta.env.VITE_CLOUD_IMAGE_BASE_URL as string || 'https://image-1419775048.cos.ap-shanghai.myqcloud.com/image').replace(/\/+$/, '');
const CLOUDSEER_ROOT = `${COS_BASE}/zyd`;
const VECTOR_FIELD_FOLDER = `${CLOUDSEER_ROOT}/test_epoch_0_data_96/displacement_fields`;
// ============================================================
//const VECTOR_FIELD_FOLDER = '/examples/test_epoch_0_data_96/displacement_fields';
const TOTAL_PRED_FRAMES = 6;

export const MotionVectorField: React.FC<MotionVectorFieldProps> = ({ 
  language, 
  currentIndex 
}) => {
  const t = (key: string) => TRANSLATIONS[key][language];
  const isPastFrame = currentIndex <= 5;
  const futureFrameIndex = currentIndex - 6;

  // ===================== 核心修复1：预先生成所有图片路径并缓存 =====================
  const allVectorUrls = useMemo(() => {
    const urls: string[] = [];
    for (let i = 0; i < TOTAL_PRED_FRAMES; i++) {
      const paddedIdx = String(i).padStart(2, '0');
      urls.push(`${VECTOR_FIELD_FOLDER}/timestep_${paddedIdx}.webp`);
    }
    return urls;
  }, []);

  // ===================== 核心修复2：强制预加载所有图片，确保100%加载完成 =====================
  useEffect(() => {
    // 强制加载所有6张图
    allVectorUrls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        console.log('✅ 矢量场加载完成:', url);
      };
      img.onerror = () => {
        console.error('❌ 矢量场加载失败:', url);
      };
      img.src = url;
    });
  }, [allVectorUrls]);

  // ===================== 核心修复3：直接获取当前图片路径，绝不重新计算 =====================
  const currentImageUrl = isPastFrame ? '' : allVectorUrls[futureFrameIndex] || '';

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full bg-white rounded-xl overflow-hidden relative">
        {isPastFrame ? (
          <div className="w-full aspect-square flex items-center justify-center bg-slate-50 rounded-xl">
            <p className="text-slate-400 text-sm font-medium">
              {language === 'en' ? 'No vector field for past frames' : '过去帧无矢量场数据'}
            </p>
          </div>
        ) : (
          // ===================== 核心修复4：简化img标签，去掉可能导致闪烁的属性 =====================
          <img 
            src={currentImageUrl}
            alt="Motion Vector Field"
            className="w-full h-full object-cover rounded-xl"
            style={{ 
              imageRendering: 'auto',
              // 强制图片不消失，即使加载中也显示占位
              minHeight: '200px',
              backgroundColor: '#f8fafc'
            }}
            // 加载失败时显示背景色，绝不空白
            onError={(e) => {
              console.error('矢量场显示失败:', currentImageUrl);
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
          />
        )}

        {/* 左下角标签 */}
        {!isPastFrame && (
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-2 rounded-lg">
            <p className="text-white text-sm font-bold">ADCMP 分支</p>
            <p className="text-white/80 text-xs">运动-纹理解耦</p>
          </div>
        )}
      </div>
    </div>
  );
};

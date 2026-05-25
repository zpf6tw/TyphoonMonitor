import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ComparisonSliderProps {
  leftImage: string;
  rightImage: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  leftImage,
  rightImage,
  leftLabel = 'Before',
  rightLabel = 'After',
  className = ''
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e 
      ? e.touches[0].clientX 
      : e.clientX;

    const position = ((clientX - rect.left) / rect.width) * 100;
    const clampedPosition = Math.max(0, Math.min(100, position));
    setSliderPosition(clampedPosition);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden rounded-lg select-none ${className}`}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
    >
      {/* 右侧图片（底层） */}
      <div className="absolute inset-0">
        <img 
          src={rightImage} 
          alt={rightLabel}
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded text-white text-xs font-bold">
          {rightLabel}
        </div>
      </div>

      {/* 左侧图片（上层，裁剪） */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={leftImage} 
          alt={leftLabel}
          className="absolute top-0 left-0 w-[100vw] max-w-none h-full object-cover pointer-events-none"
          style={{ 
            objectPosition: 'left top',
            width: `${100 / (sliderPosition / 100)}%`
          }}
        />
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded text-white text-xs font-bold whitespace-nowrap">
          {leftLabel}
        </div>
      </div>

      {/* 滑块控制条 */}
      <motion.div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] z-10"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border-2 border-white flex items-center justify-center">
          <div className="w-4 h-0.5 bg-slate-400 absolute rotate-45" />
          <div className="w-4 h-0.5 bg-slate-400 absolute -rotate-45" />
        </div>
      </motion.div>
    </div>
  );
};
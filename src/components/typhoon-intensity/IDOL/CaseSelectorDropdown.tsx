import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Language } from '../../../types';
import { CaseSelectorOption } from '../../../features/typhoon/caseCatalog';

interface CaseSelectorDropdownProps {
  options: CaseSelectorOption[];
  value: string;
  onChange: (id: string) => void;
  language: Language;
}

// 案例选择器独立管理展开状态，父组件只关心最终选中的案例 id。
export const CaseSelectorDropdown: React.FC<CaseSelectorDropdownProps> = ({
  options,
  value,
  onChange,
  language,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击下拉框外部时自动收起，避免场次菜单在地图浮层上残留。
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.id === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-2 bg-slate-100/50 text-sm font-semibold text-slate-700 outline-none border-none py-1.5 px-3 rounded-lg hover:bg-slate-200/50 cursor-pointer transition-colors"
      >
        {selectedOption ? (language === 'en' ? selectedOption.nameEn : selectedOption.nameZh) : ''}
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-full max-h-72 overflow-y-auto bg-brand-warm/95 backdrop-blur-md border border-brand-accent/30 rounded-xl shadow-xl z-50"
          >
            {options.map(option => (
              <button
                type="button"
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-brand-cool truncate ${value === option.id ? 'text-brand-primary bg-brand-cool/50' : 'text-slate-700'}`}
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

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsiblePanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  extraHeader?: React.ReactNode;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  isOpen,
  onToggle,
  children,
  extraHeader,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0 transition-all duration-300">
    <button
      type="button"
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
      <div className="p-4 pt-4">{children}</div>
    </div>
  </div>
);

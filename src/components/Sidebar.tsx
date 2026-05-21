
import React, { useState } from 'react';
import { 
  Wind, 
  Droplets, 
  Cloud, 
  ChevronDown, 
  ChevronRight, 
  Globe,
  PanelLeftClose,
  Building2,
  Users,
  FileText,
  Microscope,
  LayoutDashboard
} from 'lucide-react';
import { Language, ViewType } from '../types';
import { TRANSLATIONS } from '../constants';

interface SidebarProps {
  language: Language;
  onLanguageToggle: () => void;
  onNavigate: (view: ViewType) => void;
  currentView: ViewType;
  onCollapse: () => void; 
}

// 一级导航项负责展开分组和激活态展示，具体路由仍由父组件控制。
const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}> = ({ icon: Icon, label, isActive, disabled, children, isExpanded, onToggle, onClick }) => {
  return (
    <div className="mb-1">
      <button
        onClick={onClick || onToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
          isActive 
            ? 'bg-blue-50 text-blue-600' 
            : disabled 
              ? 'text-slate-400 cursor-not-allowed opacity-50' 
              : 'hover:bg-slate-100 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {children && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </button>
      {isExpanded && children && (
        <div className="ml-8 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
          {children}
        </div>
      )}
    </div>
  );
};

// 二级导航项保持轻量，只接收标签、图标和点击回调，避免侧边栏承担页面逻辑。
const SubItem: React.FC<{
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  active?: boolean;
}> = ({ label, icon: Icon, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left py-1.5 px-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${
      active ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }`}
  >
    {Icon && <Icon size={14} className={active ? "text-blue-500" : "text-slate-400"} />}
    {label}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ language, onLanguageToggle, onNavigate, currentView, onCollapse }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 
    estimation: true,
    laboratory: true 
  });

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const t = (key: string) => TRANSLATIONS[key][language];

  return (
    // 固定 240px 宽度，与 App.tsx 中的 motion.aside 动画宽度保持一致。
    <div className="h-full w-[240px] min-w-[240px] border-r border-slate-200 bg-white flex flex-col z-20 relative">
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div>
          <h1 className="font-bold text-slate-800 leading-tight text-sm">{t('lab_name')}</h1>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">AI METEOROLOGY</p>
        </div>
        
        {/* 折叠按钮只关闭侧栏，不改变当前页面或台风播放状态。 */}
        <button 
          onClick={onCollapse}
          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors -mt-1 -mr-1 shrink-0"
          title="Collapse Sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        
        {/* 实验室信息分组承载静态内容页面入口。 */}
        <NavItem 
          icon={Building2} 
          label={t('lab_details')} 
          isExpanded={expanded.laboratory}
          onToggle={() => toggleExpand('laboratory')}
        >
          <SubItem 
            icon={LayoutDashboard}
            label={t('lab_overview')} 
            active={currentView === 'lab_overview'}
            onClick={() => onNavigate('lab_overview')} 
          />
          <SubItem 
            icon={Users}
            label={t('lab_team')} 
            active={currentView === 'lab_team'}
            onClick={() => onNavigate('lab_team')} 
          />
          <SubItem 
            icon={Microscope}
            label={t('lab_research')} 
            active={currentView === 'lab_research'}
            onClick={() => onNavigate('lab_research')} 
          />
          <SubItem 
            icon={FileText}
            label={t('lab_publications')} 
            active={currentView === 'lab_publications'}
            onClick={() => onNavigate('lab_publications')} 
          />
        </NavItem>
        
        {/* 台风强度评估分组承载地图可视化入口。 */}
        <NavItem 
          icon={Wind} 
          label={t('typhoon_estimation')} 
          isExpanded={expanded.estimation}
          onToggle={() => toggleExpand('estimation')}
        >
          <SubItem 
             // 自定义圆点图标用于强调当前可视化页面的激活状态。
             icon={() => <div className={`w-1.5 h-1.5 rounded-full ml-1 mr-0.5 ${currentView === 'map' ? 'bg-blue-600' : 'bg-slate-300'}`} />}
             label={t('idol_viz')}
             onClick={() => onNavigate('map')}
             active={currentView === 'map'}
          />
        </NavItem>

        <NavItem icon={Cloud} label={t('cloud_pred')} disabled />
        <NavItem icon={Droplets} label={t('rainfall_forecasting')} disabled />
      </div>

      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={onLanguageToggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-all"
        >
          <Globe size={16} />
          {language === 'en' ? '中文' : 'English'}
        </button>
      </div>
    </div>
  );
};

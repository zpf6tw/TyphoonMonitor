import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Building2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Droplets,
  FileText,
  LayoutDashboard,
  Microscope,
  PanelLeftClose,
  SunMedium,
  Users,
  Wind,
} from 'lucide-react';
import type { LabSectionId, ViewType } from '../../types';

interface SidebarProps {
  onNavigate: (view: ViewType) => void;
  currentView: ViewType;
  activeLabSection: LabSectionId;
  onCollapse: () => void;
}

type SubItem = {
  label: string;
  icon?: React.ElementType;
  active?: boolean;
  onClick: () => void;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  disabled?: boolean;
  subItems?: SubItem[];
};

const scrollToLabSection = (sectionId: string) => {
  window.setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 80);
};

const sidebarHeaderVisual = 'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.34), transparent 30%), radial-gradient(circle at 72% 74%, rgba(103,232,249,0.42), transparent 36%), linear-gradient(135deg, #38bdf8 0%, #0ea5e9 54%, #22d3ee 100%)';
const schoolBadgeUrl = new URL('../../assets/lab/school-badge/school-badge-page-2-white.png', import.meta.url).href;

const NavSubItem: React.FC<SubItem> = ({ label, icon: Icon, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
      active
        ? 'bg-sky-50 text-sky-600'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
  >
    {Icon ? (
      <Icon size={14} className={active ? 'text-sky-600' : 'text-slate-400'} />
    ) : (
      <span className={`ml-1 mr-0.5 h-1.5 w-1.5 rounded-full ${active ? 'bg-sky-500' : 'bg-slate-300'}`} />
    )}
    <span>{label}</span>
  </button>
);

const NavGroupItem: React.FC<{
  group: NavGroup;
  expanded: boolean;
  onToggle: () => void;
}> = ({ group, expanded, onToggle }) => {
  const Icon = group.icon;
  const hasSubItems = Boolean(group.subItems?.length);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={group.disabled}
        aria-expanded={hasSubItems ? expanded : undefined}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${
          group.active
            ? 'bg-sky-50 text-sky-600'
            : group.disabled
              ? 'cursor-not-allowed text-slate-400 opacity-50'
              : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon size={18} />
          <span className="truncate text-sm font-medium">{group.label}</span>
        </span>
        {hasSubItems && (
          expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {hasSubItems && expanded && (
          <motion.div
            key={`${group.id}-subitems`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="ml-8 mt-1 overflow-hidden border-l-2 border-slate-100 pl-2"
          >
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
                closed: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
              }}
              className="space-y-1 py-1"
            >
              {group.subItems?.map(item => (
                <motion.div
                  key={item.label}
                  variants={{
                    open: { opacity: 1, y: 0 },
                    closed: { opacity: 0, y: -4 },
                  }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <NavSubItem {...item} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentView, activeLabSection, onCollapse }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    lab: true,
    typhoon: true,
    rainfall: false,
    energy: true,
    agent: false,
  });

  const goLab = (sectionId: string) => {
    onNavigate('lab_home');
    scrollToLabSection(sectionId);
  };

  const goIrradianceNowcast = () => {
    onNavigate('irradiance_nowcast');
    if (window.innerWidth < 1024) onCollapse();
  };

  const groups: NavGroup[] = [
    {
      id: 'lab',
      label: '实验室详情',
      icon: Building2,
      active: currentView === 'lab_home' || currentView === 'lab_team' || currentView === 'lab_publications',
      subItems: [
        { label: '概况', icon: LayoutDashboard, active: currentView === 'lab_home' && activeLabSection === 'overview', onClick: () => goLab('overview') },
        { label: '科研团队', icon: Users, active: currentView === 'lab_team' || (currentView === 'lab_home' && activeLabSection === 'team'), onClick: () => onNavigate('lab_team') },
        { label: '研究方向', icon: Microscope, active: currentView === 'lab_home' && activeLabSection === 'research', onClick: () => goLab('research') },
        { label: '学术成果', icon: FileText, active: currentView === 'lab_publications' || (currentView === 'lab_home' && activeLabSection === 'publications'), onClick: () => onNavigate('lab_publications') },
      ],
    },
    {
      id: 'typhoon',
      label: '台风智能监测与预报',
      icon: Wind,
      active: currentView === 'idol',
      subItems: [
        { label: 'IDOL', active: currentView === 'idol', onClick: () => onNavigate('idol') },
      ],
    },
    {
      id: 'rainfall',
      label: '降雨智能反演与预测',
      icon: Droplets,
      disabled: true,
    },
    {
      id: 'energy',
      label: '能源气象服务',
      icon: Cloud,
      active: currentView === 'cloudseer' || currentView === 'irradiance_nowcast',
      subItems: [
        { label: 'CLOUDSEER', active: currentView === 'cloudseer', onClick: () => onNavigate('cloudseer') },
        { label: '太阳辐照度预测', icon: SunMedium, active: currentView === 'irradiance_nowcast', onClick: goIrradianceNowcast },
      ],
    },
    {
      id: 'agent',
      label: '气象智能体',
      icon: Bot,
      disabled: true,
    },
  ];

  return (
    <div className="relative z-40 flex h-full w-[240px] min-w-[240px] flex-col border-r border-slate-200 bg-white text-slate-800">
      <div
        className="flex items-start justify-between gap-2 border-b border-sky-200/60 p-4 text-white shadow-sm"
        style={{ background: sidebarHeaderVisual }}
      >
        <button
          type="button"
          onClick={() => goLab('overview')}
          className="flex min-w-0 items-center gap-3 text-left"
          title="返回实验室详情"
        >
          <img
            src={schoolBadgeUrl}
            alt="浙江工业大学校徽"
            className="h-11 w-11 shrink-0 object-contain drop-shadow-sm"
          />
          <span className="min-w-0">
            <span className="block text-base font-bold leading-tight text-white drop-shadow-sm">浙江工业大学</span>
            <span className="mt-1 block text-xs font-semibold leading-4 text-white/82">气象人工智能实验室</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onCollapse}
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-white/82 transition-colors hover:bg-white/18 hover:text-white"
          title="收起导航栏"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {groups.map(group => (
          <NavGroupItem
            key={group.id}
            group={group}
            expanded={Boolean(expanded[group.id])}
            onToggle={() => {
              if (group.disabled) return;
              if (!group.subItems?.length) return;
              setExpanded(prev => ({ ...prev, [group.id]: !prev[group.id] }));
            }}
          />
        ))}
      </nav>
    </div>
  );
};

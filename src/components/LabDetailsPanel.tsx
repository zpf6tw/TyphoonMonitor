
import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  X, 
  ArrowRight, 
  Globe, 
  Microscope, 
  Satellite, 
  ExternalLink,
  Cpu,
  Waves,
  Wind,
  Database,
  Award,
  Users
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface LabDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  activeSection: string; 
}

// --- 动画变体 ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// --- 骨架屏组件 ---
const Skeleton = ({ className }: { className: string }) => (
  <div className={`bg-slate-200/80 animate-pulse rounded-lg ${className}`} />
);

// --- 新的抽象图形组件：MeteoCore ---
const MeteoCore = () => {
  return (
    <div className="relative w-80 h-80 flex items-center justify-center select-none pointer-events-none">
      {/* 背景发光 */}
      <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[80px]" />
      
      {/* 外环 - 雷达扫描 */}
      <motion.div 
        className="absolute inset-0 rounded-full border border-slate-200/50 border-dashed"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      
      {/* 中环 - 卫星轨道 */}
      <motion.div 
        className="absolute inset-8 rounded-full border border-blue-500/20"
        style={{ borderRadius: "42% 58% 70% 30% / 45% 45% 55% 55%" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* 内环 - 数据流 */}
      <motion.div 
        className="absolute inset-16 rounded-full border border-indigo-500/30"
        style={{ borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%" }}
        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      />

      {/* 核心 - AI“大脑” */}
      <div className="relative z-10 flex flex-col items-center justify-center">
         <motion.div 
            className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)] backdrop-blur-md border border-white/20"
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
         >
            <Wind className="text-white" size={36} />
         </motion.div>
         
         {/* 悬浮标签 */}
         <motion.div 
            className="absolute -bottom-12 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
         >
            <span className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">TyphoonMonitor Core</span>
         </motion.div>
      </div>

      {/* 悬浮粒子 */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-40"
          initial={{ x: 0, y: 0 }}
          animate={{ 
            x: Math.cos(i) * 120,
            y: Math.sin(i) * 120,
            scale: [0, 1, 0],
            opacity: [0, 0.5, 0]
          }}
          transition={{ 
            duration: 3 + Math.random() * 2, 
            repeat: Infinity, 
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// --- 模拟数据 ---
const RESEARCH_DIRECTIONS = [
  {
    id: 1,
    title: "Satellite Reconstruction",
    desc: "Recovering high-fidelity meteorological fields from sparse satellite data using Generative Adversarial Networks (GANs).",
    icon: <Satellite className="text-blue-500" size={28} />,
    bg: "bg-blue-50"
  },
  {
    id: 2,
    title: "Physics-Guided AI",
    desc: "Integrating Holland wind field models into deep learning loss functions to ensure physical consistency in predictions.",
    icon: <Globe className="text-indigo-500" size={28} />,
    bg: "bg-indigo-50"
  },
  {
    id: 3,
    title: "Multi-modal Fusion",
    desc: "Combining IR satellite imagery, radar data, and in-situ buoy measurements for precise typhoon intensity estimation.",
    icon: <Waves className="text-teal-500" size={28} />,
    bg: "bg-teal-50"
  }
];

// --- 动态加载论文 ---
const paperModules = import.meta.glob('/src/papers/*.pdf', { query: '?url', import: 'default', eager: true });

const PAPERS = Object.entries(paperModules).map(([path, url]) => {
  const filename = path.split('/').pop()?.replace('.pdf', '') || '';
  // 尝试解析 YYYY_Conf_Author_Title 格式
  const matchWithAuthor = filename.match(/^(\d{4})_([^_]+)_([^_]+)_(.+)$/);
  // 尝试解析 YYYY_Conf_Title 格式
  const matchWithoutAuthor = filename.match(/^(\d{4})_([^_]+)_(.+)$/);
  
  if (matchWithAuthor) {
    return {
      year: matchWithAuthor[1],
      conf: matchWithAuthor[2],
      authors: matchWithAuthor[3],
      title: matchWithAuthor[4],
      tag: "Paper",
      url: url as string
    };
  } else if (matchWithoutAuthor) {
    return {
      year: matchWithoutAuthor[1],
      conf: matchWithoutAuthor[2],
      authors: "Lab Members",
      title: matchWithoutAuthor[3],
      tag: "Paper",
      url: url as string
    };
  }
  
  // 降级处理
  return {
    year: "N/A",
    conf: "Unknown",
    authors: "Lab Members",
    title: filename,
    tag: "Paper",
    url: url as string
  };
}).sort((a, b) => b.year.localeCompare(a.year));

const TEAM = [
  { name: "Professor A", role: "Principal Investigator", initials: "PA", isLead: true },
  { name: "Student A", role: "PhD Candidate", initials: "SA", isLead: false },
  { name: "Student B", role: "PhD Candidate", initials: "SB", isLead: false },
  { name: "Student C", role: "Master Student", initials: "SC", isLead: false },
  { name: "Student D", role: "Master Student", initials: "SD", isLead: false },
  { name: "Student E", role: "Master Student", initials: "SE", isLead: false },
  { name: "Student F", role: "Master Student", initials: "SF", isLead: false },
  { name: "Student G", role: "Undergraduate", initials: "SG", isLead: false },
  { name: "Student H", role: "Undergraduate", initials: "SH", isLead: false },
];

export const LabDetailsPanel: React.FC<LabDetailsPanelProps> = ({ isOpen, onClose, language, activeSection }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const papersPerPage = 10;

  const indexOfLastPaper = currentPage * papersPerPage;
  const indexOfFirstPaper = indexOfLastPaper - papersPerPage;
  const currentPapers = PAPERS.slice(indexOfFirstPaper, indexOfLastPaper);
  const totalPages = Math.ceil(PAPERS.length / papersPerPage);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 2000); // 模拟 2 秒加载时间
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeSection && !isLoading) {
      setTimeout(() => {
        const element = document.getElementById(`lab-${activeSection}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [isOpen, activeSection, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-end font-sans">
      {/* 背景幕 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm cursor-pointer"
      />

      {/* 主抽屉/面板 */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full md:w-[85%] lg:w-[75%] xl:w-[70%] h-full bg-white shadow-2xl overflow-y-auto border-l border-slate-100"
      >
        {/* 关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors z-50"
        >
          <X size={20} />
        </button>

        <div className="max-w-5xl mx-auto px-8 md:px-16 py-16 flex flex-col gap-24">
          
          {/* 1. 英雄 / 概览部分 */}
          <motion.section 
            id="lab-overview" 
            variants={itemVariants} 
            className="flex flex-col md:flex-row items-center justify-between gap-12 pt-4 scroll-mt-20"
          >
            <div className="flex-1 space-y-8 w-full">
              {isLoading ? (
                <>
                  <Skeleton className="w-32 h-6 rounded-full" />
                  <div className="space-y-4">
                    <Skeleton className="w-full md:w-4/5 h-16 rounded-xl" />
                    <Skeleton className="w-2/3 h-16 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-2/3 h-4" />
                  </div>
                  <div className="flex items-center gap-8 py-6 border-y border-slate-100">
                     <div className="space-y-2"><Skeleton className="w-20 h-4"/><Skeleton className="w-16 h-8"/></div>
                     <div className="space-y-2"><Skeleton className="w-20 h-4"/><Skeleton className="w-16 h-8"/></div>
                     <div className="space-y-2"><Skeleton className="w-20 h-4"/><Skeleton className="w-16 h-8"/></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider shadow-md">
                    <Microscope size={14} className="text-blue-400" />
                    <span>TyphoonMonitor Laboratory</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                    AI for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Extreme Weather</span> Resilience
                  </h1>
                  
                  <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
                    We bridge the gap between physical meteorology and data-driven intelligence, building the next generation of global typhoon monitoring systems.
                  </p>

                  {/* 快速统计栏 */}
                  <div className="flex items-center gap-8 py-6 border-y border-slate-100">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider"><Database size={14}/> Datasets</div>
                        <div className="text-2xl font-bold text-slate-800">10TB+</div>
                     </div>
                     <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider"><Award size={14}/> Papers</div>
                        <div className="text-2xl font-bold text-slate-800">40+</div>
                     </div>
                     <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider"><Users size={14}/> Members</div>
                        <div className="text-2xl font-bold text-slate-800">12</div>
                     </div>
                  </div>
                </>
              )}
            </div>
            
            {/* 新的抽象图形 - 在加载期间保持可见以增加美感 */}
            <MeteoCore />
          </motion.section>

          {/* 2. 研究方向 */}
          <motion.section 
            id="lab-research" 
            variants={itemVariants} 
            className="space-y-10 scroll-mt-24"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                 <span className="w-8 h-1 bg-blue-600 rounded-full"></span>
                 Research Focus
              </h3>
              {!isLoading && (
                <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group">
                    View All Projects <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-6 border border-slate-100 rounded-2xl space-y-4">
                    <Skeleton className="w-14 h-14 rounded-xl" />
                    <Skeleton className="w-3/4 h-6" />
                    <Skeleton className="w-full h-20" />
                  </div>
                ))
              ) : (
                RESEARCH_DIRECTIONS.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                    >
                      <div className={`w-14 h-14 ${item.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                ))
              )}
            </div>
          </motion.section>

          {/* 3. 团队部分 */}
          <motion.section 
            id="lab-team" 
            variants={itemVariants} 
            className="space-y-10 scroll-mt-24"
          >
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                 <span className="w-8 h-1 bg-indigo-600 rounded-full"></span>
                 Our Team
            </h3>
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-wrap gap-8 items-center justify-center md:justify-start">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                        <Skeleton className="w-16 h-16 rounded-2xl" />
                        <div className="space-y-1 flex flex-col items-center">
                            <Skeleton className="w-20 h-4" />
                            <Skeleton className="w-16 h-3" />
                        </div>
                    </div>
                ))
              ) : (
                <>
                    {TEAM.map((member, idx) => (
                        <div key={idx} className="group relative flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300 group-hover:scale-105 cursor-default
                            ${member.isLead 
                            ? 'bg-blue-600 text-white shadow-blue-200' 
                            : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                        >
                            {member.initials}
                        </div>
                        <div className="mt-3 text-center">
                            <span className="font-bold block text-sm text-slate-700">{member.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{member.role}</span>
                        </div>
                        </div>
                    ))}
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer bg-white/50">
                        <span className="text-xl font-bold">+</span>
                    </div>
                </>
              )}
            </div>
          </motion.section>

          {/* 4. 论文 / 出版物 */}
          <motion.section 
            id="lab-publications" 
            variants={itemVariants} 
            className="space-y-10 pb-12 scroll-mt-24"
          >
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                 <span className="w-8 h-1 bg-purple-600 rounded-full"></span>
                 Selected Publications
            </h3>
            
            <div className="flex flex-col gap-4">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                    <div key={i} className="p-5 border border-slate-100 rounded-xl flex flex-col md:flex-row gap-4 items-center">
                        <Skeleton className="w-24 h-6" />
                        <Skeleton className="flex-1 h-6" />
                        <Skeleton className="w-16 h-6 rounded-full" />
                    </div>
                ))
              ) : PAPERS.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No papers found in the src/papers directory.
                </div>
              ) : (
                <>
                  {currentPapers.map((paper, i) => (
                      <a 
                      key={i} 
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col md:flex-row md:items-center gap-4 p-5 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                      <div className="flex items-center gap-3 w-32 flex-shrink-0">
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">{paper.year}</span>
                          <span className="text-xs font-bold text-blue-600">{paper.conf}</span>
                      </div>
                      <div className="flex-1">
                          <h5 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
                          {paper.title}
                          </h5>
                      </div>
                      <div className="flex items-center gap-4">
                          <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                          {paper.tag}
                          </span>
                          <ExternalLink size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                      </a>
                  ))}
                  
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-sm font-medium"
                      >
                        {TRANSLATIONS.prev_page[language]}
                      </button>
                      <span className="text-sm text-slate-500 font-medium">
                        {TRANSLATIONS.page_info[language].replace('{current}', currentPage.toString()).replace('{total}', totalPages.toString())}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-sm font-medium"
                      >
                        {TRANSLATIONS.next_page[language]}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.section>

        </div>
      </motion.div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  CloudRain,
  Code2,
  ExternalLink,
  Github,
  Mail,
  MapPin,
  Satellite,
  Wind,
  Zap,
} from 'lucide-react';
import type { LabSectionId, ViewType } from '../../types';
import { LiquidEtherSky } from './LiquidEtherSky';
import {
  featuredPublications,
  publicationsByYear,
  publicationTypeLabels,
} from './publicationData';
import type { PublicationRecord } from './publicationData';
import {
  advisorProfile,
  facultyMembers,
  getMemberPhoto,
  masterStudents,
  phdStudents,
} from './teamData';
import type { StudentMember } from './teamData';

type ResearchArea = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  visual: string;
  images: {
    src?: string;
    alt?: string;
    label: string;
  }[];
  targetView?: ViewType;
};

const researchDirectionImages = {
  typhoonMonitor: new URL('../../assets/lab/research-direction/台风智能监测.png', import.meta.url).href,
  typhoonForecast: new URL('../../assets/lab/research-direction/台风智能预报.png', import.meta.url).href,
  rainfallRetrieval: new URL('../../assets/lab/research-direction/降雨智能反演.png', import.meta.url).href,
  rainfallForecast: new URL('../../assets/lab/research-direction/降水智能预测.png', import.meta.url).href,
  cloudPrediction: new URL('../../assets/lab/research-direction/云预测.png', import.meta.url).href,
  solarIrradianceForecast: new URL('../../assets/lab/research-direction/太阳辐照度预测.png', import.meta.url).href,
};

const zjutWordmarkUrl = new URL('../../assets/lab/zjut-wordmark-primary.png', import.meta.url).href;

const collapsedResearchVisual = 'var(--color-brand-accent)';

const researchAreas: ResearchArea[] = [
  {
    id: 'typhoon',
    title: '台风智能监测与预报',
    description: '基于多源数据与人工智能算法，实现台风路径、强度及降雨的精准监测及短期预报。',
    icon: Wind,
    visual: 'var(--color-brand-primary)',
    images: [
      { src: researchDirectionImages.typhoonMonitor, alt: '台风智能监测示意图', label: '台风监测' },
      { src: researchDirectionImages.typhoonForecast, alt: '台风智能预报示意图', label: '台风预报' },
    ],
    targetView: 'idol',
  },
  {
    id: 'rainfall',
    title: '降雨智能反演与预测',
    description: '结合多源观测数据构建降雨反演模型或实现精细化降雨预测。',
    icon: CloudRain,
    visual: 'var(--color-brand-accent)',
    images: [
      { src: researchDirectionImages.rainfallRetrieval, alt: '降雨智能反演示意图', label: '降雨反演' },
      { src: researchDirectionImages.rainfallForecast, alt: '降水智能预测示意图', label: '降水预测' },
    ],
  },
  {
    id: 'energy',
    title: '能源气象服务',
    description: '围绕云预测与太阳辐照度预测，构建面向新能源发电效率评估的能源气象服务模型。',
    icon: Zap,
    visual: 'var(--color-brand-warm)',
    images: [
      { src: researchDirectionImages.cloudPrediction, alt: '云预测示意图', label: '云预测' },
      { src: researchDirectionImages.solarIrradianceForecast, alt: '太阳辐照度预测示意图', label: '太阳辐照度预测' },
    ],
    targetView: 'cloudseer',
  },
  {
    id: 'agent',
    title: '气象智能体',
    description: '开发具备自主决策能力的气象服务智能体，实现气象数据自动分析、灾害天气预报和预警信息智能推送。',
    icon: Bot,
    visual: 'var(--color-brand-cool)',
    images: [
      { label: '敬请期待' },
      { label: '敬请期待' },
    ],
  },
];

const sectionTitleClass = 'text-3xl font-bold text-slate-950 md:text-5xl';
const homeSectionIds: LabSectionId[] = ['overview', 'team', 'research', 'publications'];
const footerSkyBackground = 'var(--color-brand-primary)';

const scrollToLabSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

const SectionShell: React.FC<{
  id: string;
  children: React.ReactNode;
  tone?: 'light' | 'soft';
}> = ({ id, children, tone = 'light' }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`relative z-10 scroll-mt-8 px-6 py-20 md:px-10 lg:px-14 ${
        tone === 'soft' ? 'bg-brand-cool text-slate-900' : 'bg-brand-warm text-slate-900'
      }`}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </motion.section>
  );
};

const PublicationCard: React.FC<{
  publication: PublicationRecord;
  onNavigate?: (view: ViewType) => void;
  variant?: 'home' | 'detail';
}> = ({ publication, onNavigate, variant = 'detail' }) => {
  const isHome = variant === 'home';

  return (
    <article
      className={`group flex h-full min-h-0 flex-col rounded-lg border border-brand-accent/30 bg-brand-warm shadow-sm transition-all hover:-translate-y-1 hover:border-brand-accent hover:shadow-lg ${
        isHome ? 'p-5' : 'p-4'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isHome && (
          <span className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-bold text-brand-warm">
            {publication.year}
          </span>
        )}
        <span className="rounded-md bg-brand-cool px-2.5 py-1 text-xs font-bold text-brand-primary ring-1 ring-brand-accent/30">
          {publication.venue}
        </span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {publicationTypeLabels[publication.type]}
        </span>
      </div>

      <a
        href={publication.paperUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-start gap-2 font-bold leading-snug text-slate-950 transition-colors hover:text-brand-primary ${
          isHome ? 'text-xl' : 'text-lg'
        }`}
      >
        <span>{publication.title}</span>
        <ExternalLink size={16} className="mt-1 shrink-0 text-slate-300 transition-colors group-hover:text-brand-accent" />
      </a>

      <p className={`mt-3 text-slate-500 ${isHome ? 'text-base leading-7' : 'text-sm leading-6'}`}>
        {publication.authors}
      </p>

      {publication.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {publication.tags.map(tag => (
            <span
              key={`${publication.id}-${tag}`}
              className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap justify-end gap-3 pt-5">
        <a
          href={publication.sourceCodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-brand-accent/30 bg-brand-warm px-3.5 py-2 text-sm font-bold text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Code2 size={16} />
          源代码
        </a>
        {publication.visualView && (
          <button
            type="button"
            onClick={() => onNavigate?.(publication.visualView as ViewType)}
            className="inline-flex items-center gap-2 rounded-md border border-brand-accent/30 bg-brand-warm px-3.5 py-2 text-sm font-bold text-slate-600 transition-all hover:border-brand-accent hover:bg-brand-cool hover:text-brand-primary"
          >
            <ArrowRight size={16} />
            可视化
          </button>
        )}
      </div>
    </article>
  );
};

const MemberPortrait: React.FC<{
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'homeFaculty' | 'card' | 'studentCard' | 'advisorDetail';
  className?: string;
}> = ({ name, size = 'md', className = '' }) => {
  const src = getMemberPhoto(name);
  const sizeClass = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-56 w-40 md:h-64 md:w-48',
    homeFaculty: 'h-48 w-36 self-center xl:h-52 xl:w-40',
    card: 'h-52 w-38 self-center',
    studentCard: 'h-44 w-32 self-center',
    advisorDetail: 'h-72 w-52',
  }[size];

  return (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={`${name}照片`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-brand-cool text-lg font-bold text-brand-primary">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
};

const AdvisorHomeCard: React.FC = () => (
  <article className="grid gap-6 rounded-lg border border-brand-accent/30 bg-brand-warm p-6 shadow-sm md:grid-cols-[auto_1fr]">
    <MemberPortrait name={advisorProfile.name} size="lg" className="bg-slate-50" />
    <div className="min-w-0">
      <h3 className="text-3xl font-bold text-slate-950">{advisorProfile.name}</h3>
      <p className="mt-2 text-base font-semibold text-slate-700">{advisorProfile.title}</p>
      <p className="mt-1 text-sm text-slate-500">{advisorProfile.school}</p>
      <p className="mt-5 w-full text-justify text-base leading-8 text-slate-600">
        {advisorProfile.bio}
      </p>
    </div>
  </article>
);

const FacultyHomeCard: React.FC<{
  member: typeof facultyMembers[number];
}> = ({ member }) => (
  <article className="flex w-full flex-col rounded-lg border border-brand-accent/30 bg-white p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-accent hover:bg-white hover:shadow-lg xl:p-5">
    <MemberPortrait name={member.name} size="homeFaculty" className="bg-white" />
    <div className="mt-4 min-w-0">
      <h3 className="whitespace-nowrap text-lg font-bold text-slate-950">{member.name}</h3>
      <p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-500">{member.title}</p>
      {member.research && (
        <p className="mt-2 inline-flex whitespace-nowrap rounded-md bg-brand-warm px-2.5 py-1 text-xs font-semibold text-brand-primary ring-1 ring-brand-accent/30 lg:text-[11px] xl:text-xs">
          {member.research}
        </p>
      )}
    </div>
  </article>
);

const TeamSection: React.FC<{ onNavigate?: (view: ViewType) => void }> = ({ onNavigate }) => (
  <SectionShell id="team">
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className={sectionTitleClass}>科研团队</h2>
        <p className="mt-5 text-base leading-7 text-slate-600">
          汇聚计算机科学与大气物理跨学科人才。
        </p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate?.('lab_team')}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-brand-primary px-5 py-3 text-sm font-bold text-brand-warm shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-0.5 hover:bg-brand-accent"
      >
        团队详情
        <ArrowRight size={16} />
      </button>
    </div>

    <div className="space-y-6">
      <AdvisorHomeCard />
      <div className="grid gap-4 [grid-template-columns:repeat(2,minmax(0,1fr))] sm:[grid-template-columns:repeat(3,minmax(0,1fr))] lg:[grid-template-columns:repeat(5,minmax(0,1fr))] xl:gap-4">
        {facultyMembers.map(member => (
          <FacultyHomeCard key={member.name} member={member} />
        ))}
      </div>
    </div>
  </SectionShell>
);

const ResearchSection: React.FC<{ onNavigate?: (view: ViewType) => void }> = ({ onNavigate }) => {
  const [activeId, setActiveId] = useState(researchAreas[0].id);

  return (
    <SectionShell id="research" tone="soft">
      <div className="mb-10 max-w-3xl">
        <h2 className={sectionTitleClass}>研究方向</h2>
        <p className="mt-5 text-base leading-7 text-slate-600">
          探索人工智能与大气科学的深度融合路径。
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[940px] gap-3 lg:min-w-0">
        {researchAreas.map(area => {
          const Icon = area.icon;
          const isActive = activeId === area.id;
          return (
            <article
              key={area.id}
              onMouseEnter={() => setActiveId(area.id)}
              onFocus={() => setActiveId(area.id)}
              className={`group flex h-[500px] overflow-hidden rounded-lg border bg-brand-warm text-slate-900 shadow-sm transition-[border-color,box-shadow,flex] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isActive ? 'border-brand-accent shadow-xl shadow-brand-primary/10' : 'border-brand-accent/30 hover:border-brand-accent/60 hover:shadow-lg'
              }`}
              style={{ flex: isActive ? '1 1 0%' : '0 0 78px' }}
              tabIndex={0}
            >
              <button
                type="button"
                aria-expanded={isActive}
                onClick={() => setActiveId(area.id)}
                className={`relative flex h-auto shrink-0 flex-col items-center gap-4 overflow-hidden px-4 py-5 text-left transition-colors duration-700 ${
                  isActive ? 'w-20 bg-brand-primary text-brand-warm' : 'w-full text-brand-warm hover:text-brand-warm'
                }`}
                style={{ background: isActive ? undefined : collapsedResearchVisual }}
              >
                <span className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-lg ${
                  isActive ? 'bg-brand-warm/12 text-brand-warm ring-1 ring-brand-warm/16' : 'bg-brand-warm/20 text-brand-warm ring-1 ring-brand-warm/30'
                }`}>
                  <Icon size={24} />
                </span>
                <span className="relative z-10 inline-block text-lg font-bold leading-7 [text-orientation:mixed] [writing-mode:vertical-rl]">
                  {area.title}
                </span>
              </button>

              {isActive && (
                <motion.div
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="min-w-0 flex-1 overflow-hidden"
                >
                  <div className="flex h-full min-w-0 flex-col gap-4 p-5">
                    <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
                      {area.images.map((image, index) => (
                        <figure key={`${area.id}-${image.label}-${index}`} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-brand-accent/30 bg-brand-warm shadow-sm">
                          <div className="min-h-0 flex-1 bg-white">
                            {image.src ? (
                              <img
                                src={image.src}
                                alt={image.alt}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white text-2xl font-bold text-brand-primary">
                                敬请期待
                              </div>
                            )}
                          </div>
                          <figcaption
                            className="flex h-11 shrink-0 items-center justify-center border-t border-slate-100 px-3 text-center text-sm font-bold leading-tight text-slate-600"
                            title={image.label}
                          >
                            <span className="max-w-full truncate">{image.label}</span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>

                    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-slate-100 pt-4">
                      <p className="min-w-0 text-base font-semibold leading-7 text-slate-600">
                        {area.description}
                      </p>
                      <button
                        type="button"
                        disabled={!area.targetView}
                        onClick={() => area.targetView && onNavigate?.(area.targetView)}
                        title={area.targetView ? `查看${area.title}可视化模型` : '该方向暂未接入可视化模型'}
                        className={`inline-flex w-fit items-center gap-2 justify-self-end whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-bold transition-all ${
                          area.targetView
                            ? 'bg-brand-primary text-brand-warm shadow-lg shadow-brand-primary/20 hover:-translate-y-0.5 hover:bg-brand-accent'
                            : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                      >
                        了解详情
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </article>
          );
        })}
        </div>
      </div>
    </SectionShell>
  );
};

const PublicationsSection: React.FC<{ onNavigate?: (view: ViewType) => void }> = ({ onNavigate }) => (
  <SectionShell id="publications">
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className={sectionTitleClass}>学术成果</h2>
        <p className="mt-5 text-base leading-7 text-slate-600">
          近期发表的顶级会议与期刊论文。
        </p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate?.('lab_publications')}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-brand-primary px-5 py-3 text-sm font-bold text-brand-warm shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-0.5 hover:bg-brand-accent"
      >
        全部成果
        <ArrowRight size={16} />
      </button>
    </div>

    <div className="grid auto-rows-fr items-stretch gap-5 lg:grid-cols-2">
      {featuredPublications.map(publication => (
        <PublicationCard
          key={publication.id}
          publication={publication}
          onNavigate={onNavigate}
          variant="home"
        />
      ))}
    </div>
  </SectionShell>
);

const ContactSection: React.FC = () => (
  <section
    id="contact"
    className="relative z-10 overflow-hidden px-6 py-7 text-brand-warm md:px-10 lg:px-14"
    style={{ background: footerSkyBackground }}
  >
    <div className="relative mx-auto grid max-w-7xl gap-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] md:items-start">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold md:text-3xl">联系我们</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-brand-warm/88 [text-shadow:0_2px_12px_rgba(2,38,76,0.28)]">
          如果需要了解招生、团队合作或项目开源信息，可以通过后续补充的邮箱与地址联系。
        </p>
      </div>

      <div className="flex flex-col gap-3 md:items-end md:text-right">
        <a
          href="https://github.com/Zjut-MultimediaPlus"
          target="_blank"
          rel="noopener noreferrer"
          className="group w-fit text-brand-warm/82 transition-colors hover:text-brand-warm"
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-warm">
            <Github size={14} className="shrink-0 text-brand-warm/72" />
            <span>GitHub</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-brand-warm/78 group-hover:underline md:justify-end">
            Zjut-MultimediaPlus
            <ExternalLink size={11} className="text-brand-warm/45 transition-colors group-hover:text-brand-warm/72" />
          </span>
        </a>

        <div className="text-brand-warm/82">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-warm">
            <Mail size={14} className="shrink-0 text-brand-warm/72" />
            <span>邮箱</span>
          </div>
          <p className="mt-0.5 break-all text-sm font-semibold text-brand-warm/78">congbai@zjut.edu.cn</p>
        </div>

        <div className="max-w-[360px] text-brand-warm/82">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-warm">
            <MapPin size={14} className="shrink-0 text-brand-warm/72" />
            <span>地址</span>
          </div>
          <p className="mt-0.5 text-sm leading-6 text-brand-warm/78">
            浙江省杭州市留和路288号浙江工业大学屏峰校区<br />
            计算机科学与技术学院（软件学院、人工智能学院）
          </p>
        </div>
      </div>
    </div>
  </section>
);

export const LabHome: React.FC<{
  onNavigate?: (view: ViewType) => void;
  onActiveSectionChange?: (sectionId: LabSectionId) => void;
}> = ({ onNavigate, onActiveSectionChange }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onActiveSectionChange) return undefined;

    let frameId: number | null = null;

    const updateActiveSection = () => {
      frameId = null;
      const containerRect = container.getBoundingClientRect();
      const anchorY = containerRect.top + Math.min(containerRect.height * 0.38, 280);
      let nextSection: LabSectionId = 'overview';
      let bestDistance = Number.POSITIVE_INFINITY;

      homeSectionIds.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const rect = section.getBoundingClientRect();
        const containsAnchor = rect.top <= anchorY && rect.bottom >= anchorY;
        const distance = containsAnchor ? 0 : Math.min(
          Math.abs(rect.top - anchorY),
          Math.abs(rect.bottom - anchorY)
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          nextSection = sectionId;
        }
      });

      onActiveSectionChange(nextSection);
    };

    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    container.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      container.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [onActiveSectionChange]);

  return (
    <div ref={scrollContainerRef} className="relative isolate h-full w-full overflow-y-auto scroll-smooth bg-brand-warm font-sans">
    <LiquidEtherSky />

    <section id="overview" className="relative z-10 flex min-h-screen w-full overflow-hidden px-6 py-20 text-slate-950 md:px-10 lg:items-center lg:px-14">
      <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="min-w-0 max-w-[calc(100vw-3rem)] md:max-w-none"
        >
          <div className="mb-5 inline-flex rounded-md border border-brand-warm/60 bg-brand-warm/82 px-4 py-2 shadow-sm shadow-brand-primary/5 backdrop-blur">
            <img
              src={zjutWordmarkUrl}
              alt="浙江工业大学"
              className="h-7 w-auto max-w-[58vw] object-contain sm:h-8"
            />
          </div>
          <h1 className="max-w-full text-4xl font-extrabold leading-tight text-brand-warm [text-shadow:0_4px_24px_rgba(3,47,88,0.48)] sm:text-5xl md:max-w-4xl md:text-7xl">
            气象人工智能实验室
          </h1>
          <p className="mt-7 max-w-full text-base leading-8 text-brand-warm/92 [text-shadow:0_2px_14px_rgba(2,38,76,0.34)] sm:text-lg sm:leading-9 md:max-w-3xl">
            深耕人工智能与大气科学交叉研究，致力于推动人工智能在天气智能监测与预报的前沿应用。
          </p>
          <div className="mt-9">
            <button
              type="button"
              onClick={() => scrollToLabSection('research')}
              className="inline-flex items-center gap-2 rounded-md border border-brand-warm/70 bg-brand-warm/82 px-5 py-3 text-sm font-bold text-brand-primary shadow-sm shadow-brand-primary/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-warm hover:bg-brand-warm"
            >
              了解详情
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="min-w-0 rounded-lg border border-brand-warm/62 bg-brand-warm/78 p-7 shadow-[0_28px_90px_rgba(0,165,224,0.16)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[#123047]">团队介绍</h2>
            </div>
            <Satellite className="shrink-0 text-brand-primary" size={34} />
          </div>
          <p className="mt-7 text-[17px] leading-9 text-slate-700">
            浙江工业大学计算机学院气象人工智能实验室，聚焦计算机视觉、智慧气象与人工智能的交叉研究领域，科研积累深厚，平台设施完善。团队当前承担国家自然科学基金联合重点、面上及省杰出青年科学基金延续资助项目等，研究方向前沿且科研经费充足，为各种研究的开展提供坚实支撑。
          </p>
        </motion.aside>
      </div>
    </section>

    <TeamSection onNavigate={onNavigate} />
    <ResearchSection onNavigate={onNavigate} />
    <PublicationsSection onNavigate={onNavigate} />
    <ContactSection />
    </div>
  );
};

const AdvisorDetailSection: React.FC = () => (
  <SectionShell id="advisor-detail" tone="soft">
    <div className="mb-8">
      <h2 className={sectionTitleClass}>指导老师</h2>
    </div>
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <div>
        <MemberPortrait name={advisorProfile.name} size="advisorDetail" className="bg-brand-warm" />
      </div>

      <div className="min-w-0">
        <div>
          <h3 className="text-4xl font-bold text-slate-950">{advisorProfile.name}</h3>
        </div>
        <p className="mt-3 text-lg font-semibold text-slate-700">{advisorProfile.title}</p>
        <p className="mt-1 text-sm text-slate-500">{advisorProfile.school}</p>
        <p className="mt-7 text-base leading-8 text-slate-700">
          {advisorProfile.bio}
        </p>
      </div>
    </div>
  </SectionShell>
);

const FacultyDetailSection: React.FC = () => (
  <SectionShell id="faculty-detail">
    <div className="mb-8">
      <h2 className={sectionTitleClass}>团队老师</h2>
    </div>
    <div className="grid justify-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(180px,210px))]">
      {facultyMembers.map(member => (
        <article key={member.name} className="flex w-full max-w-[210px] flex-col rounded-lg border border-brand-accent/30 bg-brand-warm p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-accent hover:shadow-lg">
          <MemberPortrait name={member.name} size="card" className="bg-slate-50" />
          <div className="mt-4 text-left">
            <h3 className="text-xl font-bold text-slate-950">{member.name}</h3>
            <p className="mt-1 text-base font-semibold text-slate-500">{member.title}</p>
            {member.research && (
              <p className="mt-3 inline-flex rounded-md bg-brand-cool px-3 py-1.5 text-sm font-bold text-brand-primary ring-1 ring-brand-accent/30">
                {member.research}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  </SectionShell>
);

const StudentCard: React.FC<{ student: StudentMember }> = ({ student }) => (
  <article className="flex w-full max-w-[190px] flex-col rounded-lg border border-brand-accent/30 bg-brand-warm p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-accent hover:shadow-lg">
    <MemberPortrait name={student.name} size="studentCard" className="bg-slate-50" />
    <div className="mt-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-slate-950">{student.name}</h3>
        <span className="rounded-md bg-brand-cool px-2 py-0.5 text-xs font-bold text-brand-primary">{student.year}</span>
      </div>
      {student.research && (
        <p className="mt-2 text-sm font-semibold text-brand-primary">{student.research}</p>
      )}
      {student.note && (
        <p className="mt-2 text-sm leading-6 text-slate-500">{student.note}</p>
      )}
    </div>
  </article>
);

const PhdStudentSection: React.FC = () => (
  <SectionShell id="phd-detail">
    <div className="mb-8">
      <h2 className={sectionTitleClass}>博士研究生</h2>
    </div>
    <div className="grid justify-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(165px,190px))]">
      {phdStudents.map(student => (
        <StudentCard key={student.name} student={student} />
      ))}
    </div>
  </SectionShell>
);

const MasterStudentSection: React.FC = () => {
  const studentsByYear = useMemo(() => {
    return masterStudents.reduce<Record<string, StudentMember[]>>((groups, student) => {
      groups[student.year] = groups[student.year] || [];
      groups[student.year].push(student);
      return groups;
    }, {});
  }, []);

  const years = Object.keys(studentsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <SectionShell id="master-detail" tone="soft">
      <div className="mb-8">
        <h2 className={sectionTitleClass}>硕士研究生</h2>
      </div>
      <div className="space-y-8">
        {years.map(year => (
          <div key={year}>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-md bg-brand-primary px-3 py-1 text-sm font-bold text-brand-warm">{year}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid justify-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(165px,190px))]">
              {studentsByYear[year].map(student => (
                <StudentCard key={student.name} student={student} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export const LabTeamPage: React.FC<{ onNavigate?: (view: ViewType) => void }> = ({ onNavigate }) => (
  <div className="h-full w-full overflow-y-auto scroll-smooth bg-brand-cool font-sans text-slate-900">
    <button
      type="button"
      onClick={() => onNavigate?.('lab_home')}
      className="fixed right-6 top-6 z-[1003] inline-flex items-center gap-2 rounded-md border border-brand-warm/45 bg-brand-warm/88 px-4 py-2 text-sm font-bold text-brand-primary shadow-lg shadow-brand-primary/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-brand-warm"
    >
      <ChevronLeft size={16} />
      返回实验室首页
    </button>

    <section className="relative overflow-hidden bg-brand-primary px-6 py-16 text-brand-warm md:px-10 lg:px-14">
      <div className="relative mx-auto max-w-7xl">
        <div className="mt-10 max-w-4xl">
          <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-6xl">科研团队</h1>
          <p className="mt-6 text-lg leading-8 text-brand-warm/92">
            团队围绕计算机视觉、智慧气象与人工智能交叉方向持续开展科研攻关。
          </p>
        </div>
      </div>
    </section>

    <AdvisorDetailSection />
    <FacultyDetailSection />
    <PhdStudentSection />
    <MasterStudentSection />
    <ContactSection />
  </div>
);

export const LabPublicationsPage: React.FC<{ onNavigate?: (view: ViewType) => void }> = ({ onNavigate }) => (
  <div className="h-full w-full overflow-y-auto scroll-smooth bg-brand-cool font-sans text-slate-900">
    <button
      type="button"
      onClick={() => onNavigate?.('lab_home')}
      className="fixed right-6 top-6 z-[1003] inline-flex items-center gap-2 rounded-md border border-brand-warm/45 bg-brand-warm/88 px-4 py-2 text-sm font-bold text-brand-primary shadow-lg shadow-brand-primary/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-brand-warm"
    >
      <ChevronLeft size={16} />
      返回实验室首页
    </button>

    <section className="relative overflow-hidden bg-brand-primary px-6 py-16 text-brand-warm md:px-10 lg:px-14">
      <div className="relative mx-auto max-w-7xl">
        <div className="mt-10 max-w-4xl">
          <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-6xl">学术成果</h1>
          <p className="mt-6 text-lg leading-8 text-brand-warm/92">
            近期发表的顶级会议与期刊论文。
          </p>
        </div>
      </div>
    </section>

    <section className="px-6 py-16 md:px-10 lg:px-14">
      <div className="mx-auto max-w-7xl space-y-12">
        {publicationsByYear.map(group => (
          <section key={group.year} className="scroll-mt-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-md bg-brand-primary px-4 py-2 text-base font-bold text-brand-warm">
                {group.year}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid auto-rows-fr items-stretch gap-5 lg:grid-cols-2">
              {group.items.map(publication => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  onNavigate={onNavigate}
                  variant="detail"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
    <ContactSection />
  </div>
);

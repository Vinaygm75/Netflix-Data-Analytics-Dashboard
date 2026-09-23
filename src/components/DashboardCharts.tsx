import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useInViewObserver } from './ScrollReveal';
import { WorkLog, TaskType } from '../types';
import {
  getTrendData,
  getLogTask,
  isLogCompleted,
  getTaskBreakdown,
} from '../utils/kpi';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Video,
  Film,
  Camera,
  Layers,
  Sparkles,
  HelpCircle,
  Package,
  Layers3,
  ChevronDown,
  ChevronUp,
  ImageIcon,
} from 'lucide-react';

export const CATEGORY_META: Record<
  TaskType,
  { label: string; icon: React.FC<{ className?: string }>; color: string; hex: string; bg: string }
> = {
  Videos: { label: 'Videos', icon: Video, color: 'text-[#1a66c2] dark:text-sky-400', hex: '#1a66c2', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  Shorts: { label: 'Shorts', icon: Film, color: 'text-[#2f72ba] dark:text-sky-300', hex: '#2f72ba', bg: 'bg-sky-50 dark:bg-sky-950/40' },
  Reels: { label: 'Reels', icon: Sparkles, color: 'text-[#4a68a8] dark:text-indigo-300', hex: '#4a68a8', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  Photos: { label: 'Photos', icon: Camera, color: 'text-[#25899b] dark:text-teal-300', hex: '#25899b', bg: 'bg-teal-50 dark:bg-teal-950/40' },
  Thumbnail: { label: 'Thumbnail', icon: ImageIcon, color: 'text-[#0284c7] dark:text-cyan-300', hex: '#0284c7', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
  Shootings: { label: 'Shootings', icon: Layers, color: 'text-[#b87b28] dark:text-amber-300', hex: '#b87b28', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  Others: { label: 'Others', icon: HelpCircle, color: 'text-[#64748b] dark:text-slate-400', hex: '#64748b', bg: 'bg-slate-50 dark:bg-slate-800/60' },
};

export const CATEGORIES: TaskType[] = ['Videos', 'Shorts', 'Reels', 'Photos', 'Thumbnail', 'Shootings', 'Others'];

// =========================================================================
// 1. PRODUCTION TREND CARD (LINE CHART) — FULL WIDTH
// =========================================================================
export interface ProductionTrendCardProps {
  userLogs: WorkLog[];
  activePeriod: 'today' | 'week' | 'month' | 'year';
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void;
  onAddWorkClick?: () => void;
  metricType?: 'tasks' | 'deliverables';
  onMetricTypeChange?: (type: 'tasks' | 'deliverables') => void;
  theme?: 'light' | 'dark';
}

export const ProductionTrendCard: React.FC<ProductionTrendCardProps> = ({
  userLogs,
  activePeriod,
  onPeriodChange,
  onAddWorkClick,
  metricType = 'tasks',
  onMetricTypeChange,
}) => {
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [currentMetric, setCurrentMetric] = useState<'tasks' | 'deliverables'>(metricType);

  const handleMetricToggle = (val: 'tasks' | 'deliverables') => {
    setCurrentMetric(val);
    if (onMetricTypeChange) onMetricTypeChange(val);
  };

  const completedLogs = userLogs.filter(isLogCompleted);
  const trendData = getTrendData(userLogs, activePeriod);

  // Maximum value for scaling the line chart
  const maxVal = Math.max(
    1,
    ...trendData.map((d) => (currentMetric === 'tasks' ? d.completed : d.deliverables))
  );

  const totalCompletedInPeriod = trendData.reduce((acc, d) => acc + d.completed, 0);
  const totalDeliverablesInPeriod = trendData.reduce((acc, d) => acc + d.deliverables, 0);

  // SVG Line Chart dimensions optimized for expanded two-column grid
  const svgWidth = 640;
  const svgHeight = 210;
  const padLeft = 38;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const points = trendData.map((item, idx) => {
    const val = currentMetric === 'tasks' ? item.completed : item.deliverables;
    const x =
      trendData.length > 1
        ? padLeft + (idx / (trendData.length - 1)) * chartWidth
        : padLeft + chartWidth / 2;
    const y = padTop + chartHeight - (val / maxVal) * chartHeight;
    return { ...item, val, x, y };
  });

  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - padBottom} L ${points[0].x} ${
          svgHeight - padBottom
        } Z`
      : '';

  const [cardRef, isInView] = useInViewObserver();

  return (
    <div ref={cardRef} id="production-trend-card" className="liquid-glass-card rounded-2xl p-4 sm:p-6 flex flex-col justify-between h-full w-full min-w-0">
      <div>
        {/* Header with Title & Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4 w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Production Trend
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 shadow-xs whitespace-nowrap">
                  {currentMetric === 'tasks' ? `${totalCompletedInPeriod} Tasks` : `${totalDeliverablesInPeriod} Deliv.`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Completed production volume over time
              </p>
            </div>
          </div>

          {/* Controls: Tasks vs Deliverables and Period Switcher */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto min-w-0">
            {/* Metric Toggle: Tasks vs Deliverables */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 text-[11px] shadow-xs shrink-0 max-w-full">
              <button
                type="button"
                id="production-trend-metric-tasks"
                onClick={() => handleMetricToggle('tasks')}
                className={`px-2.5 py-1 sm:py-0.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentMetric === 'tasks'
                    ? 'bg-white dark:bg-slate-700 text-[#1a66c2] dark:text-sky-300 shadow-xs border border-white/80 dark:border-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tasks
              </button>
              <button
                type="button"
                id="production-trend-metric-deliverables"
                onClick={() => handleMetricToggle('deliverables')}
                className={`px-2.5 py-1 sm:py-0.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentMetric === 'deliverables'
                    ? 'bg-white dark:bg-slate-700 text-[#1a66c2] dark:text-sky-300 shadow-xs border border-white/80 dark:border-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Deliverables
              </button>
            </div>

            {/* Period Filter Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 text-[11px] shadow-xs max-w-full overflow-x-auto no-scrollbar">
              {(['today', 'week', 'month', 'year'] as const).map((period) => {
                const labels = {
                  today: 'Today',
                  week: 'Week',
                  month: 'Month',
                  year: 'Year',
                };
                const isActive = activePeriod === period;
                return (
                  <button
                    key={period}
                    type="button"
                    id={`dashboard-trend-period-${period}`}
                    onClick={() => onPeriodChange(period)}
                    className={`px-2 sm:px-2.5 py-1 sm:py-0.5 rounded-md font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'liquid-btn-primary text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {labels[period]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SVG Line Chart Container */}
        <div className="relative pt-1 pb-1 overflow-hidden min-h-[195px] flex items-center w-full max-w-full">
          {userLogs.length === 0 ? (
            <div className="w-full py-10 text-center">
              <p className="text-xs text-slate-400 font-medium">No production data yet for this period.</p>
              {onAddWorkClick && (
                <button
                  type="button"
                  onClick={onAddWorkClick}
                  className="mt-2 text-xs text-[#1a66c2] dark:text-sky-400 font-bold hover:underline cursor-pointer"
                >
                  + Add Today's Work
                </button>
              )}
            </div>
          ) : (
            <div className="w-full min-w-0">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-48 sm:h-52 overflow-hidden block"
              >
                <defs>
                  <linearGradient id="mainTrendCardGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a66c2" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#1a66c2" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines & Y-Axis Labels */}
                {[0, 0.5, 1].map((ratio, i) => {
                  const y = padTop + chartHeight * (1 - ratio);
                  const val = Math.round(maxVal * ratio);
                  return (
                    <g key={i}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200/70 dark:text-slate-800/80"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Gradient Area Fill */}
                {areaPath && (
                  <motion.path
                    d={areaPath}
                    fill="url(#mainTrendCardGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isInView ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )}

                {/* Crisp Primary Blue Line */}
                {linePath && (
                  <motion.path
                    d={linePath}
                    fill="none"
                    stroke="#1a66c2"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: isInView ? 1 : 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}

                {/* Interactive Data Points */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredPointIdx === idx;
                  return (
                    <motion.g
                      key={idx}
                      className="cursor-pointer"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: isInView ? 1 : 0, opacity: isInView ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: isInView ? 0.15 + idx * 0.04 : 0 }}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="transparent"
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? '5.5' : '3.5'}
                        fill="#FFFFFF"
                        stroke="#1a66c2"
                        strokeWidth={isHovered ? '2.5' : '2'}
                        className="transition-all duration-150"
                      />
                      <text
                        x={pt.x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className={`text-[10px] transition-colors ${
                          isHovered
                            ? 'font-bold fill-[#1a66c2] dark:fill-sky-400'
                            : 'font-medium fill-slate-500 dark:fill-slate-400'
                        }`}
                      >
                        {activePeriod === 'week'
                          ? pt.label.slice(0, 3)
                          : activePeriod === 'month'
                          ? pt.label.replace('Week ', 'W')
                          : pt.label}
                      </text>
                    </motion.g>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {hoveredPointIdx !== null && points[hoveredPointIdx] && (
                <div
                  className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs shadow-xl border border-slate-700/80 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(points[hoveredPointIdx].x / svgWidth) * 100}%`,
                    top: `${(points[hoveredPointIdx].y / svgHeight) * 100}%`,
                  }}
                >
                  <div className="font-bold text-[11px] text-sky-300">
                    {points[hoveredPointIdx].label}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    <span className="text-emerald-400 font-semibold">
                      {points[hoveredPointIdx].completed} tasks completed
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-sky-300 font-semibold">
                      {points[hoveredPointIdx].deliverables} deliverables
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-4">
        <span>
          Period:{' '}
          <strong className="text-slate-700 dark:text-slate-300 font-semibold">
            {activePeriod === 'today'
              ? 'Today'
              : activePeriod === 'week'
              ? 'Past 7 Days'
              : activePeriod === 'month'
              ? 'This Month'
              : 'This Year'}
          </strong>
        </span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {completedLogs.length} Total Completed in Lifetime
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// 2. COMPLETED WORK BY TITLE CARD (HORIZONTAL BAR CHART)
// =========================================================================
export interface CompletedWorkByTitleCardProps {
  userLogs: WorkLog[];
  onAddWorkClick?: () => void;
  theme?: 'light' | 'dark';
}

export const CompletedWorkByTitleCard: React.FC<CompletedWorkByTitleCardProps> = ({
  userLogs,
  onAddWorkClick,
}) => {
  const [showAll, setShowAll] = useState(false);
  const completedLogs = userLogs.filter(isLogCompleted);

  const titleMap = new Map<
    string,
    { title: string; task: TaskType; count: number; deliverables: number }
  >();

  completedLogs.forEach((log) => {
    const rawTitle = (log.title || log.taskDetails || log.videoTitle || 'Untitled Work').trim();
    const taskType = getLogTask(log);
    const qty = typeof log.quantity === 'number' && log.quantity > 0 ? log.quantity : 1;

    const existing = titleMap.get(rawTitle);
    if (existing) {
      existing.count += 1;
      existing.deliverables += qty;
    } else {
      titleMap.set(rawTitle, {
        title: rawTitle,
        task: taskType,
        count: 1,
        deliverables: qty,
      });
    }
  });

  const allTitles = Array.from(titleMap.values()).sort(
    (a, b) => b.count - a.count || b.deliverables - a.deliverables
  );

  const titlesData = showAll ? allTitles : allTitles.slice(0, 5);
  const maxTitleCount = Math.max(1, ...allTitles.map((t) => t.count));
  const [cardRef, isInView] = useInViewObserver();

  return (
    <div ref={cardRef} id="completed-work-by-title-card" className="liquid-glass-card rounded-2xl p-4 sm:p-6 flex flex-col justify-between h-full w-full min-w-0">
      <div>
        {/* Header with Title & Badge */}
        <div className="flex items-center justify-between gap-2 mb-4 w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Completed Work by Title
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Completed work grouped by actual work title
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-white/60 dark:border-white/10 backdrop-blur-md shrink-0 whitespace-nowrap">
            {allTitles.length} Titles
          </span>
        </div>

        {/* Content */}
        {titlesData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No completed work titles recorded yet.
            </p>
            {onAddWorkClick && (
              <button
                type="button"
                onClick={onAddWorkClick}
                className="mt-3 text-xs text-[#1a66c2] dark:text-sky-400 font-bold hover:underline cursor-pointer"
              >
                + Log completed work
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 my-2 max-h-[290px] overflow-y-auto pr-1">
            {titlesData.map((item, idx) => {
              const meta = CATEGORY_META[item.task] || CATEGORY_META.Others;
              const Icon = meta.icon;
              const pct = Math.max(10, Math.round((item.count / maxTitleCount) * 100));

              return (
                <div key={item.title} className="space-y-1.5 group">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 text-slate-600 dark:text-slate-300">
                        <Icon className="w-3 h-3" />
                      </span>
                      <span
                        className="font-semibold text-slate-900 dark:text-white truncate"
                        title={item.title}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        {item.task}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-[#1a66c2] dark:text-sky-400">
                        {item.count}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        done ({item.deliverables} units)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: isInView ? `${pct}%` : '0%' }}
                      transition={{ duration: 0.65, delay: isInView ? idx * 0.045 : 0, ease: [0.16, 1, 0.3, 1] }}
                      style={{ backgroundColor: meta.hex }}
                      className="h-full rounded-full transition-opacity duration-300 group-hover:opacity-90"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer & Expand Toggle */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-4">
        {allTitles.length > 5 ? (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 font-bold text-[#1a66c2] dark:text-sky-400 hover:underline cursor-pointer"
          >
            <span>{showAll ? 'Show top 5 titles' : `View all ${allTitles.length} titles`}</span>
            {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span>Dynamic title distribution</span>
        )}
        <span className="font-semibold text-slate-900 dark:text-white">
          {titlesData.length} of {allTitles.length} displayed
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// 3. COMPLETED WORK BY TYPE CARD (DONUT CHART)
// =========================================================================
export interface CompletedWorkByTypeCardProps {
  userLogs: WorkLog[];
  onAddWorkClick?: () => void;
  theme?: 'light' | 'dark';
}

export const CompletedWorkByTypeCard: React.FC<CompletedWorkByTypeCardProps> = ({
  userLogs,
}) => {
  const completedLogs = userLogs.filter(isLogCompleted);
  const totalCompletedCount = completedLogs.length;

  const typeCounts = CATEGORIES.map((cat) => {
    const count = completedLogs.filter((l) => getLogTask(l) === cat).length;
    return {
      category: cat,
      count,
      meta: CATEGORY_META[cat],
      percent: totalCompletedCount > 0 ? Math.round((count / totalCompletedCount) * 100) : 0,
    };
  });

  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedPercent = 0;
  const donutSegments = typeCounts
    .filter((item) => item.count > 0)
    .map((item) => {
      const segPercent = (item.count / totalCompletedCount) * 100;
      const strokeDash = (segPercent / 100) * donutCircumference;
      const strokeOffset = -((accumulatedPercent / 100) * donutCircumference);
      accumulatedPercent += segPercent;

      return {
        ...item,
        strokeDash: `${strokeDash} ${donutCircumference}`,
        strokeOffset,
      };
    });

  const [cardRef, isInView] = useInViewObserver();

  return (
    <div ref={cardRef} id="completed-work-by-type-card" className="liquid-glass-card rounded-2xl p-4 sm:p-6 flex flex-col justify-between h-full w-full min-w-0">
      <div>
        {/* Header with Title & Stat */}
        <div className="flex items-center justify-between gap-2 mb-3 w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Completed Work by Type
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Videos, Shorts, Reels, Photos, Shootings, Others
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-white/60 dark:border-white/10 backdrop-blur-md shrink-0 whitespace-nowrap">
            {totalCompletedCount} Done
          </span>
        </div>

        {/* Donut Graphic and Center Display */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={donutRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                className="text-slate-100 dark:text-slate-800"
              />

              {donutSegments.map((seg) => (
                <motion.circle
                  key={seg.category}
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  fill="none"
                  stroke={seg.meta.hex}
                  strokeWidth="11"
                  strokeDasharray={seg.strokeDash}
                  initial={{ strokeDashoffset: donutCircumference }}
                  animate={{ strokeDashoffset: isInView ? seg.strokeOffset : donutCircumference }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                Total Completed
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {totalCompletedCount}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">Tasks</span>
            </div>
          </div>

          {/* Category Breakdown Legend */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4">
            {typeCounts.map((item) => (
              <div
                key={item.category}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.meta.hex }}
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.count}
                  </span>
                  <span className="text-[9px] text-slate-400">({item.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-4">
        <span>7 Production Types</span>
        <span className="font-bold text-[#1a66c2] dark:text-sky-400">
          {totalCompletedCount} Completed Tasks
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// 4. DELIVERABLES OVERVIEW CARD (BAR CHART) — FULL/READABLE WIDTH
// =========================================================================
export interface DeliverablesOverviewCardProps {
  userLogs: WorkLog[];
  onAddWorkClick?: () => void;
  theme?: 'light' | 'dark';
}

export const DeliverablesOverviewCard: React.FC<DeliverablesOverviewCardProps> = ({
  userLogs,
  onAddWorkClick,
}) => {
  const breakdown = getTaskBreakdown(userLogs);
  const totalDeliverables = CATEGORIES.reduce((acc, cat) => acc + breakdown[cat].deliverables, 0);
  const totalTasks = CATEGORIES.reduce((acc, cat) => acc + breakdown[cat].completed, 0);
  const maxDeliverable = Math.max(1, ...CATEGORIES.map((c) => breakdown[c].deliverables));
  const [cardRef, isInView] = useInViewObserver();

  return (
    <div ref={cardRef} id="deliverables-overview-card" className="liquid-glass-card rounded-2xl p-4 sm:p-6 flex flex-col justify-between w-full min-w-0">
      <div>
        {/* Header with Title & Summary Deliverables Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
              <Layers3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Deliverables Overview
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 shadow-xs whitespace-nowrap">
                  {totalDeliverables} Total Deliverables
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Actual quantity of deliverables produced by category (distinct from task count)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#1a66c2]" />
              <span>Deliverables Quantity</span>
            </span>
          </div>
        </div>

        {/* Content: 7 Category Vertical Bar Columns */}
        {totalDeliverables === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs text-slate-400 font-medium">No deliverables recorded yet.</p>
            {onAddWorkClick && (
              <button
                type="button"
                onClick={onAddWorkClick}
                className="mt-2 text-xs text-[#1a66c2] dark:text-sky-400 font-bold hover:underline cursor-pointer"
              >
                + Add Today's Work
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 my-2 w-full min-w-0">
            {CATEGORIES.map((cat, idx) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const delivCount = breakdown[cat].deliverables;
              const taskCount = breakdown[cat].completed;
              const pct = Math.max(8, Math.round((delivCount / maxDeliverable) * 100));
              const sharePct = totalDeliverables > 0 ? Math.round((delivCount / totalDeliverables) * 100) : 0;

              return (
                <div
                  key={cat}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                >
                  {/* Category Top Info */}
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`p-1 rounded-md ${meta.bg} ${meta.color} shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {cat}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {sharePct}%
                    </span>
                  </div>

                  {/* Vertical Bar Meter */}
                  <div className="py-2 flex items-end justify-center h-24 sm:h-28">
                    <div className="w-9 sm:w-11 bg-slate-200/70 dark:bg-slate-700/60 rounded-lg h-full flex items-end p-0.5 overflow-hidden">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: isInView ? `${pct}%` : '0%' }}
                        transition={{ duration: 0.65, delay: isInView ? idx * 0.04 : 0, ease: [0.16, 1, 0.3, 1] }}
                        style={{ backgroundColor: meta.hex }}
                        className="w-full rounded-md transition-opacity duration-300 group-hover:opacity-90 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                      >
                        {delivCount > 0 && delivCount}
                      </motion.div>
                    </div>
                  </div>

                  {/* Quantity & Task stats */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {delivCount}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      from {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-4">
        <span>Completed Deliverables breakdown across all 7 production categories</span>
        <span className="font-bold text-[#1a66c2] dark:text-sky-400">
          {totalDeliverables} Total Units ({totalTasks} Tasks)
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// DEFAULT COMPOSITE COMPONENT (For backward compatibility if needed)
// =========================================================================
export interface DashboardChartsProps {
  userLogs: WorkLog[];
  activePeriod: 'today' | 'week' | 'month' | 'year';
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void;
  onAddWorkClick: () => void;
  theme?: 'light' | 'dark';
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  userLogs,
  activePeriod,
  onPeriodChange,
  onAddWorkClick,
  theme,
}) => {
  return (
    <div className="space-y-6">
      <ProductionTrendCard
        userLogs={userLogs}
        activePeriod={activePeriod}
        onPeriodChange={onPeriodChange}
        onAddWorkClick={onAddWorkClick}
        theme={theme}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <CompletedWorkByTitleCard
          userLogs={userLogs}
          onAddWorkClick={onAddWorkClick}
          theme={theme}
        />
        <CompletedWorkByTypeCard
          userLogs={userLogs}
          onAddWorkClick={onAddWorkClick}
          theme={theme}
        />
      </div>
      <DeliverablesOverviewCard
        userLogs={userLogs}
        onAddWorkClick={onAddWorkClick}
        theme={theme}
      />
    </div>
  );
};

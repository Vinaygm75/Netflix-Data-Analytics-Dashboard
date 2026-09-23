import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';
import { ScrollReveal, useInViewObserver } from './ScrollReveal';
import { User, WorkLog, TaskType } from '../types';
import {
  isWithinPeriod,
  getLogDate,
  getLogTask,
  isLogCompleted,
  getTrendData,
  getStatusSummary,
  getTaskBreakdown,
} from '../utils/kpi';
import {
  CATEGORY_META,
  CATEGORIES,
} from './DashboardCharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers3,
  Layers,
  Award,
} from 'lucide-react';

interface KPIDashboardProps {
  user: User;
  workLogs: WorkLog[];
  theme?: 'light' | 'dark';
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ user, workLogs }) => {
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Filter logs for this employee strictly (or all logs if admin)
  const userLogs =
    user.role === 'ADMIN'
      ? workLogs
      : workLogs.filter(
          (l) =>
            l.employeeId === user.id ||
            (l.employeeEmail && l.employeeEmail.toLowerCase() === user.email.toLowerCase())
        );

  // Period logs
  const periodLogs = userLogs.filter((l) => isWithinPeriod(getLogDate(l), activePeriod));
  const completedPeriodLogs = periodLogs.filter(isLogCompleted);

  // 1. TOP KPI CARDS: 7 PRODUCTION CATEGORIES
  const breakdown = getTaskBreakdown(userLogs, activePeriod);

  // 2. PRODUCTION TREND (LINE CHART)
  const trendData = getTrendData(userLogs, activePeriod);
  const maxTrend = Math.max(1, ...trendData.map((d) => d.completed));

  const svgWidth = 680;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 35;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const trendPoints = trendData.map((d, idx) => {
    const x =
      trendData.length > 1
        ? padLeft + (idx / (trendData.length - 1)) * chartW
        : padLeft + chartW / 2;
    const y = padTop + chartH - (d.completed / maxTrend) * chartH;
    return { ...d, x, y };
  });

  const trendPath = trendPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const trendArea =
    trendPoints.length > 0
      ? `${trendPath} L ${trendPoints[trendPoints.length - 1].x} ${
          svgHeight - padBottom
        } L ${trendPoints[0].x} ${svgHeight - padBottom} Z`
      : '';

  // 3. COMPLETED WORK BY TYPE (DONUT CHART)
  const totalCompletedInPeriod = completedPeriodLogs.length;
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedPercent = 0;
  const donutSegments = CATEGORIES.map((cat) => {
    const count = breakdown[cat].completed;
    const percent = totalCompletedInPeriod > 0 ? (count / totalCompletedInPeriod) * 100 : 0;
    const strokeDash = (percent / 100) * donutCircumference;
    const strokeOffset = -((accumulatedPercent / 100) * donutCircumference);
    accumulatedPercent += percent;

    return {
      category: cat,
      count,
      percent: Math.round(percent),
      meta: CATEGORY_META[cat],
      strokeDash: `${strokeDash} ${donutCircumference}`,
      strokeOffset,
    };
  });

  // 4. DELIVERABLES TREND / COMPARISON
  const totalDeliverablesInPeriod = CATEGORIES.reduce(
    (acc, cat) => acc + breakdown[cat].deliverables,
    0
  );
  const maxDeliverablesInCat = Math.max(
    1,
    ...CATEGORIES.map((cat) => breakdown[cat].deliverables)
  );

  // 5. STATUS DISTRIBUTION
  const status = getStatusSummary(userLogs, activePeriod);

  const periodLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Global Period Selector */}
      <ScrollReveal distance={30} duration={600}>
        <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-300 text-[11px] font-semibold tracking-wide border border-blue-500/20 dark:border-sky-500/30 mb-2 shadow-xs">
              <Award className="w-3.5 h-3.5" />
              <span>Flying Whales Performance Audit</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              KPI & Performance
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Production output, category efficiency, and deliverable metrics for {user.name}
            </p>
          </div>

          {/* Period Selector */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 self-start sm:self-auto shadow-xs max-w-full overflow-x-auto no-scrollbar">
            {(['today', 'week', 'month', 'year'] as const).map((period) => {
              const isActive = activePeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  id={`kpi-period-btn-${period}`}
                  onClick={() => setActivePeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'liquid-btn-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {periodLabels[period]}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* ========================================================
          TOP KPI CARDS: 7 PRODUCTION CATEGORIES
          All 7 cards in ONE single row on desktop/laptop:
          Videos | Shorts | Reels | Photos | Thumbnail | Shootings | Others
          Responsive: 4 + 3 on tablet, 2 cols on mobile
          ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Completed Works by Category ({periodLabels[activePeriod]})
          </h3>
          <span className="text-xs text-slate-400">
            {totalCompletedInPeriod} total completed tasks
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 w-full [grid-template-columns:repeat(2,minmax(0,1fr))] sm:[grid-template-columns:repeat(4,minmax(0,1fr))] lg:[grid-template-columns:repeat(7,minmax(0,1fr))]">
          {CATEGORIES.map((cat, idx) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const completedCount = breakdown[cat].completed;
            const deliverablesCount = breakdown[cat].deliverables;

            return (
              <ScrollReveal
                key={cat}
                distance={30}
                duration={600}
                delay={idx * 60}
                className="h-full"
              >
                <div
                  className="liquid-glass-tile rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-all group min-w-0 h-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`p-1.5 rounded-xl ${meta.bg} ${meta.color} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 capitalize truncate backdrop-blur-md">
                      {periodLabels[activePeriod]}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate" title={cat}>
                      {cat}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                      <AnimatedNumber value={completedCount} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="truncate">Deliverables:</span>
                    <span className="font-bold text-[#1a66c2] dark:text-sky-400 shrink-0 ml-1">
                      <AnimatedNumber value={deliverablesCount} />
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          CHARTS ROW 1:
          LEFT: Production Trend (Line Chart)
          RIGHT: Completed Work by Type (Donut Chart)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 1. Production Trend (Line Chart) */}
        <ScrollReveal distance={30} duration={600} delay={0} className="h-full">
          <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Production Trend
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Production movement over time ({periodLabels[activePeriod]})
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 shadow-xs">
                {totalCompletedInPeriod} Completed
              </span>
            </div>

            {/* Line Chart */}
            <div className="relative pt-2 pb-1 overflow-hidden min-h-[190px] flex items-center">
              {periodLogs.length === 0 ? (
                <div className="w-full py-10 text-center text-xs text-slate-400 font-medium">
                  No verified records for this period.
                </div>
              ) : (
                <div className="w-full">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-48 sm:h-52 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="kpiTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a66c2" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#1a66c2" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 0.5, 1].map((ratio, i) => {
                      const y = padTop + chartH * (1 - ratio);
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
                            className="text-[10px] fill-slate-400 dark:fill-slate-500"
                          >
                            {Math.round(maxTrend * ratio)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area fill */}
                    {trendArea && (
                      <motion.path
                        d={trendArea}
                        fill="url(#kpiTrendGradient)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    )}

                    {/* Primary Blue Line */}
                    {trendPath && (
                      <motion.path
                        d={trendPath}
                        fill="none"
                        stroke="#1a66c2"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}

                    {/* Points */}
                    {trendPoints.map((pt, idx) => {
                      const isHovered = hoveredPointIdx === idx;
                      return (
                        <motion.g
                          key={idx}
                          className="cursor-pointer"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.15 + idx * 0.04 }}
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
                            r={isHovered ? '6' : '3.5'}
                            fill="#FFFFFF"
                            stroke="#1a66c2"
                            strokeWidth={isHovered ? '3' : '2'}
                          />
                          <text
                            x={pt.x}
                            y={svgHeight - 12}
                            textAnchor="middle"
                            className={`text-[10px] ${
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
                  {hoveredPointIdx !== null && trendPoints[hoveredPointIdx] && (
                    <div
                      className="absolute pointer-events-none z-20 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs shadow-xl border border-slate-700/80 -translate-x-1/2 -translate-y-full"
                      style={{
                        left: `${(trendPoints[hoveredPointIdx].x / svgWidth) * 100}%`,
                        top: `${(trendPoints[hoveredPointIdx].y / svgHeight) * 100}%`,
                      }}
                    >
                      <div className="font-bold text-[11px] text-sky-300">
                        {trendPoints[hoveredPointIdx].label}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        {trendPoints[hoveredPointIdx].completed} completed tasks
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
            <span>Movement strictly mapped to verified completion dates</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {totalCompletedInPeriod} Completed
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Completed Work by Type (Donut Chart) */}
      <ScrollReveal distance={30} duration={600} delay={60} className="h-full">
        <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Completed Work by Type
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Category distribution of finished tasks
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-white/60 dark:border-white/10 backdrop-blur-md">
                {totalCompletedInPeriod} Tasks
              </span>
            </div>

            {/* Donut Chart */}
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

                  {donutSegments
                    .filter((seg) => seg.count > 0)
                    .map((seg) => (
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
                        animate={{ strokeDashoffset: seg.strokeOffset }}
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
                    <AnimatedNumber value={totalCompletedInPeriod} />
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Tasks</span>
                </div>
              </div>

              {/* Breakdown Legend */}
              <div className="grid grid-cols-2 gap-2 w-full mt-4">
                {donutSegments.map((item) => (
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

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
            <span>6 standard categories</span>
            <span className="font-bold text-[#1a66c2] dark:text-sky-400">
              {totalCompletedInPeriod} Finished
            </span>
          </div>
        </div>
      </ScrollReveal>
    </div>

      {/* ========================================================
          CHARTS ROW 2:
          LEFT: Deliverables Trend / Comparison
          RIGHT: Status Distribution
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 3. Deliverables Trend / Comparison (Bar Chart) */}
        <ScrollReveal distance={30} duration={600} delay={0} className="h-full">
          <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                  <Layers3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Deliverables Trend & Comparison
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Deliverables count comparison across all categories
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 shadow-xs">
                {totalDeliverablesInPeriod} Deliverables
              </span>
            </div>

            {/* Comparison Bars */}
            <div className="space-y-3.5 my-2">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                const delivCount = breakdown[cat].deliverables;
                const taskCount = breakdown[cat].completed;
                const pct = Math.max(6, Math.round((delivCount / maxDeliverablesInCat) * 100));

                return (
                  <div key={cat} className="space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded-md ${meta.bg} ${meta.color} shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {cat}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1a66c2] dark:text-sky-400">
                          {delivCount} units
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({taskCount} tasks)
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200/50 dark:bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        style={{ backgroundColor: meta.hex }}
                        className="h-full rounded-full transition-opacity duration-300 group-hover:opacity-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
            <span>Measured from verified quantity field</span>
            <span className="font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={totalDeliverablesInPeriod} /> Total Units
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* 4. Status Distribution (Completed vs In Progress vs Pending) */}
      <ScrollReveal distance={30} duration={600} delay={60} className="h-full">
        <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Status Distribution
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Completed vs In Progress vs Pending ({periodLabels[activePeriod]})
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-white/60 dark:border-white/10 backdrop-blur-md">
                <AnimatedNumber value={status.total} /> Total
              </span>
            </div>

            {/* Visual Status Progress Breakdown */}
            <div className="my-3 space-y-4">
              {/* Stacked multi-status bar */}
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${status.completedPercent}%` }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-emerald-500 h-full"
                  title={`Completed: ${status.completed} (${status.completedPercent}%)`}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${status.inProgressPercent}%` }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-amber-500 h-full"
                  title={`In Progress: ${status.inProgress} (${status.inProgressPercent}%)`}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${status.pendingPercent}%` }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-slate-400 dark:bg-slate-600 h-full"
                  title={`Pending: ${status.pending} (${status.pendingPercent}%)`}
                />
              </div>

              {/* Status Metric Cards */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {/* Completed */}
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Completed</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    <AnimatedNumber value={status.completed} />
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    <AnimatedNumber value={status.completedPercent} />% of total
                  </div>
                </div>

                {/* In Progress */}
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">In Progress</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    <AnimatedNumber value={status.inProgress} />
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    <AnimatedNumber value={status.inProgressPercent} />% of total
                  </div>
                </div>

                {/* Pending */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Pending</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    <AnimatedNumber value={status.pending} />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    <AnimatedNumber value={status.pendingPercent} />% of total
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
            <span>Overall completion rate</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              <AnimatedNumber value={status.completedPercent} />% Finished
            </span>
          </div>
        </div>
      </ScrollReveal>
    </div>
    </div>
  );
};

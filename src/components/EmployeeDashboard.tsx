import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, WorkLog, Note } from '../types';
import {
  getLogDate,
  getLogTask,
  isLogCompleted,
  isWithinPeriod,
  isToday,
  isWithinDateRange,
} from '../utils/kpi';
import {
  ProductionTrendCard,
  CompletedWorkByTitleCard,
  CompletedWorkByTypeCard,
  DeliverablesOverviewCard,
  CATEGORY_META,
} from './DashboardCharts';
import { ScrollReveal } from './ScrollReveal';
import {
  Plus,
  Calendar,
  ArrowUpRight,
  Film,
  TrendingUp,
  StickyNote,
  CalendarCheck,
  User as UserIcon,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Layers,
  Laptop,
} from 'lucide-react';

interface EmployeeDashboardProps {
  user: User;
  workLogs: WorkLog[];
  notes: Note[];
  authenticatedEmployees?: User[];
  onOpenAddWork: () => void;
  onOpenAddNote: () => void;
  onViewAllWork: () => void;
  onViewAllNotes: () => void;
  onViewKPI: () => void;
  onToggleNoteStatus: (note: Note) => void;
  theme?: 'light' | 'dark';
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  user,
  workLogs,
  authenticatedEmployees = [],
  onOpenAddWork,
  onOpenAddNote,
  onViewAllWork,
  onViewKPI,
  theme,
}) => {
  // Chart period state for trend line
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Period filter state: 'month' (default), 'today', 'week', 'year', 'custom'
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');

  // Custom date range state
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // macOS Activity presence state (shows employee's own active computer working time)
  const [myActivity, setMyActivity] = useState<{
    device: any;
    currentState: string;
    todayActiveFormatted: string;
    todayActiveSeconds: number;
    weeklyActiveFormatted: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMyActivity = async () => {
      try {
        const savedToken = localStorage.getItem('studio_auth_token') || '';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (savedToken) {
          headers['Authorization'] = `Bearer ${savedToken}`;
        }
        const res = await fetch('/api/presence/my-activity', {
          headers,
          credentials: 'include',
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setMyActivity(data);
        }
      } catch (err) {
        // non-blocking
      }
    };
    loadMyActivity();
    const interval = setInterval(loadMyActivity, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Dynamic greeting based on current local hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Formatted date: e.g. "Friday, September 11, 2026"
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  // Strict isolation: calculate employee's own logs using authoritative identity (user.id / user.email)
  const employeeOwnLogs = useMemo(() => {
    const userCleanId = String(user?.id || '').trim().toLowerCase();
    const userCleanEmail = String(user?.email || '').trim().toLowerCase();
    return (workLogs || []).filter((l) => {
      const logEmpId = String(l.employeeId || '').trim().toLowerCase();
      const logEmpEmail = String(l.employeeEmail || '').trim().toLowerCase();
      return (
        (logEmpId && userCleanId && logEmpId === userCleanId) ||
        (logEmpEmail && userCleanEmail && logEmpEmail === userCleanEmail)
      );
    });
  }, [workLogs, user?.id, user?.email]);

  // Combined Filtering: Period filter applied strictly to employee's own verified logs
  const filteredLogs = useMemo(() => {
    let logs = employeeOwnLogs;

    // Period filter
    if (periodFilter === 'today') {
      logs = logs.filter((l) => isToday(getLogDate(l)));
    } else if (periodFilter === 'week') {
      logs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'week'));
    } else if (periodFilter === 'month') {
      logs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'month'));
    } else if (periodFilter === 'year') {
      logs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'year'));
    } else if (periodFilter === 'custom') {
      logs = logs.filter((l) => isWithinDateRange(getLogDate(l), customStartDate, customEndDate));
    }

    return logs;
  }, [employeeOwnLogs, periodFilter, customStartDate, customEndDate]);

  // Sync chartPeriod when periodFilter is not custom
  const handlePeriodChange = (newPeriod: 'today' | 'week' | 'month' | 'year' | 'custom') => {
    setPeriodFilter(newPeriod);
    if (newPeriod !== 'custom') {
      setChartPeriod(newPeriod);
    }
  };

  // Recent verified work logs from filtered dataset
  const recentLogs = useMemo(() => {
    return [...filteredLogs]
      .sort((a, b) => new Date(getLogDate(b)).getTime() - new Date(getLogDate(a)).getTime())
      .slice(0, 6);
  }, [filteredLogs]);

  // Dynamic KPI calculations for filtered data
  const totalCompleted = filteredLogs.filter(isLogCompleted).length;
  const totalInProgress = filteredLogs.filter((l) => l.status === 'In Progress').length;
  const totalPending = filteredLogs.filter((l) => l.status === 'Pending' && !isLogCompleted(l)).length;
  const totalDeliverables = filteredLogs.reduce((acc, l) => acc + (Number(l.quantity) || 1), 0);
  const completionRate = filteredLogs.length > 0 ? Math.round((totalCompleted / filteredLogs.length) * 100) : 0;

  // Reset filters helper
  const isFiltered = periodFilter !== 'month';
  const handleResetFilters = () => {
    setPeriodFilter('month');
    setChartPeriod('month');
  };

  return (
    <div className="space-y-6 pb-14">
      {/* ========================================================
          1. WIDE HORIZONTAL SECTION: GREETING / SUMMARY / ACTIONS
          ======================================================== */}
      <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-300 text-[11px] font-semibold tracking-wide border border-blue-500/20 dark:border-sky-500/30 mb-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a66c2] dark:bg-sky-400" />
            <span>Flying Whales Ad Films Production Studio</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {greeting}, <span className="text-[#1a66c2] dark:text-sky-400">{user.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>{todayFormatted}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Real-time production workspace</span>
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            id="dashboard-action-add-work"
            type="button"
            onClick={onOpenAddWork}
            className="px-4 py-2.5 rounded-xl liquid-btn-primary text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Today's Work</span>
          </button>

          <button
            id="dashboard-action-view-work"
            type="button"
            onClick={onViewAllWork}
            className="px-3.5 py-2.5 rounded-xl liquid-btn-secondary text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Film className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>View Daily Work</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </button>

          <button
            id="dashboard-action-view-kpi"
            type="button"
            onClick={onViewKPI}
            className="px-3.5 py-2.5 rounded-xl liquid-btn-secondary text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>View KPI</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </button>

          <button
            id="dashboard-action-add-note"
            type="button"
            onClick={onOpenAddNote}
            className="px-3.5 py-2.5 rounded-xl liquid-btn-secondary text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <StickyNote className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
            <span>+ Note</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. DASHBOARD FILTER BAR: EMPLOYEE & PERIOD FILTERS
          Features 1, 2, 3: Employee Filter + Period Filter + Reset
          ======================================================== */}
      <ScrollReveal distance={20} duration={500}>
        <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm w-full min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
                <Filter className="w-4 h-4 text-[#1a66c2] dark:text-sky-400 shrink-0" />
                <span>Filters:</span>
              </div>

              {/* Feature 1: Employee Workspace Indicator */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Employee:
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-700 shadow-xs">
                  <UserIcon className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400 shrink-0" />
                  <span className="truncate">{user.name}</span>
                </div>
              </div>

              {/* Feature 2: Period Filter Dropdown */}
              <div className="flex items-center gap-1.5 min-w-0">
                <label htmlFor="dashboard-period-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Period:
                </label>
                <div className="relative inline-block max-w-full">
                  <select
                    id="dashboard-period-filter"
                    value={periodFilter}
                    onChange={(e) => handlePeriodChange(e.target.value as any)}
                    className="pl-8 pr-8 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-[#1a66c2]/40 outline-none cursor-pointer appearance-none transition-all max-w-[170px] sm:max-w-xs"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Custom Date Range Selectors */}
              {periodFilter === 'custom' && (
                <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">From:</span>
                    <input
                      id="custom-start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">To:</span>
                    <input
                      id="custom-end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Reset Filters button if active */}
              {isFiltered && (
                <button
                  type="button"
                  id="dashboard-reset-filters-btn"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Reset all filters to default"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Filtered Count & Active Filter Indicator */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                Showing <strong>{filteredLogs.length}</strong> record{filteredLogs.length === 1 ? '' : 's'} (
                <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong> •{' '}
                <strong className="text-slate-800 dark:text-slate-200 capitalize">
                  {periodFilter === 'custom' ? `${customStartDate} to ${customEndDate}` : periodFilter}
                </strong>
                )
              </span>
            </div>
          </div>

          {/* KPI Snapshot Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full min-w-0">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Work Logs</span>
                <Layers className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                {filteredLogs.length}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Completed Tasks</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-900 dark:text-emerald-200 mt-1 flex items-baseline gap-1.5">
                <span>{totalCompleted}</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ({completionRate}%)
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-900/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-sky-700 dark:text-sky-400">In Progress</span>
                <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-sky-900 dark:text-sky-200 mt-1">
                {totalInProgress}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Total Deliverables</span>
                <Film className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-200 mt-1">
                {totalDeliverables} <span className="text-[11px] font-normal text-slate-400">units</span>
              </div>
            </div>
          </div>

          {/* Feature: Verified Mac Activity Presence Indicator */}
          {myActivity && (
            <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {myActivity.device ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{myActivity.device.deviceModel}</span>
                        {myActivity.currentState === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Now
                          </span>
                        ) : myActivity.device.lastSeenAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                            {myActivity.currentState}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10">
                            Never Connected
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {myActivity.device.id} • macOS Activity Agent
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Active Time Today</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {myActivity.device.lastSeenAt ? (myActivity.todayActiveFormatted || '00h 00m') : '—'}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">This Week</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {myActivity.device.lastSeenAt ? (myActivity.weeklyActiveFormatted || '00h 00m') : '—'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2.5 text-slate-400 text-[11px] py-1">
                  <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>No registered Mac device paired to your account yet. Contact Admin to pair your Apple Silicon Mac.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* ========================================================
          3. MIDDLE — TWO COLUMN LAYOUT
          LEFT: Production Trend (LINE CHART)
          RIGHT: Completed Work by Title (BAR CHART)
          Both charts strictly use filteredLogs!
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch w-full min-w-0">
        <ScrollReveal distance={30} duration={600} delay={0} className="h-full w-full min-w-0">
          <ProductionTrendCard
            userLogs={filteredLogs}
            activePeriod={chartPeriod}
            onPeriodChange={setChartPeriod}
            onAddWorkClick={onOpenAddWork}
            theme={theme}
          />
        </ScrollReveal>
        <ScrollReveal distance={30} duration={600} delay={60} className="h-full w-full min-w-0">
          <CompletedWorkByTitleCard
            userLogs={filteredLogs}
            onAddWorkClick={onOpenAddWork}
            theme={theme}
          />
        </ScrollReveal>
      </div>

      {/* ========================================================
          4. LOWER — TWO COLUMN LAYOUT
          LEFT: Recent Work / Recent Activity (CLEAN LIST/TABLE)
          RIGHT: Completed Work by Type (DONUT CHART)
          Both strictly use filteredLogs!
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch w-full min-w-0">
        {/* LEFT: Recent Work / Activity Card */}
        <ScrollReveal distance={30} duration={600} delay={0} className="h-full w-full min-w-0">
          <div className="liquid-glass-card rounded-2xl p-4 sm:p-6 flex flex-col justify-between h-full w-full min-w-0">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 w-full min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      Recent Work
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Latest verified tasks and production activity for selection
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="view-all-work-btn"
                  onClick={onViewAllWork}
                  className="text-xs font-semibold text-[#1a66c2] dark:text-sky-400 hover:text-[#1555a3] dark:hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <span>View All</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* List / Table Content */}
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Film className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    No work records match the selected filters.
                  </p>
                  {isFiltered ? (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 text-xs text-[#1a66c2] dark:text-sky-400 font-bold hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenAddWork}
                      className="mt-3 text-xs text-[#1a66c2] dark:text-sky-400 font-bold hover:underline cursor-pointer"
                    >
                      + Add your first task
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-2.5 pl-1">Task</th>
                        <th className="pb-2.5">Title</th>
                        <th className="pb-2.5">Employee</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5 hidden sm:table-cell">Date</th>
                        <th className="pb-2.5 text-right pr-1">Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {recentLogs.slice(0, 5).map((log, index) => {
                        const taskName = getLogTask(log);
                        const meta = CATEGORY_META[taskName] || CATEGORY_META.Others;
                        const Icon = meta.icon;
                        const isDone = isLogCompleted(log);
                        const logTitle = log.title || log.taskDetails || log.videoTitle || 'Untitled Task';
                        const logDate = log.date || log.requestedDate || '—';
                        const qty = typeof log.quantity === 'number' && log.quantity > 0 ? log.quantity : 1;
                        const empName = log.employeeName || log.employeeEmail || 'Employee';

                        return (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.1 + index * 0.045, ease: 'easeOut' }}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Task Badge */}
                            <td className="py-2.5 pl-1 pr-2">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${meta.bg} ${meta.color} font-semibold text-[11px]`}>
                                <Icon className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[65px]">{taskName}</span>
                              </span>
                            </td>

                            {/* Title */}
                            <td
                              className="py-2.5 pr-2 font-medium text-slate-900 dark:text-white max-w-[120px] sm:max-w-[160px] truncate"
                              title={logTitle}
                            >
                              {logTitle}
                            </td>

                            {/* Employee */}
                            <td className="py-2.5 pr-2 text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3 text-[#1a66c2] dark:text-sky-400 shrink-0" />
                                <span className="truncate">{empName}</span>
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 pr-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDone
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800'
                                    : log.status === 'In Progress'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isDone
                                      ? 'bg-emerald-500'
                                      : log.status === 'In Progress'
                                      ? 'bg-amber-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                <span className="hidden sm:inline">{log.status || (isDone ? 'Completed' : 'Pending')}</span>
                                <span className="sm:hidden">{isDone ? 'Done' : 'Prog'}</span>
                              </span>
                            </td>

                            {/* Date */}
                            <td className="py-2.5 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell text-[11px]">
                              {logDate}
                            </td>

                            {/* Deliverables Quantity */}
                            <td className="py-2.5 pr-1 text-right font-bold text-slate-900 dark:text-white">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#1a66c2] dark:text-sky-400 font-bold text-[11px]">
                                {qty}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-4">
              <span>{filteredLogs.length} total entries filtered</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {totalCompleted} Completed
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* RIGHT: Completed Work by Type (DONUT CHART) */}
        <ScrollReveal distance={30} duration={600} delay={60} className="h-full w-full min-w-0">
          <CompletedWorkByTypeCard
            userLogs={filteredLogs}
            onAddWorkClick={onOpenAddWork}
            theme={theme}
          />
        </ScrollReveal>
      </div>

      {/* ========================================================
          5. BOTTOM WIDE SECTION: DELIVERABLES OVERVIEW
          BAR CHART showing actual deliverables by Task type
          Strictly uses filteredLogs!
          ======================================================== */}
      <ScrollReveal distance={30} duration={600} className="w-full min-w-0">
        <DeliverablesOverviewCard
          userLogs={filteredLogs}
          onAddWorkClick={onOpenAddWork}
          theme={theme}
        />
      </ScrollReveal>
    </div>
  );
};

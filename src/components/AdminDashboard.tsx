import React, { useState, useMemo } from 'react';
import { ScrollReveal } from './ScrollReveal';
import { User, WorkLog, TaskType } from '../types';
import {
  isToday,
  isWithinPeriod,
  calculateWeeklyKPI,
  calculateMonthlyKPI,
  calculateYearlyKPI,
  calculateScoreFromLogs,
  isLogCompleted,
  getLogTask,
} from '../utils/kpi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  X,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award,
  BarChart3,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  employees: User[];
  workLogs: WorkLog[];
  darkMode?: boolean;
  onNavigateTab: (tab: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  employees,
  workLogs,
  darkMode = false,
  onNavigateTab,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [employeeDetailPeriod, setEmployeeDetailPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  // Employee filter for Production by Task Type
  const [taskTypeEmployeeId, setTaskTypeEmployeeId] = useState<string>('all');

  // Metrics across entire team
  const totalEmployeesCount = employees.length;

  const todayLogs = workLogs.filter((l) => isToday(l.date));
  const completedToday = todayLogs.filter((l) => l.status === 'Completed').length;
  const inProgressToday = todayLogs.filter((l) => l.status === 'In Progress').length;
  const pendingToday = todayLogs.filter((l) => l.status === 'Pending').length;

  const weekLogs = workLogs.filter((l) => isWithinPeriod(l.date, 'week'));
  const completedWeek = weekLogs.filter((l) => l.status === 'Completed').length;

  const monthLogs = workLogs.filter((l) => isWithinPeriod(l.date, 'month'));
  const completedMonth = monthLogs.filter((l) => l.status === 'Completed').length;

  // Team average KPI
  const teamScore = calculateScoreFromLogs(monthLogs);
  const teamKPI = teamScore.kpiScore;

  // Detail drilldown logs for selected employee
  const selectedEmpLogs = selectedEmployee
    ? workLogs.filter((l) => {
        if (l.employeeId !== selectedEmployee.id) return false;
        if (employeeDetailPeriod === 'today') return isToday(l.date);
        if (employeeDetailPeriod === 'week') return isWithinPeriod(l.date, 'week');
        if (employeeDetailPeriod === 'month') return isWithinPeriod(l.date, 'month');
        if (employeeDetailPeriod === 'year') return isWithinPeriod(l.date, 'year');
        return true;
      })
    : [];

  // -------------------------------------------------------------
  // REAL DATA AGGREGATIONS FOR THE 2 CHARTS
  // -------------------------------------------------------------
  const completedLogs = workLogs.filter(isLogCompleted);

  // 1. Chart 1 — Production by Employee
  // Group real completed tasks by employee
  const employeeStatsMap = new Map<string, { id: string; name: string; email: string; completedTasks: number }>();

  employees.forEach((emp) => {
    employeeStatsMap.set(emp.id, {
      id: emp.id,
      name: emp.name || emp.email.split('@')[0],
      email: emp.email,
      completedTasks: 0,
    });
  });

  completedLogs.forEach((log) => {
    let matchedId = '';
    if (log.employeeId && employeeStatsMap.has(log.employeeId)) {
      matchedId = log.employeeId;
    } else {
      const cleanEmail = (log.employeeEmail || '').toLowerCase();
      const cleanName = (log.employeeName || '').toLowerCase();
      for (const [id, e] of employeeStatsMap.entries()) {
        const empObj = employees.find((emp) => emp.id === id);
        if (
          (cleanEmail && empObj && empObj.email.toLowerCase() === cleanEmail) ||
          (cleanName && e.name.toLowerCase() === cleanName)
        ) {
          matchedId = id;
          break;
        }
      }
    }

    if (matchedId) {
      employeeStatsMap.get(matchedId)!.completedTasks += 1;
    } else {
      const fallbackId = log.employeeId || `emp-${log.employeeName || log.employeeEmail || 'unknown'}`;
      const fallbackName = log.employeeName || (log.employeeEmail ? log.employeeEmail.split('@')[0] : 'Member');
      employeeStatsMap.set(fallbackId, {
        id: fallbackId,
        name: fallbackName,
        email: log.employeeEmail || '',
        completedTasks: 1,
      });
    }
  });

  const allEmployeesProduction = Array.from(employeeStatsMap.values());
  // Include all employees who have completed work. If an employee has zero completed work, handle appropriately without breaking.
  const employeeChartData = allEmployeesProduction.sort((a, b) => b.completedTasks - a.completedTasks);
  const totalCompletedByEmployees = completedLogs.length;

  // 2. Chart 2 — Production by Task Type
  // Filtered dynamically by selected employee or company-wide ('all')
  const selectedTaskTypeEmployee = useMemo(() => {
    if (taskTypeEmployeeId === 'all') return null;
    return (
      employees.find(
        (e) =>
          e.id.toLowerCase() === taskTypeEmployeeId.toLowerCase() ||
          e.email.toLowerCase() === taskTypeEmployeeId.toLowerCase()
      ) || null
    );
  }, [taskTypeEmployeeId, employees]);

  const taskTypeFilteredLogs = useMemo(() => {
    if (!selectedTaskTypeEmployee) {
      return completedLogs;
    }
    const cleanId = selectedTaskTypeEmployee.id.trim().toLowerCase();
    const cleanEmail = selectedTaskTypeEmployee.email.trim().toLowerCase();
    const cleanName = (selectedTaskTypeEmployee.name || '').trim().toLowerCase();

    return completedLogs.filter((log) => {
      const logEmpId = String(log.employeeId || '').trim().toLowerCase();
      const logEmpEmail = String(log.employeeEmail || '').trim().toLowerCase();
      const logEmpName = String(log.employeeName || '').trim().toLowerCase();

      if (cleanId && (logEmpId === cleanId || logEmpEmail === cleanId)) return true;
      if (cleanEmail && (logEmpEmail === cleanEmail || logEmpId === cleanEmail)) return true;
      if (cleanName && logEmpName && logEmpName === cleanName) return true;
      return false;
    });
  }, [completedLogs, selectedTaskTypeEmployee]);

  // Exactly: Videos, Shorts, Reels, Photos, Thumbnail, Shootings, Others
  const EXACT_TASK_CATEGORIES: TaskType[] = [
    'Videos',
    'Shorts',
    'Reels',
    'Photos',
    'Thumbnail',
    'Shootings',
    'Others',
  ];

  const taskTypeChartData = EXACT_TASK_CATEGORIES.map((cat) => {
    const count = taskTypeFilteredLogs.filter((l) => getLogTask(l) === cat).length;
    return {
      category: cat,
      completedTasks: count,
    };
  });

  const totalCompletedByTaskType = taskTypeChartData.reduce((acc, item) => acc + item.completedTasks, 0);
  const sortedTaskTypes = [...taskTypeChartData].sort((a, b) => b.completedTasks - a.completedTasks);
  const topTaskType = sortedTaskTypes[0] || { category: 'None', completedTasks: 0 };

  const renderEmployeeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-none">
          <p className="font-bold text-sky-300 text-xs mb-1">{item.name}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a66c2]" />
            <span className="text-slate-300">Completed Tasks:</span>
            <span className="font-bold text-white text-sm">{item.completedTasks}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTaskTypeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-none">
          <p className="font-bold text-sky-300 text-xs mb-1">{item.category}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a66c2]" />
            <span className="text-slate-300">Completed Tasks:</span>
            <span className="font-bold text-white text-sm">{item.completedTasks}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <ScrollReveal distance={22} duration={580}>
        <div className="liquid-glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Studio Executive Console
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Studio Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Centralized team tracking, central Google Sheets synchronization, and daily production audits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="admin-quick-nav-calendar"
              onClick={() => onNavigateTab('admin-calendar')}
              className="px-3.5 py-2 rounded-xl liquid-btn-secondary text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
              Attendance Calendar
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('admin-team-work')}
              className="px-3.5 py-2 rounded-xl liquid-btn-primary text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Review Team Work
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('admin-performance')}
              className="px-3.5 py-2 rounded-xl liquid-btn-secondary text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              Employee of Month
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL EMPLOYEES */}
        <ScrollReveal distance={30} duration={600} delay={0} className="h-full">
          <div className="liquid-glass-card p-5 rounded-2xl h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Total Employees
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {totalEmployeesCount}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">active members</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Video editors, shooters & motion designers
            </p>
          </div>
        </ScrollReveal>

        {/* TODAY'S TEAM WORK */}
        <ScrollReveal distance={30} duration={600} delay={60} className="h-full">
          <div className="liquid-glass-card p-5 rounded-2xl h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Today&apos;s Team Work
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {todayLogs.length}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">tasks logged</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{completedToday} done</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{inProgressToday} in prog</span>
              <span>•</span>
              <span>{pendingToday} pend</span>
            </div>
          </div>
        </ScrollReveal>

        {/* THIS WEEK / THIS MONTH */}
        <ScrollReveal distance={30} duration={600} delay={120} className="h-full">
          <div className="liquid-glass-card p-5 rounded-2xl h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                This Week / Month
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                {completedWeek}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">week completed</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">{completedMonth}</strong> completed this month
            </p>
          </div>
        </ScrollReveal>

        {/* TEAM KPI */}
        <ScrollReveal distance={30} duration={600} delay={180} className="h-full">
          <div className="liquid-glass-card p-5 rounded-2xl h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Team KPI
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {teamKPI}%
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">monthly index</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${teamKPI}%` }} />
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* 2-Column Production Analytics Charts Section */}
      <ScrollReveal distance={22} duration={580} delay={80}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Chart 1 — Production by Employee (Left) */}
          <div
            id="admin-chart-production-by-employee"
            className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0 h-full"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Production by Employee
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total completed work grouped by employee
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 shadow-xs">
                  {totalCompletedByEmployees} Tasks Done
                </span>
              </div>

              {/* Chart */}
              <div className="w-full h-64 sm:h-72 min-h-[250px] pt-2">
                {employeeChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <p className="text-xs text-slate-400 font-medium">No employee production records found.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={employeeChartData}
                      margin={{ top: 12, right: 12, left: -16, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="currentColor"
                        className="text-slate-200/70 dark:text-slate-800/80"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        tickFormatter={(val) => (val && val.length > 12 ? `${val.slice(0, 11)}…` : val)}
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        domain={[0, (dataMax: number) => Math.max(dataMax, 4)]}
                      />
                      <Tooltip
                        content={renderEmployeeTooltip}
                        cursor={{ fill: 'rgba(26, 102, 194, 0.08)' }}
                      />
                      <Bar
                        dataKey="completedTasks"
                        name="Completed Tasks"
                        fill="#1a66c2"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
              <span>
                {employeeChartData.length} {employeeChartData.length === 1 ? 'employee' : 'employees'} tracked
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {totalCompletedByEmployees} total completed
              </span>
            </div>
          </div>

          {/* Chart 2 — Production by Task Type (Right) */}
          <div
            id="admin-chart-production-by-task-type"
            className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0 h-full"
          >
            <div>
              {/* Header with Employee Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-blue-500/20 dark:border-sky-500/30 shrink-0 shadow-xs">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      Production by Task Type
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {selectedTaskTypeEmployee
                        ? `Filtered for ${selectedTaskTypeEmployee.name || selectedTaskTypeEmployee.email}`
                        : 'Company-wide completed work by task type'}
                    </p>
                  </div>
                </div>

                {/* Dynamic Employee Filter Dropdown */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <label htmlFor="admin-task-type-employee-filter" className="sr-only">
                    Filter by Employee
                  </label>
                  <div className="relative">
                    <select
                      id="admin-task-type-employee-filter"
                      value={taskTypeEmployeeId}
                      onChange={(e) => setTaskTypeEmployeeId(e.target.value)}
                      className="pl-8 pr-8 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-[#1a66c2]/40 outline-none cursor-pointer appearance-none transition-all max-w-[190px] sm:max-w-[210px] truncate"
                    >
                      <option value="all">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name || emp.email.split('@')[0]}
                        </option>
                      ))}
                    </select>
                    <UserIcon className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="w-full h-64 sm:h-72 min-h-[250px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskTypeChartData}
                    margin={{ top: 12, right: 12, left: -16, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-slate-200/70 dark:text-slate-800/80"
                    />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      domain={[0, (dataMax: number) => Math.max(dataMax, 4)]}
                    />
                    <Tooltip
                      content={renderTaskTypeTooltip}
                      cursor={{ fill: 'rgba(26, 102, 194, 0.08)' }}
                    />
                    <Bar
                      dataKey="completedTasks"
                      name="Completed Tasks"
                      fill="#1a66c2"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4">
              <span>
                Leading: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{topTaskType.category}</strong> ({topTaskType.completedTasks})
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {totalCompletedByTaskType} completed {selectedTaskTypeEmployee ? `(${selectedTaskTypeEmployee.name || selectedTaskTypeEmployee.email})` : '(team total)'}
              </span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* EMPLOYEE PERFORMANCE TABLE */}
      <ScrollReveal distance={22} duration={580} delay={100}>
        <div className="liquid-glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Employee Performance
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any team member to inspect their production logs, completed tasks, and performance history
            </p>
          </div>
          <span className="text-xs text-sky-600 font-semibold">
            {employees.length} Employees Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Today</th>
                <th className="py-3 px-4">This Week</th>
                <th className="py-3 px-4">This Month</th>
                <th className="py-3 px-4">Monthly KPI</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map((emp) => {
                const empLogs = workLogs.filter((l) => l.employeeId === emp.id);

                const todayDone = empLogs.filter((l) => isToday(l.date) && l.status === 'Completed').length;
                const todayTotal = empLogs.filter((l) => isToday(l.date)).length;

                const weekDone = empLogs.filter((l) => isWithinPeriod(l.date, 'week') && l.status === 'Completed').length;
                const weekTotal = empLogs.filter((l) => isWithinPeriod(l.date, 'week')).length;

                const monthDone = empLogs.filter((l) => isWithinPeriod(l.date, 'month') && l.status === 'Completed').length;
                const monthTotal = empLogs.filter((l) => isWithinPeriod(l.date, 'month')).length;

                const kpi = calculateMonthlyKPI(emp.id, workLogs);

                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-sky-600/10 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 leading-tight">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          emp.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">{todayDone}</strong> / {todayTotal}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">{weekDone}</strong> / {weekTotal}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">{monthDone}</strong> / {monthTotal}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sky-600 dark:text-sky-400">{kpi}%</span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-sky-600 h-full rounded-full" style={{ width: `${kpi}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-sky-600 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </ScrollReveal>

      {/* Employee Detail Drilldown Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border bg-white dark:bg-[#131D31] border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto">
            {/* Pinned Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedEmployee.email} • {selectedEmployee.role} • ID: {selectedEmployee.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* Privacy reminder */}
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800 text-[11px] text-sky-800 dark:text-sky-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Privacy Protected:</strong> You are viewing work logs and performance records. Personal notes belonging to {selectedEmployee.name} remain strictly private.
                </span>
              </div>

              {/* Drilldown Filter Periods */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-slate-500">Filter Deliverables:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
                  {(['today', 'week', 'month', 'year'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEmployeeDetailPeriod(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer whitespace-nowrap ${
                        employeeDetailPeriod === p
                          ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {p === 'today' ? 'Today' : p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logs List for selected employee */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {selectedEmpLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No work entries recorded for this period.
                  </div>
                ) : (
                  selectedEmpLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {log.thumbnail && (
                          <img
                            src={log.thumbnail}
                            alt={log.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {log.date}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              {log.category}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                log.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.status === 'In Progress'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {log.status}
                            </span>
                            {log.timeSpent && <span className="text-[10px] text-slate-400">{log.timeSpent}</span>}
                          </div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white break-words">{log.title}</p>
                          {log.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                              {log.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

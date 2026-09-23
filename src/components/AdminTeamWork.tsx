import React, { useState } from 'react';
import { User, WorkLog, WorkCategory, WorkStatus, Priority } from '../types';
import { isToday, isWithinPeriod, calculateMonthlyKPI } from '../utils/kpi';
import {
  Calendar,
  Filter,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Briefcase,
  Layers,
} from 'lucide-react';

interface AdminTeamWorkProps {
  employees: User[];
  workLogs: WorkLog[];
  darkMode: boolean;
}

export const AdminTeamWork: React.FC<AdminTeamWorkProps> = ({
  employees,
  workLogs,
  darkMode,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('today');
  const [customDate, setCustomDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Map employee IDs to names for quick lookup
  const employeeMap = new Map<string, User>();
  employees.forEach((e) => employeeMap.set(e.id, e));

  // Filtered Logs
  const filteredLogs = workLogs.filter((log) => {
    if (filterPeriod === 'today' && !isToday(log.date)) return false;
    if (filterPeriod === 'week' && !isWithinPeriod(log.date, 'week')) return false;
    if (filterPeriod === 'month' && !isWithinPeriod(log.date, 'month')) return false;
    if (filterPeriod === 'year' && !isWithinPeriod(log.date, 'year')) return false;
    if (filterPeriod === 'custom' && customDate && log.date !== customDate) return false;

    if (filterEmployeeId !== 'all' && log.employeeId !== filterEmployeeId) return false;
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterPriority !== 'all' && log.priority !== filterPriority) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const emp = employeeMap.get(log.employeeId);
      const matchTitle = log.title.toLowerCase().includes(q);
      const matchDesc = (log.description || '').toLowerCase().includes(q);
      const matchEmp = emp?.name.toLowerCase().includes(q) || false;
      const matchClient = (log.clientProject || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchEmp && !matchClient) return false;
    }

    return true;
  });

  // Calculate Quick Insights:
  // 1. Who completed most work this month?
  const monthLogs = workLogs.filter((l) => isWithinPeriod(l.date, 'month') && l.status === 'Completed');
  const employeeMonthCompletedCount: Record<string, number> = {};
  monthLogs.forEach((l) => {
    employeeMonthCompletedCount[l.employeeId] = (employeeMonthCompletedCount[l.employeeId] || 0) + 1;
  });

  let topProducer: { name: string; count: number } | null = null;
  Object.entries(employeeMonthCompletedCount).forEach(([id, count]) => {
    if (!topProducer || count > topProducer.count) {
      topProducer = { name: employeeMap.get(id)?.name || 'Employee', count };
    }
  });

  // 2. Who has highest KPI?
  let topKPIEmployee: { name: string; score: number } | null = null;
  employees.forEach((emp) => {
    const kpi = calculateMonthlyKPI(emp.id, workLogs);
    if (!topKPIEmployee || kpi > topKPIEmployee.score) {
      topKPIEmployee = { name: emp.name, score: kpi };
    }
  });

  // 3. Who has most pending work currently?
  const pendingLogs = workLogs.filter((l) => l.status === 'Pending');
  const employeePendingCount: Record<string, number> = {};
  pendingLogs.forEach((l) => {
    employeePendingCount[l.employeeId] = (employeePendingCount[l.employeeId] || 0) + 1;
  });
  let mostPending: { name: string; count: number } | null = null;
  Object.entries(employeePendingCount).forEach(([id, count]) => {
    if (!mostPending || count > mostPending.count) {
      mostPending = { name: employeeMap.get(id)?.name || 'Employee', count };
    }
  });

  return (
    <div className="space-y-6">
      {/* Quick Executive Insights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Most Completed Work (Month)
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {topProducer ? (topProducer as any).name : 'No logs yet'}
          </p>
          <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
            {topProducer ? `${(topProducer as any).count} tasks completed` : '0 tasks'}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Highest Monthly KPI
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {topKPIEmployee ? (topKPIEmployee as any).name : 'No data'}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            {topKPIEmployee ? `${(topKPIEmployee as any).score}% performance score` : '0%'}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Current Pending Tasks
          </span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {mostPending ? (mostPending as any).name : 'None'}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
            {mostPending ? `${(mostPending as any).count} pending tasks` : '0 pending'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs space-y-4">
        {/* Period Pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-sky-500" /> Period:
            </span>
            {(['today', 'week', 'month', 'year', 'all'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setFilterPeriod(period);
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filterPeriod === period
                    ? 'bg-[#1a66c2] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {period === 'today'
                  ? 'Today'
                  : period === 'week'
                  ? 'This Week'
                  : period === 'month'
                  ? 'This Month'
                  : period === 'year'
                  ? 'This Year'
                  : 'All Time'}
              </button>
            ))}

            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setFilterPeriod('custom');
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, clients, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Dropdown Filters (Employee, Category, Status, Priority) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Employee
            </label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="Video Editing">Video Editing</option>
              <option value="Video Shooting">Video Shooting</option>
              <option value="Photography">Photography</option>
              <option value="Reel">Reel</option>
              <option value="YouTube">YouTube</option>
              <option value="Social Media">Social Media</option>
              <option value="Client Work">Client Work</option>
              <option value="Internal Work">Internal Work</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Work Logs Feed */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Team Work Activity ({filteredLogs.length} deliverables)
          </h3>
          <span className="text-xs text-slate-400">
            Realtime audit log from central Google Sheet
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No team work found matching the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => {
              const emp = employeeMap.get(log.employeeId);
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-sky-50/30 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Employee header & tags */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center">
                            {emp?.name.charAt(0) || 'E'}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {emp?.name || 'Studio Employee'}
                          </span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-sky-500" />
                          {log.date}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          {log.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : log.status === 'In Progress'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.priority === 'High'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {log.priority} Priority
                        </span>
                        {log.timeSpent && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {log.timeSpent}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {log.title}
                      </h4>
                      {log.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {log.description}
                        </p>
                      )}

                      {/* Client / Project & Notes */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        {log.clientProject && (
                          <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                            <Tag className="w-3 h-3" /> {log.clientProject}
                          </span>
                        )}
                        {log.notes && <span>Internal Note: {log.notes}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

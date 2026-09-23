import React, { useState } from 'react';
import { User, WorkLog } from '../types';
import { calculateEmployeeRanking } from '../utils/kpi';
import {
  Trophy,
  Award,
  Medal,
  TrendingUp,
  CheckCircle,
  Calendar,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface AdminPerformanceProps {
  employees: User[];
  workLogs: WorkLog[];
  darkMode: boolean;
}

export const AdminPerformance: React.FC<AdminPerformanceProps> = ({
  employees,
  workLogs,
  darkMode,
}) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Calculate ranking using our central utility
  const rankings = calculateEmployeeRanking(period, employees, workLogs);
  const winner = rankings.length > 0 ? rankings[0] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner with Period Switcher */}
      <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-500/20">
            <Trophy className="w-3.5 h-3.5" />
            Studio Recognition
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Performance & Recognition
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Objective, measurable performance ranking based on deliverables, completion rate, and priority weight
          </p>
        </div>

        {/* Period Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                period === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Winner Spotlight Card */}
      {winner ? (
        <div className="p-6 rounded-3xl border border-amber-300/40 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/20 dark:via-[#131D31] dark:to-[#131D31] bg-white dark:bg-[#131D31] relative overflow-hidden transition-all shadow-xs">
          {/* Background decorative glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  {period === 'week'
                    ? 'Top Contributor of the Week'
                    : period === 'month'
                    ? 'Employee of the Month'
                    : 'Studio MVP of the Year'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-1">
                  {winner.employeeName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {winner.employeeEmail || 'Studio Team'} • {winner.role}
                </p>
              </div>
            </div>

            {/* Metrics pills */}
            <div className="grid grid-cols-3 gap-3 bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-amber-200/60 dark:border-slate-700 backdrop-blur-xs">
              <div className="text-center px-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                  Ranking Score
                </span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {winner.rankingScore}
                </span>
              </div>
              <div className="text-center px-2 border-x border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                  Completed
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {winner.completedTasks}
                </span>
              </div>
              <div className="text-center px-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                  KPI Score
                </span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {winner.kpiScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Leaderboard Table / Rankings */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Studio Team Ranking ({period})</span>
          </h3>
          <span className="text-xs text-slate-400">
            Ranked by weighted output & completion speed
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rankings.map((item, idx) => {
            const isTop = idx === 0;
            return (
              <div
                key={item.employeeId}
                className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                  isTop
                    ? darkMode
                      ? 'bg-amber-950/10 hover:bg-amber-950/20'
                      : 'bg-amber-50/30 hover:bg-amber-50/50'
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Left: Position badge & User info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.employeeName}
                      </h4>
                      {isTop && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold uppercase tracking-wider">
                          Leader
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {item.completedTasks} completed of {item.totalTasks} tasks • {item.activeDays} work days logged
                    </p>
                  </div>
                </div>

                {/* Right: Scores & Progress Bar */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:block w-28">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
                      <span>Completion</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full"
                        style={{ width: `${item.completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {item.kpiScore}% KPI
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                      Score: {item.rankingScore} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transparent Evaluation Methodology Explanation */}
      <div
        className={`p-4 rounded-2xl border text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-sky-50/60 border-sky-100'
        }`}
      >
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            Fair & Transparent Ranking Engine
          </p>
          <p className="text-[11px] leading-relaxed">
            The ranking system awards points based directly on authenticated work records: 10 points per completed task (with multipliers for High priority: ×1.25, Low: ×0.85), 5 points per in-progress task, plus a bonus proportional to completion rate and active consistency.
          </p>
        </div>
      </div>
    </div>
  );
};

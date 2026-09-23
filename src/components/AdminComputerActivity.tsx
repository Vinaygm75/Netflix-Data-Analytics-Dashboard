import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  ComputerEmployeeOverview,
  ComputerDevice,
  ComputerActivityState,
  ComputerActivityInterval,
  INACTIVITY_THRESHOLD_SECONDS,
  HEARTBEAT_INTERVAL_SECONDS,
} from '../types';
import {
  Monitor,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  Moon,
  Lock,
  RefreshCw,
  Plus,
  Search,
  ShieldCheck,
  ChevronRight,
  X,
  Copy,
  Check,
  Laptop,
  Flame,
  Calendar,
  Terminal,
} from 'lucide-react';

interface AdminComputerActivityProps {
  user: User;
  getAuthHeaders: () => Record<string, string>;
  theme?: 'light' | 'dark';
}

export const AdminComputerActivity: React.FC<AdminComputerActivityProps> = ({
  user,
  getAuthHeaders,
}) => {
  const [employeesActivity, setEmployeesActivity] = useState<ComputerEmployeeOverview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<ComputerEmployeeOverview | null>(null);

  // Register device modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [targetEmpId, setTargetEmpId] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('Mac mini (Apple M4)');
  const [customDeviceId, setCustomDeviceId] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registerResult, setRegisterResult] = useState<{
    deviceId: string;
    deviceSecret: string;
    employeeName: string;
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  const fetchActivity = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/computer-activity', {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load activity (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.employees) {
        setEmployeesActivity(data.employees);
        if (selectedEmployee) {
          const updated = data.employees.find(
            (e: ComputerEmployeeOverview) => e.employeeId === selectedEmployee.employeeId
          );
          if (updated) setSelectedEmployee(updated);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching computer activity');
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, selectedEmployee]);

  useEffect(() => {
    fetchActivity();
    // Auto-refresh every 30 seconds to keep live presence fresh
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered employees
  const filteredList = useMemo(() => {
    return employeesActivity.filter((emp) => {
      const matchesSearch =
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.device?.deviceModel || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.device?.id || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || emp.currentState.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [employeesActivity, searchQuery, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalMacs = employeesActivity.filter((e) => e.device !== null).length;
    const activeNow = employeesActivity.filter((e) => e.currentState === 'ACTIVE').length;
    const totalSecondsToday = employeesActivity.reduce((acc, e) => acc + e.todayActiveSeconds, 0);
    const avgSeconds = totalMacs > 0 ? Math.round(totalSecondsToday / totalMacs) : 0;
    const avgH = Math.floor(avgSeconds / 3600);
    const avgM = Math.floor((avgSeconds % 3600) / 60);

    // Top active employee today
    const topEmp = [...employeesActivity].sort(
      (a, b) => b.todayActiveSeconds - a.todayActiveSeconds
    )[0];

    return {
      totalMacs,
      activeNow,
      avgToday: `${String(avgH).padStart(2, '0')}h ${String(avgM).padStart(2, '0')}m`,
      topEmployee: topEmp && topEmp.todayActiveSeconds > 0 ? topEmp : null,
    };
  }, [employeesActivity]);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpId) return;

    try {
      setIsRegistering(true);
      const res = await fetch('/api/presence/register-device', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          targetEmployeeId: targetEmpId,
          deviceModel,
          requestedDeviceId: customDeviceId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to register device');
      }

      const data = await res.json();
      setRegisterResult({
        deviceId: data.device.id,
        deviceSecret: data.deviceSecret,
        employeeName: data.device.employeeName,
      });
      fetchActivity();
    } catch (err: any) {
      alert(err.message || 'Error registering device');
    } finally {
      setIsRegistering(false);
    }
  };

  const getStatusBadge = (state: ComputerActivityState) => {
    switch (state) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Inactive
          </span>
        );
      case 'SLEEPING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Moon className="w-3 h-3 text-indigo-500" />
            Sleeping
          </span>
        );
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Lock className="w-3 h-3 text-purple-500" />
            Locked
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Offline
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-300 text-xs font-semibold mb-2 border border-blue-500/20">
            <Cpu className="w-3.5 h-3.5" />
            <span>Apple Silicon Mac Desktop Agent System</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Computer Activity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Privacy-first actual active working time detection (keyboard & mouse while awake & unlocked)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-refresh-computer-activity"
            type="button"
            onClick={fetchActivity}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl liquid-btn-secondary text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-register-mac-device"
            type="button"
            onClick={() => {
              setRegisterResult(null);
              setIsRegisterOpen(true);
            }}
            className="px-4 py-2 rounded-xl liquid-btn-primary text-xs font-semibold text-white flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pair Mac Device</span>
          </button>
        </div>
      </div>

      {/* 2. KPI SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Macs */}
        <div className="liquid-glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Macs Now
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.activeNow}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              / {stats.totalMacs} registered
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Currently generating active work time
          </p>
        </div>

        {/* Registered Hardware */}
        <div className="liquid-glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Registered Hardware
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-[#1a66c2] dark:text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalMacs}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Apple Silicon Macs
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Mac mini M2 Pro & M4 studio fleet
          </p>
        </div>

        {/* Average Working Time Today */}
        <div className="liquid-glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg. Active Time
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.avgToday}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              today
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Verified computer time per employee
          </p>
        </div>

        {/* Most Active Computer */}
        <div className="liquid-glass-card p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Top Active Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
              {stats.topEmployee ? stats.topEmployee.employeeName : 'None'}
            </span>
            {stats.topEmployee && (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {stats.topEmployee.todayActiveFormatted}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
            {stats.topEmployee?.device?.deviceModel || 'Waiting for activity'}
          </p>
        </div>
      </div>

      {/* 3. PRIVACY & ARCHITECTURE BANNER */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-slate-700 dark:text-slate-300 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-4 h-4 text-[#1a66c2] dark:text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">
            Zero Surveillance / Strict Privacy Guarantee:
          </span>{' '}
          The Flying Whales macOS Agent functions solely as an activity timer. It records{' '}
          <strong>no keystrokes, passwords, screenshots, webcam, mic, or clipboard contents</strong>.
          Only awake, unlocked computer states with mouse or keyboard activity count as working time.
          Phone web sessions are strictly excluded.
        </div>
      </div>

      {/* EMPTY STATE BANNER WHEN NO REAL MACS ARE REGISTERED */}
      {stats.totalMacs === 0 && (
        <div className="p-6 rounded-2xl liquid-glass-card border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 text-center">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center mx-auto mb-2.5">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Registered Mac Devices
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-1 mb-3">
            No Mac activity data available yet. Pair a physical Apple Silicon Mac (M2 Pro / M4) using the "Pair Mac Device" button above to begin capturing verified active computer time.
          </p>
          <button
            type="button"
            onClick={() => {
              setRegisterResult(null);
              setIsRegisterOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl liquid-btn-primary text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pair First Mac Device</span>
          </button>
        </div>
      )}

      {/* 4. SEARCH & STATUS FILTER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, device ID, or Mac model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/40"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'active', 'inactive', 'sleeping', 'locked', 'offline'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider cursor-pointer transition-all ${
                statusFilter === st
                  ? 'bg-[#1a66c2] text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 5. EMPLOYEES ACTIVITY TABLE */}
      <div className="liquid-glass-card rounded-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-white/5 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Paired Mac Hardware</th>
                <th className="py-3.5 px-4 font-semibold">Live State</th>
                <th className="py-3.5 px-4 font-semibold">Today's Active Time</th>
                <th className="py-3.5 px-4 font-semibold">Weekly / Monthly</th>
                <th className="py-3.5 px-4 font-semibold">Last Heartbeat</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No employees matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((emp) => {
                  const hasDevice = emp.device !== null;
                  const activeHours = (emp.todayActiveSeconds / 3600).toFixed(1);
                  const progressPct = Math.min(100, Math.round((emp.todayActiveSeconds / (8 * 3600)) * 100));

                  return (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Employee Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-sky-500/20 text-[#1a66c2] dark:text-sky-300 font-bold flex items-center justify-center text-xs">
                            {emp.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{emp.employeeName}</span>
                              {emp.role === 'ADMIN' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-500/10 text-[#1a66c2] dark:text-sky-300">
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {emp.employeeEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Device Hardware */}
                      <td className="py-3.5 px-4">
                        {hasDevice ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Laptop className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
                              {emp.device?.deviceModel}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {emp.device?.id} • {emp.device?.macOSVersion || 'macOS 15.0'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            No Mac paired yet
                          </span>
                        )}
                      </td>

                      {/* Live State */}
                      <td className="py-3.5 px-4">
                        {hasDevice ? (
                          emp.lastSeen ? (
                            getStatusBadge(emp.currentState)
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Never Connected
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400">Unpaired</span>
                        )}
                      </td>

                      {/* Today's Active Time */}
                      <td className="py-3.5 px-4">
                        {hasDevice ? (
                          (emp.lastSeen || emp.todayActiveSeconds > 0) ? (
                            <div className="space-y-1 max-w-[130px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {emp.todayActiveFormatted}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {progressPct}% of 8h
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#1a66c2] dark:bg-sky-400 transition-all duration-500"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono">00h 00m</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Weekly / Monthly */}
                      <td className="py-3.5 px-4">
                        {hasDevice ? (
                          <div className="text-[11px]">
                            <div>
                              <span className="text-slate-400">Week: </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {emp.weeklyActiveFormatted || '00h 00m'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Month: </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {emp.monthlyActiveFormatted || '00h 00m'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Last Heartbeat */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                        {hasDevice ? (
                          emp.lastSeen ? (
                            new Date(emp.lastSeen).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          ) : (
                            <span className="text-slate-400">Never</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {hasDevice ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            className="px-2.5 py-1.5 rounded-lg liquid-btn-secondary text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#1a66c2] flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <span>Intervals</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unpaired</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL: EMPLOYEE INTERVALS & TIMELINE DRAWER */}
      <AnimatePresence>
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="liquid-glass-card rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200/80 dark:border-white/10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedEmployee.employeeName}</span>
                    {getStatusBadge(selectedEmployee.currentState)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hardware: {selectedEmployee.device?.deviceModel || 'Unpaired'} (
                    {selectedEmployee.device?.id || 'N/A'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Day Summary */}
              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Active Today</span>
                  <p className="text-base font-bold text-[#1a66c2] dark:text-sky-400 mt-0.5">
                    {selectedEmployee.todayActiveFormatted}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sessions</span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEmployee.intervals.length} Active Blocks
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">This Week</span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedEmployee.weeklyActiveFormatted}
                  </p>
                </div>
              </div>

              {/* Intervals List */}
              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Today's Verified Active Intervals
                </h4>
                {selectedEmployee.intervals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    No active computer intervals recorded today yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEmployee.intervals.map((int, idx) => {
                      const start = new Date(int.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      const end = new Date(int.endTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      const durationMins = Math.round(int.durationSeconds / 60);

                      return (
                        <div
                          key={int.id || idx}
                          className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {start} — {end}
                              </span>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Device: {int.deviceId}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {durationMins}m active ({int.durationSeconds}s)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 rounded-xl liquid-btn-primary text-xs font-semibold text-white cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MODAL: REGISTER / PAIR MAC DEVICE */}
      <AnimatePresence>
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="liquid-glass-card rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200/80 dark:border-white/10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#1a66c2] flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Pair Apple Silicon Mac Device
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Generate credentials for Flying Whales macOS desktop agent
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!registerResult ? (
                <form onSubmit={handleRegisterDevice} className="space-y-4 mt-4">
                  {/* Select Employee */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Assign to Employee <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetEmpId}
                      onChange={(e) => setTargetEmpId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/40"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employeesActivity.map((e) => (
                        <option key={e.employeeId} value={e.employeeId}>
                          {e.employeeName} ({e.employeeEmail})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hardware Model */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Mac Hardware Model
                    </label>
                    <select
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/40"
                    >
                      <option value="Mac mini (Apple M4)">Mac mini (Apple M4)</option>
                      <option value="Mac mini (Apple M2 Pro)">Mac mini (Apple M2 Pro)</option>
                      <option value="MacBook Pro (Apple Silicon)">MacBook Pro (Apple Silicon)</option>
                      <option value="Mac Studio (Apple Silicon)">Mac Studio (Apple Silicon)</option>
                    </select>
                  </div>

                  {/* Custom Device ID (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Device ID (Optional - auto-generated if left blank)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FW-MAC-M4PRO05"
                      value={customDeviceId}
                      onChange={(e) => setCustomDeviceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/40 uppercase font-mono"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(false)}
                      className="px-3.5 py-2 rounded-xl liquid-btn-secondary text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="px-4 py-2 rounded-xl liquid-btn-primary text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    >
                      {isRegistering ? 'Registering...' : 'Generate Pairing Token'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 mt-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Mac device paired successfully for {registerResult.employeeName}!</span>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>CONFIG FOR MACOS AGENT:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              JSON.stringify(
                                {
                                  deviceId: registerResult.deviceId,
                                  deviceSecret: registerResult.deviceSecret,
                                  serverUrl: window.location.origin,
                                  inactivityThresholdSeconds: INACTIVITY_THRESHOLD_SECONDS, // Exactly 300 seconds (5 minutes)
                                  heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,     // 30 seconds
                                },
                                null,
                                2
                              )
                            );
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1 text-[10px]"
                        >
                          {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSecret ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>
                      <p className="text-[#38bdf8] text-[11px]">
                        DEVICE_ID: {registerResult.deviceId}
                      </p>
                      <p className="text-amber-300 text-[11px] break-all">
                        SECRET: {registerResult.deviceSecret}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Setup on Employee Mac:</span>
                    </div>
                    <p>1. Copy the JSON configuration above.</p>
                    <p>2. Save to: <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">~/Library/Application Support/FlyingWhalesAgent/config.json</code></p>
                    <p>3. Start the Flying Whales macOS Agent.</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterOpen(false);
                        setRegisterResult(null);
                      }}
                      className="px-4 py-2 rounded-xl liquid-btn-primary text-xs font-semibold text-white cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

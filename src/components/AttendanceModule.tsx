import React, { useState, useMemo, useEffect } from 'react';
import { User, AttendanceRecord } from '../types';
import { ScrollReveal } from './ScrollReveal';
import {
  calculateAttendanceDuration,
  isZeroOrMissingDuration,
  getLiveActiveDuration,
} from '../utils/attendance';
import {
  Clock,
  CalendarCheck,
  LogIn,
  LogOut,
  Users,
  Search,
  Calendar,
  Timer,
  RefreshCw,
  CalendarRange,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Monitor,
} from 'lucide-react';

interface AttendanceModuleProps {
  user: User;
  attendance: AttendanceRecord[];
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  onAttendanceLogin?: () => Promise<void>;
  onAttendanceLogout?: () => Promise<void>;
  onDeleteAttendance?: (id: string) => Promise<void>;
}

// Format current date in Asia/Kolkata timezone (YYYY-MM-DD)
function getKolkataTodayString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Format current time in Asia/Kolkata timezone (hh:mm:ss A)
function getKolkataCurrentTimeString(): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString();
  }
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  user,
  attendance,
  onRefresh,
  isRefreshing = false,
  onAttendanceLogin,
  onAttendanceLogout,
  onDeleteAttendance,
}) => {
  const isAdmin = user.role === 'ADMIN';
  const todayKolkata = getKolkataTodayString();

  // Real-time ticking clock for current IST time
  const [currentTime, setCurrentTime] = useState<string>(getKolkataCurrentTimeString());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getKolkataCurrentTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>(
    todayKolkata.slice(0, 7) // YYYY-MM
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI Action states
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find user's active, open attendance record (logged in, not yet logged out)
  const activeRecord = useMemo(() => {
    return attendance.find(
      (a) =>
        (a.employeeEmail.toLowerCase() === user.email.toLowerCase() || a.employeeId === user.id) &&
        (!a.logoutTime || a.logoutTime.trim() === '' || a.status === 'Logged In')
    );
  }, [attendance, user]);

  const isLoggedIn = Boolean(activeRecord);

  // Today's latest attendance record for stats card
  const todayRecord = useMemo(() => {
    return attendance.find(
      (a) =>
        a.date === todayKolkata &&
        (a.employeeEmail.toLowerCase() === user.email.toLowerCase() || a.employeeId === user.id)
    );
  }, [attendance, todayKolkata, user]);

  // Today's calculated or live duration display
  const todayDurationDisplay = useMemo(() => {
    if (isLoggedIn && activeRecord) {
      return `In Progress (${getLiveActiveDuration(activeRecord.date, activeRecord.loginTime, currentTime)})`;
    }
    if (todayRecord?.duration && !isZeroOrMissingDuration(todayRecord.duration)) {
      return todayRecord.duration;
    }
    if (todayRecord?.loginTime && todayRecord?.logoutTime) {
      const calculated = calculateAttendanceDuration(todayRecord.date, todayRecord.loginTime, todayRecord.logoutTime);
      if (!isZeroOrMissingDuration(calculated)) return calculated;
    }
    return '--:--';
  }, [isLoggedIn, activeRecord, todayRecord, currentTime]);

  // Today's active hours display (Real physical Mac active time inside shift)
  const todayActiveHoursDisplay = useMemo(() => {
    if (activeRecord?.activeHours && !isZeroOrMissingDuration(activeRecord.activeHours)) {
      return activeRecord.activeHours;
    }
    if (todayRecord?.activeHours && !isZeroOrMissingDuration(todayRecord.activeHours)) {
      return todayRecord.activeHours;
    }
    return '00h 00m';
  }, [activeRecord, todayRecord]);

  // Handle Manual Attendance Login click
  const handleLoginClick = async () => {
    if (!onAttendanceLogin || isActionLoading) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await onAttendanceLogin();
      showToast('Attendance login recorded successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record attendance login. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Manual Attendance Logout click
  const handleLogoutClick = async () => {
    if (!onAttendanceLogout || isActionLoading) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await onAttendanceLogout();
      showToast('Attendance logout recorded successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record attendance logout. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Delete attendance record
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId || !onDeleteAttendance || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteAttendance(deleteConfirmId);
      showToast('Attendance record deleted.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete attendance record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    return attendance.filter((rec) => {
      // 1. Single Date filter (if selected)
      if (selectedDate && rec.date !== selectedDate) {
        return false;
      }

      // 2. Date Range filter (if selected)
      if (startDate && rec.date < startDate) {
        return false;
      }
      if (endDate && rec.date > endDate) {
        return false;
      }

      // 3. Month filter (applied if no specific single date or range is active)
      if (!selectedDate && !startDate && !endDate && selectedMonth) {
        if (!rec.date.startsWith(selectedMonth)) {
          return false;
        }
      }

      // 4. Employee filter (Admin only)
      if (isAdmin && selectedEmployeeEmail !== 'ALL') {
        if (rec.employeeEmail.toLowerCase() !== selectedEmployeeEmail.toLowerCase()) {
          return false;
        }
      }

      // 5. Search query (matches name, email, or date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (rec.employeeName || '').toLowerCase().includes(q);
        const matchesEmail = (rec.employeeEmail || '').toLowerCase().includes(q);
        const matchesDate = (rec.date || '').includes(q);
        if (!matchesName && !matchesEmail && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [
    attendance,
    selectedDate,
    startDate,
    endDate,
    selectedMonth,
    isAdmin,
    selectedEmployeeEmail,
    searchQuery,
  ]);

  // Unique employees for admin dropdown
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    attendance.forEach((a) => {
      if (a.employeeEmail && !map.has(a.employeeEmail.toLowerCase())) {
        map.set(a.employeeEmail.toLowerCase(), {
          name: a.employeeName || a.employeeEmail,
          email: a.employeeEmail,
        });
      }
    });
    return Array.from(map.values());
  }, [attendance]);

  const resetFilters = () => {
    setSelectedDate('');
    setStartDate('');
    setEndDate('');
    setSelectedMonth(todayKolkata.slice(0, 7));
    setSelectedEmployeeEmail('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <ScrollReveal>
        <div className="liquid-glass-card rounded-2xl p-6 shadow-xs border border-slate-200/60 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1a66c2] to-sky-400 text-white flex items-center justify-center shrink-0 shadow-md">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  {isAdmin ? 'Studio Attendance Management' : 'Shift Attendance'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/60 text-[#1a66c2] dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60">
                  Google Sheets Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  Asia/Kolkata (IST)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAdmin
                  ? 'Real-time studio attendance tracking. Shift login and logout timestamps are logged to Google Sheets.'
                  : 'Manual shift tracking. Click Login when beginning work and Logout when completing your shift.'}
              </p>
            </div>
          </div>

          {/* Action / Refresh & Time badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                {currentTime}
              </span>
            </div>

            {onRefresh && (
              <button
                id="attendance-refresh-btn"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh Records'}</span>
              </button>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* PROMINENT MANUAL ATTENDANCE ACTION CARD */}
      <ScrollReveal>
        <div
          id="manual-attendance-card"
          className="liquid-glass-card rounded-2xl p-6 border border-slate-200/80 dark:border-white/15 shadow-md bg-gradient-to-r from-slate-50 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/60"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {isLoggedIn ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span>Currently Logged In</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <span>Currently Logged Out</span>
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Employee: <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong> ({user.email})
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isLoggedIn && activeRecord ? (
                  <span>
                    Shift session active since{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">{activeRecord.loginTime}</strong> on{' '}
                    <strong className="text-slate-900 dark:text-white">{activeRecord.date}</strong>
                  </span>
                ) : (
                  <span>Ready to start work. Click Login to record your attendance.</span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Attendance login and logout are recorded exclusively via manual button clicks. Each event logs a verified server-side timestamp to Google Sheets.
              </p>
            </div>

            {/* Dedicated Manual Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {isLoggedIn ? (
                <button
                  id="attendance-logout-btn"
                  type="button"
                  onClick={handleLogoutClick}
                  disabled={isActionLoading}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  title="Conclude your work shift and record logout time"
                >
                  {isActionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  id="attendance-login-btn"
                  type="button"
                  onClick={handleLoginClick}
                  disabled={isActionLoading}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  title="Begin your work shift and record login time"
                >
                  {isActionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* METRIC STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Status */}
        <div className="liquid-glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {isLoggedIn ? 'Logged In' : todayRecord?.status || 'Logged Out'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isLoggedIn ? 'Shift in progress' : todayRecord ? 'Shift finished today' : 'No shift started yet'}
          </p>
        </div>

        {/* Today's Login Time */}
        <div className="liquid-glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's Login
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {activeRecord?.loginTime || todayRecord?.loginTime || '--:--'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {activeRecord?.loginTime || todayRecord?.loginTime
              ? 'Recorded by Login button'
              : 'Click Login to start shift'}
          </p>
        </div>

        {/* Today's Logout Time */}
        <div className="liquid-glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's Logout
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {isLoggedIn ? 'Active' : todayRecord?.logoutTime || '--:--'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isLoggedIn ? 'Session in progress' : todayRecord?.logoutTime ? 'Shift completed' : 'No logout recorded'}
          </p>
        </div>

        {/* Today's Login Duration */}
        <div className="liquid-glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Login Duration
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {todayDurationDisplay}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isLoggedIn ? 'Attendance shift duration' : todayDurationDisplay !== '--:--' ? 'Total shift elapsed' : 'No duration recorded'}
          </p>
        </div>

        {/* Today's Active Hours */}
        <div className="liquid-glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Hours
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {todayActiveHoursDisplay}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Real physical Mac active time
          </p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="liquid-glass-card rounded-2xl p-4 border border-slate-200/60 dark:border-white/10 flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Admin Employee Filter */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="attendance-employee-filter"
                value={selectedEmployeeEmail}
                onChange={(e) => setSelectedEmployeeEmail(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
              >
                <option value="ALL">All Employees ({uniqueEmployees.length})</option>
                {uniqueEmployees.map((emp) => (
                  <option key={emp.email} value={emp.email}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Single Date Picker */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id="attendance-date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="Filter by Date"
              className="px-2.5 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
            />
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id="attendance-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
              title="Start Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              id="attendance-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
              title="End Date"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Month:</span>
            <input
              id="attendance-month-filter"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
            />
          </div>

          {(selectedDate || startDate || endDate || searchQuery || selectedEmployeeEmail !== 'ALL') && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="attendance-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, email, date..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
          />
        </div>
      </div>

      {/* ATTENDANCE RECORDS TABLE */}
      <ScrollReveal>
        <div className="liquid-glass-card rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Attendance Log History
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredAttendance.length} records
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Synced directly with Google Sheets Attendance Tab
            </span>
          </div>

          {filteredAttendance.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No attendance records found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {isAdmin
                  ? 'No shift records match your current filter. When employees click Login, verified records will appear here.'
                  : 'You have not recorded any attendance shifts yet. Click the Login button above to record your attendance.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Login Time</th>
                    <th className="py-3.5 px-4">Logout Time</th>
                    <th className="py-3.5 px-4">Login Duration</th>
                    <th className="py-3.5 px-4">Active Hours</th>
                    <th className="py-3.5 px-4">Status</th>
                    {(isAdmin || onDeleteAttendance) && <th className="py-3.5 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5">
                  {filteredAttendance.map((rec) => {
                    const isOpen = !rec.logoutTime || rec.logoutTime.trim() === '' || rec.status === 'Logged In';
                    const canDelete = isAdmin || rec.employeeEmail.toLowerCase() === user.email.toLowerCase();
                    const displayDuration = !isOpen
                      ? (rec.duration && !isZeroOrMissingDuration(rec.duration)
                          ? rec.duration
                          : (rec.logoutTime
                              ? calculateAttendanceDuration(rec.date, rec.loginTime, rec.logoutTime)
                              : 'In Progress'))
                      : `In Progress (${getLiveActiveDuration(rec.date, rec.loginTime, currentTime)})`;

                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Employee */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a66c2] to-sky-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {(rec.employeeName || rec.employeeEmail)[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {rec.employeeName || rec.employeeEmail.split('@')[0]}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {rec.employeeEmail}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {rec.date}
                        </td>

                        {/* Login Time */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span>{rec.loginTime}</span>
                          </span>
                        </td>

                        {/* Logout Time */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span>Active / Logged In</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#1a66c2] dark:bg-blue-950/50 dark:text-sky-300 border border-blue-200 dark:border-blue-800/50">
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span>{rec.logoutTime}</span>
                            </span>
                          )}
                        </td>

                        {/* Login Duration */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              <Timer className="w-3 h-3 text-amber-500 animate-pulse" />
                              <span>{displayDuration}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                              <Timer className="w-3 h-3 text-purple-500" />
                              <span>{displayDuration}</span>
                            </span>
                          )}
                        </td>

                        {/* Active Hours (Real Physical Mac Time) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              rec.activeHours && rec.activeHours !== '00h 00m' && rec.activeHours !== '0h 00m'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50'
                                : 'bg-slate-100/70 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
                            }`}
                            title="Real physical Mac active time intersected with attendance shift"
                          >
                            <Monitor className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{rec.activeHours || '00h 00m'}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>Logged In</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Completed</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        {(isAdmin || onDeleteAttendance) && (
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {canDelete && onDeleteAttendance && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(rec.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete Attendance Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-card rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete Attendance Record?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              This will remove this attendance record from Google Sheets and the studio application.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isDeleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

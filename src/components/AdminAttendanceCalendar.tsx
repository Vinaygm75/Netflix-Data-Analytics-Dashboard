import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, AttendanceRecord } from '../types';
import { ScrollReveal } from './ScrollReveal';
import {
  calculateAttendanceDuration,
  isZeroOrMissingDuration,
} from '../utils/attendance';
import {
  calculateMonthlyAttendance,
  CalendarDayInfo,
  MonthlyAttendanceCalculation,
  getMonthName,
  getTodayDateString,
  KARNATAKA_HOLIDAYS,
} from '../utils/karnatakaHolidays';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Info,
  Layers,
  Award,
  Filter,
  Eye,
  AlertTriangle,
  Building2,
  Monitor,
} from 'lucide-react';

interface AdminAttendanceCalendarProps {
  currentUser: User;
  employees: User[];
  initialAttendance?: AttendanceRecord[];
  getAuthHeaders?: () => Record<string, string>;
}

export const AdminAttendanceCalendar: React.FC<AdminAttendanceCalendarProps> = ({
  currentUser,
  employees,
  initialAttendance = [],
  getAuthHeaders,
}) => {
  // Current date reference in Asia/Kolkata
  const todayStr = getTodayDateString();
  const [currentYear, currentMonth, currentDay] = todayStr.split('-').map(Number);
  const todayDate = useMemo(
    () => new Date(currentYear, currentMonth - 1, currentDay),
    [currentYear, currentMonth, currentDay]
  );

  // State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  // Default to Junty or first employee in the list, or 'all' if list is empty
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    const admin = employees.find((e) => e.role === 'ADMIN' || e.name?.toLowerCase() === 'junty');
    if (admin) return admin.id;
    return employees.length > 0 ? employees[0].id : 'all';
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendance);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDayDetail, setActiveDayDetail] = useState<CalendarDayInfo | null>(null);

  // Auth helper headers: reuse standard application session token mechanism
  const getRequestHeaders = useCallback(() => {
    if (getAuthHeaders) {
      return getAuthHeaders();
    }
    const savedToken = localStorage.getItem('studio_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (savedToken) {
      headers.Authorization = `Bearer ${savedToken}`;
    }
    return headers;
  }, [getAuthHeaders]);

  // Sync if employees list changes and selected employee isn't found
  useEffect(() => {
    if (selectedEmployeeId !== 'all' && employees.length > 0) {
      const exists = employees.some((e) => e.id === selectedEmployeeId);
      if (!exists) {
        setSelectedEmployeeId(employees[0].id);
      }
    }
  }, [employees, selectedEmployeeId]);

  // Fetch verified attendance from secure Admin API
  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const url = new URL('/api/admin/attendance-calendar', window.location.origin);
      if (selectedEmployeeId && selectedEmployeeId !== 'all') {
        url.searchParams.set('employeeId', selectedEmployeeId);
      }
      url.searchParams.set('month', monthStr);

      const res = await fetch(url.toString(), {
        headers: getRequestHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied. Administrator permissions are required to view employee attendance.');
        }
        throw new Error(`Failed to load attendance records (HTTP ${res.status})`);
      }

      const data = await res.json();
      setAttendanceRecords(data.attendance || []);
    } catch (err: any) {
      console.error('[ADMIN CALENDAR] Error loading attendance:', err?.message);
      setError(err?.message || 'Failed to load attendance data');
      // Fallback to existing initialAttendance filtered locally
      if (initialAttendance && initialAttendance.length > 0) {
        setAttendanceRecords(initialAttendance);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedYear, selectedMonth, selectedEmployeeId, getRequestHeaders]);

  // Find the selected employee object
  const selectedEmployee = useMemo(() => {
    if (selectedEmployeeId === 'all') return null;
    return (
      employees.find(
        (e) =>
          e.id.toLowerCase() === selectedEmployeeId.toLowerCase() ||
          e.email.toLowerCase() === selectedEmployeeId.toLowerCase()
      ) || null
    );
  }, [selectedEmployeeId, employees]);

  // Compute monthly calculations and calendar grid
  const monthlyCalc: MonthlyAttendanceCalculation = useMemo(() => {
    let filteredRecords = attendanceRecords;

    if (selectedEmployee) {
      const targetId = selectedEmployee.id.toLowerCase();
      const targetEmail = selectedEmployee.email.toLowerCase();
      const targetName = (selectedEmployee.name || '').toLowerCase();

      filteredRecords = attendanceRecords.filter((rec) => {
        const recId = String(rec.employeeId || '').toLowerCase();
        const recEmail = String(rec.employeeEmail || '').toLowerCase();
        const recName = String(rec.employeeName || '').toLowerCase();

        return (
          (targetId && (recId === targetId || recEmail === targetId)) ||
          (targetEmail && (recEmail === targetEmail || recId === targetEmail)) ||
          (targetName && recName && recName === targetName)
        );
      });
    }

    return calculateMonthlyAttendance(selectedYear, selectedMonth, filteredRecords);
  }, [selectedYear, selectedMonth, attendanceRecords, selectedEmployee]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  // Weekday layout calculations (Mon=0, Tue=1, ..., Sun=6)
  // Standard JS Date.getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Convert to Mon=0 index:
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
  const leadingOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Number of blank cells before the 1st

  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const yearsList = [2024, 2025, 2026, 2027];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <ScrollReveal distance={16} duration={480}>
        <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a66c2]/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center border border-[#1a66c2]/20 dark:border-sky-500/30 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Admin Attendance Calendar
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1a66c2]/10 dark:bg-sky-400/10 text-[#1a66c2] dark:text-sky-300 border border-[#1a66c2]/20 dark:border-sky-400/20">
                    Karnataka & India
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated working-day tracking, statutory Karnataka public holidays, and verified employee attendance
                </p>
              </div>
            </div>

            {/* Filter Controls: Employee, Month, Year */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Employee Selector */}
              <div className="relative">
                <label htmlFor="admin-calendar-employee-select" className="sr-only">
                  Select Employee
                </label>
                <div className="flex items-center">
                  <UserIcon className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400 absolute left-3 pointer-events-none" />
                  <select
                    id="admin-calendar-employee-select"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="pl-8 pr-7 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-[#1a66c2]/40 outline-none cursor-pointer appearance-none transition-all max-w-[200px] truncate"
                  >
                    <option value="all">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || emp.email.split('@')[0]} {emp.role === 'ADMIN' ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Month Selector */}
              <div className="relative">
                <select
                  id="admin-calendar-month-select"
                  aria-label="Select Month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-[#1a66c2]/40 outline-none cursor-pointer transition-all"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="relative">
                <select
                  id="admin-calendar-year-select"
                  aria-label="Select Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs focus:ring-2 focus:ring-[#1a66c2]/40 outline-none cursor-pointer transition-all"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Today Button */}
              <button
                id="admin-calendar-today-btn"
                onClick={handleCurrentMonth}
                title="Jump to Current Month"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Today
              </button>

              {/* Refresh Button */}
              <button
                id="admin-calendar-refresh-btn"
                onClick={fetchAttendance}
                disabled={isLoading}
                title="Sync Latest Attendance from Server"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-[#1a66c2] dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#1a66c2]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ERROR NOTICE (If any) */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{error}</span>
        </div>
      )}

      {/* MONTHLY SUMMARY METRIC CARDS */}
      <ScrollReveal distance={20} duration={520} delay={80}>
        <div>
          {/* Summary Label with Active Employee */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Summary for {monthlyCalc.monthName} {monthlyCalc.year}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-300">
                {selectedEmployee ? selectedEmployee.name : 'All Employees'}
              </span>
            </div>

            {/* Strict Formula Verification Badge */}
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 flex-wrap">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Working Days Elapsed ({monthlyCalc.workingDaysElapsed})
              </span>
              <span>=</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Present ({monthlyCalc.present})
              </span>
              <span>+</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                Absent ({monthlyCalc.absent})
              </span>
              <span className="text-slate-400 dark:text-slate-500 ml-1">
                • {monthlyCalc.remainingWorkingDays} Remaining
              </span>
            </div>
          </div>

          {/* 6 High-Impact Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* 1. Working Days Elapsed */}
            <div
              id="summary-card-working-days-elapsed"
              className="liquid-glass-card rounded-2xl p-4 border border-blue-200/60 dark:border-blue-900/40 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Elapsed Days
                </span>
                <span className="w-2 h-2 rounded-full bg-[#1a66c2] dark:bg-sky-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1a66c2] dark:text-sky-400">
                  {monthlyCalc.workingDaysElapsed}
                </span>
                <span className="text-[11px] text-slate-400">days</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                of {monthlyCalc.totalWorkingDays} total working days
              </p>
            </div>

            {/* 2. Present */}
            <div
              id="summary-card-present"
              className="liquid-glass-card rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-900/40 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Present
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {monthlyCalc.present}
                </span>
                <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                  {monthlyCalc.workingDaysElapsed > 0
                    ? `${Math.round((monthlyCalc.present / monthlyCalc.workingDaysElapsed) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 truncate">
                Verified attendance logs
              </p>
            </div>

            {/* 3. Absent */}
            <div
              id="summary-card-absent"
              className="liquid-glass-card rounded-2xl p-4 border border-rose-200/60 dark:border-rose-900/40 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                  Absent
                </span>
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  {monthlyCalc.absent}
                </span>
                <span className="text-[11px] text-rose-600/70 dark:text-rose-400/70">
                  {monthlyCalc.workingDaysElapsed > 0
                    ? `${Math.round((monthlyCalc.absent / monthlyCalc.workingDaysElapsed) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1 truncate">
                Past working days without punch
              </p>
            </div>

            {/* 4. Remaining Working Days */}
            <div
              id="summary-card-remaining"
              className="liquid-glass-card rounded-2xl p-4 border border-sky-200/60 dark:border-sky-900/40 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sky-700 dark:text-sky-300 truncate">
                  Remaining Days
                </span>
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400">
                  {monthlyCalc.remainingWorkingDays}
                </span>
                <span className="text-[11px] text-slate-400">shifts</span>
              </div>
              <p className="text-[10px] text-sky-600/80 dark:text-sky-400/80 mt-1 truncate">
                Future working days
              </p>
            </div>

            {/* 5. Sundays */}
            <div
              id="summary-card-sundays"
              className="liquid-glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Sundays
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-700 dark:text-slate-300">
                  {monthlyCalc.sundays}
                </span>
                <span className="text-[11px] text-slate-400">weekly off</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                Excluded from working days
              </p>
            </div>

            {/* 6. Holidays */}
            <div
              id="summary-card-holidays"
              className="liquid-glass-card rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/40 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Holidays
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {monthlyCalc.holidays}
                </span>
                {monthlyCalc.sundayHolidaysCount > 0 && (
                  <span
                    className="text-[10px] text-amber-700 dark:text-amber-300 font-medium px-1.5 py-0.5 rounded-md bg-amber-500/15"
                    title={`${monthlyCalc.sundayHolidaysCount} holiday falls on Sunday (not double-counted)`}
                  >
                    +{monthlyCalc.sundayHolidaysCount} Sun
                  </span>
                )}
              </div>
              <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 mt-1 truncate">
                Karnataka gazetted holidays
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* MONTHLY CALENDAR GRID VIEW */}
      <ScrollReveal distance={22} duration={560} delay={120}>
        <div className="liquid-glass-card rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
          {/* Calendar Top Navigation Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                id="admin-calendar-prev-month"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {monthlyCalc.monthName} {monthlyCalc.year}
              </h3>

              <button
                id="admin-calendar-next-month"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats Pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{monthlyCalc.totalCalendarDays} Days in Month</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {monthlyCalc.present} Attended
              </span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {monthlyCalc.absent} Absent
              </span>
            </div>
          </div>

          {/* Days of the Week Header (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-4 pb-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {WEEK_DAYS.map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-1.5 ${
                  idx === 6 ? 'text-rose-500/90 dark:text-rose-400/90' : ''
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Monthly Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Blank leading slots before the 1st day */}
            {Array.from({ length: leadingOffset }).map((_, i) => (
              <div
                key={`empty-leading-${i}`}
                className="min-h-[82px] sm:min-h-[104px] rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200/50 dark:border-slate-800/50 opacity-40"
              />
            ))}

            {/* Calendar Days */}
            {monthlyCalc.days.map((day) => {
              // Status colors & classes
              let containerStyle = '';
              let badgeStyle = '';
              let badgeText = '';
              let dotColor = '';

              if (day.status === 'PRESENT') {
                containerStyle =
                  'bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15 border-emerald-500/25 dark:border-emerald-500/30';
                badgeStyle =
                  'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30';
                badgeText = 'Present';
                dotColor = 'bg-emerald-500';
              } else if (day.status === 'ABSENT') {
                containerStyle =
                  'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-500/10 dark:hover:bg-rose-500/15 border-rose-500/25 dark:border-rose-500/30';
                badgeStyle =
                  'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30';
                badgeText = 'Absent';
                dotColor = 'bg-rose-500';
              } else if (day.status === 'SUNDAY') {
                containerStyle =
                  'bg-slate-100/70 hover:bg-slate-200/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 border-slate-300/60 dark:border-slate-700/60';
                badgeStyle =
                  'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
                badgeText = day.isHoliday ? 'Sun + Hol' : 'Sunday';
                dotColor = 'bg-slate-400';
              } else if (day.status === 'HOLIDAY') {
                containerStyle =
                  'bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-500/15 dark:hover:bg-amber-500/20 border-amber-500/35 dark:border-amber-500/40';
                badgeStyle =
                  'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40';
                badgeText = 'Holiday';
                dotColor = 'bg-amber-500';
              } else if (day.status === 'UPCOMING') {
                containerStyle =
                  'bg-blue-500/5 hover:bg-blue-500/10 dark:bg-sky-500/10 dark:hover:bg-sky-500/15 border-blue-500/20 dark:border-sky-500/25';
                badgeStyle =
                  'bg-blue-500/15 text-blue-700 dark:text-sky-300 border border-blue-500/30 dark:border-sky-500/30';
                badgeText = 'Upcoming';
                dotColor = 'bg-blue-500 dark:bg-sky-400';
              } else if (day.status === 'TODAY_NOT_MARKED') {
                containerStyle =
                  'bg-sky-500/5 hover:bg-sky-500/10 dark:bg-sky-500/10 dark:hover:bg-sky-500/15 border-sky-500/30 dark:border-sky-500/40';
                badgeStyle =
                  'bg-sky-500/20 text-sky-800 dark:text-sky-200 border border-sky-500/40';
                badgeText = 'Not Marked';
                dotColor = 'bg-sky-500';
              }

              const isToday = day.isToday;

              return (
                <div
                  key={day.date}
                  id={`calendar-day-${day.date}`}
                  onClick={() => setActiveDayDetail(day)}
                  className={`min-h-[82px] sm:min-h-[104px] p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none relative group ${containerStyle} ${
                    isToday ? 'ring-2 ring-[#1a66c2] dark:ring-sky-400 shadow-md' : ''
                  }`}
                >
                  {/* Day Header: Number + Today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isToday
                          ? 'text-[#1a66c2] dark:text-sky-300'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {isToday && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-sm bg-[#1a66c2] text-white">
                        Today
                      </span>
                    )}

                    {!isToday && (
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    )}
                  </div>

                  {/* Center info: Status pill & Holiday name */}
                  <div className="my-1 flex flex-col gap-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md self-start text-center inline-flex items-center gap-1 ${badgeStyle}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="truncate max-w-[85px] sm:max-w-[110px]">{badgeText}</span>
                    </span>

                    {/* Holiday Title if applicable */}
                    {day.holiday && (
                      <p
                        className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 line-clamp-2 leading-tight mt-0.5"
                        title={`${day.holiday.name} (${day.holiday.region})`}
                      >
                        {day.holiday.name}
                      </p>
                    )}

                    {/* Attendance punch time if present */}
                    {day.status === 'PRESENT' && day.attendanceRecord && (
                      <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{day.attendanceRecord.loginTime || 'Logged In'}</span>
                      </div>
                    )}
                  </div>

                  {/* Hover hint */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end text-[9px] text-slate-400">
                    <Eye className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* CALENDAR LEGEND */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Present
                </span>
                <span className="text-[11px] text-slate-400">(Elapsed)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Absent
                </span>
                <span className="text-[11px] text-slate-400">(Past Working Day)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 dark:bg-sky-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Upcoming
                </span>
                <span className="text-[11px] text-slate-400">(Future Working Day)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Sunday
                </span>
                <span className="text-[11px] text-slate-400">(Weekly Off)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Holiday
                </span>
                <span className="text-[11px] text-slate-400">(Karnataka Govt)</span>
              </div>
            </div>

            {/* Note on Sunday holiday non-double count & future date rules */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Future dates are not marked absent. Sundays & statutory holidays are excluded from working days.</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* KARNATAKA HOLIDAYS LIST FOR THIS MONTH */}
      <ScrollReveal distance={20} duration={500} delay={160}>
        <div className="liquid-glass-card rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Karnataka Gazetted Holidays in {monthlyCalc.monthName} {monthlyCalc.year}
              </h4>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {monthlyCalc.allHolidaysCount} Total Scheduled
            </span>
          </div>

          {monthlyCalc.allHolidaysCount === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
              No government or festival public holidays scheduled in {monthlyCalc.monthName} {monthlyCalc.year}.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {monthlyCalc.days
                .filter((d) => d.holiday)
                .map((d) => (
                  <div
                    key={d.date}
                    className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex items-start gap-3"
                  >
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-200 text-center font-bold text-xs shrink-0">
                      <div>{d.dayNumber}</div>
                      <div className="text-[9px] uppercase font-normal">{d.dayName}</div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {d.holiday?.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {d.isSunday ? 'Falls on Sunday (Weekly Off)' : d.holiday?.type || 'Public Holiday'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* DAY DETAIL MODAL */}
      {activeDayDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1a66c2]/10 text-[#1a66c2] flex items-center justify-center font-bold text-sm">
                  {activeDayDetail.dayNumber}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeDayDetail.date} ({activeDayDetail.dayName})
                  </h4>
                  <p className="text-[11px] text-slate-500">Day Details & Attendance Log</p>
                </div>
              </div>
              <button
                onClick={() => setActiveDayDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Employee:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEmployee ? selectedEmployee.name : 'All Employees Selected'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md ${
                    activeDayDetail.status === 'PRESENT'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : activeDayDetail.status === 'ABSENT'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : activeDayDetail.status === 'SUNDAY'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      : activeDayDetail.status === 'HOLIDAY'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : activeDayDetail.status === 'UPCOMING'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-sky-300'
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  }`}
                >
                  {activeDayDetail.status === 'TODAY_NOT_MARKED' ? 'NOT MARKED (TODAY)' : activeDayDetail.status}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Working Day:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {activeDayDetail.isWorkingDay
                    ? activeDayDetail.isFuture
                      ? 'Yes (Upcoming Normal Shift)'
                      : activeDayDetail.isToday
                      ? 'Yes (Current Shift)'
                      : 'Yes (Past Shift)'
                    : 'No (Weekly/Statutory Off)'}
                </span>
              </div>

              {activeDayDetail.holiday && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                  <p className="font-bold">{activeDayDetail.holiday.name}</p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    {activeDayDetail.holiday.region} • {activeDayDetail.holiday.type}
                  </p>
                </div>
              )}

              {activeDayDetail.attendanceRecord ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-emerald-900 dark:text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Verified Attendance Record
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Login:</span>{' '}
                      <strong>{activeDayDetail.attendanceRecord.loginTime || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Logout:</span>{' '}
                      <strong>{activeDayDetail.attendanceRecord.logoutTime || 'In Session'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Login Duration:</span>{' '}
                      <strong>
                        {activeDayDetail.attendanceRecord.duration && !isZeroOrMissingDuration(activeDayDetail.attendanceRecord.duration)
                          ? activeDayDetail.attendanceRecord.duration
                          : activeDayDetail.attendanceRecord.logoutTime
                          ? calculateAttendanceDuration(
                              activeDayDetail.attendanceRecord.date,
                              activeDayDetail.attendanceRecord.loginTime,
                              activeDayDetail.attendanceRecord.logoutTime
                            )
                          : 'In Progress'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Active Hours:</span>{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {activeDayDetail.attendanceRecord.activeHours || '00h 00m'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : activeDayDetail.status === 'UPCOMING' ? (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-sky-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Upcoming Working Day
                  </p>
                  <p className="text-[11px] text-blue-700/80 dark:text-sky-300/80 mt-0.5">
                    This date is in the future. The shift has not commenced yet; attendance cannot be marked until this date.
                  </p>
                </div>
              ) : activeDayDetail.status === 'TODAY_NOT_MARKED' ? (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    Today — Shift In Progress
                  </p>
                  <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80 mt-0.5">
                    Employee has not logged attendance yet today. This day is not marked absent.
                  </p>
                </div>
              ) : activeDayDetail.status === 'ABSENT' ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    No Attendance Log Found
                  </p>
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                    Employee did not clock in or log attendance on this past working day.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveDayDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
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

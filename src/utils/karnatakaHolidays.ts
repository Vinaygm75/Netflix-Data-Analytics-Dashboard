/**
 * Official Karnataka & India Government Public Holiday Calendar Service
 * Maintainable data structure for tracking government, public, and festival holidays.
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  year: number;
  region: 'Karnataka' | 'India';
  type: 'National Holiday' | 'State Holiday' | 'Festival Holiday' | 'Government Public Holiday';
  description?: string;
}

// Master list of Karnataka Government Gazetted / General Public Holidays
export const KARNATAKA_HOLIDAYS: Holiday[] = [
  // ==========================================
  // YEAR 2025
  // ==========================================
  { date: '2025-01-14', name: 'Makara Sankranti', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-01-26', name: 'Republic Day', year: 2025, region: 'India', type: 'National Holiday' },
  { date: '2025-02-26', name: 'Maha Shivaratri', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-03-30', name: 'Chandramana Ugadi', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-03-31', name: 'Khutba-e-Ramzan (Eid-ul-Fitr)', year: 2025, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2025-04-10', name: 'Mahaveer Jayanti', year: 2025, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2025-04-14', name: 'Dr. B.R. Ambedkar Jayanti', year: 2025, region: 'India', type: 'National Holiday' },
  { date: '2025-04-18', name: 'Good Friday', year: 2025, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2025-04-30', name: 'Basava Jayanti / Akshaya Tritiya', year: 2025, region: 'Karnataka', type: 'State Holiday' },
  { date: '2025-05-01', name: 'May Day (Labour Day)', year: 2025, region: 'India', type: 'Government Public Holiday' },
  { date: '2025-06-07', name: 'Bakrid (Eid-ul-Adha)', year: 2025, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2025-07-06', name: 'Muharram (Ashoora)', year: 2025, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2025-08-15', name: 'Independence Day', year: 2025, region: 'India', type: 'National Holiday' },
  { date: '2025-08-27', name: 'Ganesh Chaturthi', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-09-05', name: 'Eid-e-Milad', year: 2025, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2025-10-01', name: 'Mahanavami / Ayudha Pooja', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti / Vijayadashami', year: 2025, region: 'India', type: 'National Holiday' },
  { date: '2025-10-20', name: 'Naraka Chaturdashi', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-10-22', name: 'Balipadyami / Deepavali', year: 2025, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2025-11-01', name: 'Kannada Rajyotsava', year: 2025, region: 'Karnataka', type: 'State Holiday' },
  { date: '2025-11-08', name: 'Kanakadasa Jayanti', year: 2025, region: 'Karnataka', type: 'State Holiday' },
  { date: '2025-12-25', name: 'Christmas Day', year: 2025, region: 'India', type: 'Government Public Holiday' },

  // ==========================================
  // YEAR 2026
  // ==========================================
  { date: '2026-01-14', name: 'Makara Sankranti', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-01-26', name: 'Republic Day', year: 2026, region: 'India', type: 'National Holiday' },
  { date: '2026-02-15', name: 'Maha Shivaratri', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-03-19', name: 'Chandramana Ugadi', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr (Ramzan)', year: 2026, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2026-03-31', name: 'Mahaveer Jayanthi', year: 2026, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2026-04-03', name: 'Good Friday', year: 2026, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2026-04-14', name: 'Dr. B.R. Ambedkar Jayanti', year: 2026, region: 'India', type: 'National Holiday' },
  { date: '2026-04-20', name: 'Basava Jayanti / Akshaya Tritiya', year: 2026, region: 'Karnataka', type: 'State Holiday' },
  { date: '2026-05-01', name: 'May Day (Labour Day)', year: 2026, region: 'India', type: 'Government Public Holiday' },
  { date: '2026-05-28', name: 'Bakrid (Eid-al-Adha)', year: 2026, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2026-06-26', name: 'Muharram (Ashoora)', year: 2026, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2026-08-15', name: 'Independence Day', year: 2026, region: 'India', type: 'National Holiday' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi (Varasiddhi Vinayaka Vrata)', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanthi', year: 2026, region: 'India', type: 'National Holiday' },
  { date: '2026-10-20', name: 'Maha Navami / Ayudha Pooja & Vijayadashami', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-10-25', name: 'Maharshi Valmiki Jayanthi', year: 2026, region: 'Karnataka', type: 'State Holiday' },
  { date: '2026-11-01', name: 'Kannada Rajyotsava', year: 2026, region: 'Karnataka', type: 'State Holiday' },
  { date: '2026-11-08', name: 'Naraka Chaturdashi', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-11-10', name: 'Balipadyami / Deepavali', year: 2026, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2026-11-27', name: 'Kanakadasa Jayanthi', year: 2026, region: 'Karnataka', type: 'State Holiday' },
  { date: '2026-12-25', name: 'Christmas Day', year: 2026, region: 'India', type: 'Government Public Holiday' },

  // ==========================================
  // YEAR 2027
  // ==========================================
  { date: '2027-01-15', name: 'Makara Sankranti', year: 2027, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2027-01-26', name: 'Republic Day', year: 2027, region: 'India', type: 'National Holiday' },
  { date: '2027-03-06', name: 'Maha Shivaratri', year: 2027, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2027-03-10', name: 'Eid-ul-Fitr (Ramzan)', year: 2027, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2027-04-07', name: 'Ugadi', year: 2027, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2027-04-14', name: 'Dr. B.R. Ambedkar Jayanti', year: 2027, region: 'India', type: 'National Holiday' },
  { date: '2027-05-01', name: 'May Day (Labour Day)', year: 2027, region: 'India', type: 'Government Public Holiday' },
  { date: '2027-05-17', name: 'Bakrid (Eid-al-Adha)', year: 2027, region: 'Karnataka', type: 'Government Public Holiday' },
  { date: '2027-08-15', name: 'Independence Day', year: 2027, region: 'India', type: 'National Holiday' },
  { date: '2027-09-04', name: 'Ganesh Chaturthi', year: 2027, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2027-10-02', name: 'Mahatma Gandhi Jayanthi', year: 2027, region: 'India', type: 'National Holiday' },
  { date: '2027-10-10', name: 'Ayudha Pooja / Vijayadashami', year: 2027, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2027-10-29', name: 'Deepavali', year: 2027, region: 'Karnataka', type: 'Festival Holiday' },
  { date: '2027-11-01', name: 'Kannada Rajyotsava', year: 2027, region: 'Karnataka', type: 'State Holiday' },
  { date: '2027-12-25', name: 'Christmas Day', year: 2027, region: 'India', type: 'Government Public Holiday' },
];

/**
 * Check if a given date string (YYYY-MM-DD) is a Sunday
 */
export function isSundayDate(dateStr: string): boolean {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d);
  return dt.getDay() === 0;
}

/**
 * Retrieve the holiday definition for a specific date (YYYY-MM-DD), if one exists
 */
export function getKarnatakaHolidayForDate(dateStr: string): Holiday | undefined {
  return KARNATAKA_HOLIDAYS.find((h) => h.date === dateStr);
}

/**
 * Retrieve all holidays for a given month and year
 * @param year e.g. 2026
 * @param month 1 to 12
 */
export function getKarnatakaHolidaysForMonth(year: number, month: number): Holiday[] {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  return KARNATAKA_HOLIDAYS.filter((h) => h.date.startsWith(monthPrefix));
}

/**
 * Helper to get the number of days in a specific month
 * @param year e.g. 2026
 * @param month 1 to 12
 */
export function getDaysInMonthCount(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export type DayAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'SUNDAY'
  | 'HOLIDAY'
  | 'UPCOMING'
  | 'TODAY_NOT_MARKED';

export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1 to 31
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: string; // 'Mon', 'Tue', etc.
  isSunday: boolean;
  holiday?: Holiday;
  isHoliday: boolean;
  isWorkingDay: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  status: DayAttendanceStatus;
  attendanceRecord?: any;
}

export interface MonthlyAttendanceCalculation {
  year: number;
  month: number; // 1 to 12
  monthName: string;
  totalCalendarDays: number;
  sundays: number;
  holidays: number; // Count of non-Sunday holidays reducing working days
  allHolidaysCount: number; // Total holidays in the month including Sunday
  sundayHolidaysCount: number; // Overlap
  totalWorkingDays: number; // Total working days in month
  workingDays: number; // Alias for backward compatibility
  workingDaysElapsed: number; // Working days elapsed up to today (Present + Absent)
  remainingWorkingDays: number; // Future working days after today
  present: number; // Attendance records on elapsed working days
  absent: number; // Past working days without attendance
  upcoming: number; // Future working days count
  todayNotMarked: number; // Today working day without attendance count
  days: CalendarDayInfo[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(monthIndex1to12: number): string {
  return MONTH_NAMES[monthIndex1to12 - 1] || `Month ${monthIndex1to12}`;
}

/**
 * Returns the current date in YYYY-MM-DD format using Asia/Kolkata timezone.
 */
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Computes the complete monthly calendar days, attendance status, and automated summary.
 *
 * Strict Business & Attendance Rules:
 * 1. Sunday is marked as SUNDAY / WEEKLY HOLIDAY. It is NOT counted as absent and NOT counted as a working day.
 * 2. Karnataka/India government holiday is marked as HOLIDAY. It is NOT counted as absent and NOT counted as a working day.
 * 3. A holiday that falls on Sunday is NOT double-counted. It still counts as exactly ONE non-working day.
 * 4. Working Days = Total Calendar Days - Sundays - Applicable Non-Sunday Holidays.
 * 5. On working days:
 *    - BEFORE TODAY:
 *         Has valid attendance -> PRESENT
 *         No attendance -> ABSENT
 *    - TODAY:
 *         Has valid attendance -> PRESENT
 *         No attendance -> TODAY_NOT_MARKED (NOT absent!)
 *    - AFTER TODAY (FUTURE):
 *         Marked as UPCOMING (never absent, never present, never completed working day)
 * 6. Working Days Elapsed = Present + Absent (Strictly satisfied!).
 * 7. Remaining Working Days = Total Working Days - Working Days Elapsed.
 */
export function calculateMonthlyAttendance(
  year: number,
  month: number, // 1 to 12
  attendanceRecords: any[],
  currentDateOverride?: string
): MonthlyAttendanceCalculation {
  const totalDays = getDaysInMonthCount(year, month);
  const monthStr = String(month).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;
  const todayStr = currentDateOverride || getTodayDateString();

  // Index attendance records by date for fast O(1) lookup
  const attendanceByDate = new Map<string, any>();
  attendanceRecords.forEach((rec) => {
    if (rec && rec.date && rec.date.startsWith(monthPrefix)) {
      // Prioritize positive/present records
      const isPresentStatus =
        rec.status === 'Present' ||
        rec.status === 'Logged In' ||
        rec.status === 'Completed' ||
        rec.status === 'Active' ||
        !rec.status;
      if (!attendanceByDate.has(rec.date) || isPresentStatus) {
        attendanceByDate.set(rec.date, rec);
      }
    }
  });

  const days: CalendarDayInfo[] = [];
  let sundaysCount = 0;
  let nonSundayHolidaysCount = 0;
  let sundayHolidaysCount = 0;
  let presentCount = 0;
  let absentCount = 0;
  let upcomingWorkingDaysCount = 0;
  let todayNotMarkedCount = 0;

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dayStr = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const dt = new Date(year, month - 1, dayNum);
    const dayOfWeek = dt.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const isSunday = dayOfWeek === 0;
    const holiday = getKarnatakaHolidayForDate(dateStr);
    const isHoliday = Boolean(holiday);

    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;

    if (isSunday) {
      sundaysCount++;
      if (isHoliday) {
        sundayHolidaysCount++;
      }
    } else if (isHoliday) {
      nonSundayHolidaysCount++;
    }

    // A working day is any day that is neither Sunday nor a Holiday
    const isWorkingDay = !isSunday && !isHoliday;

    let status: DayAttendanceStatus;
    const record = attendanceByDate.get(dateStr);
    const hasPresentRecord =
      record &&
      (record.status === 'Present' ||
        record.status === 'Logged In' ||
        record.status === 'Completed' ||
        record.status === 'Active' ||
        !record.status);

    if (isSunday) {
      status = 'SUNDAY';
    } else if (isHoliday) {
      status = 'HOLIDAY';
    } else {
      // It is a working day
      if (isPast) {
        if (hasPresentRecord) {
          status = 'PRESENT';
          presentCount++;
        } else {
          status = 'ABSENT';
          absentCount++;
        }
      } else if (isToday) {
        if (hasPresentRecord) {
          status = 'PRESENT';
          presentCount++;
        } else {
          status = 'TODAY_NOT_MARKED';
          todayNotMarkedCount++;
        }
      } else {
        // Future working day
        status = 'UPCOMING';
        upcomingWorkingDaysCount++;
      }
    }

    days.push({
      date: dateStr,
      dayNumber: dayNum,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isSunday,
      holiday,
      isHoliday,
      isWorkingDay,
      isToday,
      isPast,
      isFuture,
      status,
      attendanceRecord: record,
    });
  }

  // Working Days formula:
  // Total calendar days - Sundays - Applicable Non-Sunday Holidays
  const totalWorkingDays = totalDays - sundaysCount - nonSundayHolidaysCount;

  // Working Days Elapsed (Present + Absent = Working Days Elapsed)
  const workingDaysElapsed = presentCount + absentCount;

  // Remaining Working Days (Future working days + today if not yet marked)
  const remainingWorkingDays = totalWorkingDays - workingDaysElapsed;

  // Total holidays in month
  const allHolidaysCount = nonSundayHolidaysCount + sundayHolidaysCount;

  return {
    year,
    month,
    monthName: getMonthName(month),
    totalCalendarDays: totalDays,
    sundays: sundaysCount,
    holidays: nonSundayHolidaysCount,
    allHolidaysCount,
    sundayHolidaysCount,
    totalWorkingDays,
    workingDays: totalWorkingDays,
    workingDaysElapsed,
    remainingWorkingDays,
    present: presentCount,
    absent: absentCount,
    upcoming: upcomingWorkingDaysCount,
    todayNotMarked: todayNotMarkedCount,
    days,
  };
}

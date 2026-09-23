// Asia/Kolkata timezone and attendance duration calculations

export function parseKolkataDateTime(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!timeStr) return null;
  const cleanTime = String(timeStr).trim();
  if (!cleanTime) return null;

  // If cleanTime is already a full ISO string (e.g. 2026-09-21T12:38:23.000Z)
  if (cleanTime.includes('T') || (cleanTime.includes('-') && cleanTime.length >= 19)) {
    const d = new Date(cleanTime);
    if (!isNaN(d.getTime())) return d;
  }

  const cleanDate = String(dateStr || '').trim();
  let year = '';
  let month = '';
  let day = '';

  const dateParts = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateParts) {
    year = dateParts[1];
    month = dateParts[2];
    day = dateParts[3];
  } else {
    // Fallback to today in IST
    try {
      const todayIST = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const parts = todayIST.split('-');
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } catch {
      const fallbackParts = new Date().toISOString().split('T')[0].split('-');
      year = fallbackParts[0];
      month = fallbackParts[1];
      day = fallbackParts[2];
    }
  }

  // 12-hour AM/PM format, e.g. "12:38:23 PM" or "02:09:35 PM" or "12:38 PM"
  const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const second = match12[3] ? parseInt(match12[3], 10) : 0;
    const period = match12[4].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    const iso = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+05:30`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  // 24-hour format, e.g. "18:27:02" or "18:27"
  const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    const second = match24[3] ? parseInt(match24[3], 10) : 0;
    const iso = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+05:30`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  // Direct Date parsing fallback
  const fallback = new Date(`${cleanDate} ${cleanTime}`);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

/**
 * Checks whether a duration string is missing, blank, or an uncalculated placeholder
 * (such as "0h 00m", "00h 00m", "0h", "0m", "00:00", "0", "In Progress", etc.).
 */
export function isZeroOrMissingDuration(duration?: string | null): boolean {
  if (!duration) return true;
  const clean = duration.trim().toLowerCase();
  if (!clean || clean === 'in progress' || clean === 'pending' || clean === 'calculated' || clean === '--:--') {
    return true;
  }
  if (
    clean === '0h 00m' ||
    clean === '00h 00m' ||
    clean === '0h 0m' ||
    clean === '0h' ||
    clean === '0m' ||
    clean === '00:00' ||
    clean === '0:00' ||
    clean === '0'
  ) {
    return true;
  }
  return /^0+h\s*0+m$/i.test(clean);
}

/**
 * Accurately calculates duration between login and logout in "Xh YYm" format.
 * Supports crossing midnight (e.g. login 10:00 PM, logout 04:00 AM).
 */
export function calculateAttendanceDuration(
  dateStr?: string | null,
  loginTime?: string | null,
  logoutTime?: string | null
): string {
  if (!loginTime || !logoutTime) return '0h 00m';
  const start = parseKolkataDateTime(dateStr, loginTime);
  const end = parseKolkataDateTime(dateStr, logoutTime);
  if (!start || !end) return '0h 00m';

  let diffMs = end.getTime() - start.getTime();
  // If logout timestamp is earlier than login timestamp, handle overnight shift
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

/**
 * Computes live elapsed duration for active sessions that are currently logged in.
 */
export function getLiveActiveDuration(
  dateStr?: string | null,
  loginTime?: string | null,
  currentTimeStr?: string | null
): string {
  if (!loginTime) return '0h 00m';
  return calculateAttendanceDuration(dateStr, loginTime, currentTimeStr || undefined);
}

import { WorkLog, User, RankingItem, TaskType, TASK_OPTIONS } from '../types';

/**
 * Reusable helper to check if a date string (YYYY-MM-DD) falls within a period
 */
export function isWithinPeriod(dateStr?: string, period?: 'today' | 'week' | 'month' | 'year', referenceDate = new Date()): boolean {
  if (!dateStr || !period) return false;
  if (period === 'today') return isToday(dateStr, referenceDate);
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return false;

  const now = new Date(referenceDate);

  if (period === 'week') {
    // Current week starting Monday
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return target >= startOfWeek && target <= endOfWeek;
  }

  if (period === 'month') {
    return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
  }

  if (period === 'year') {
    return target.getFullYear() === now.getFullYear();
  }

  return false;
}

/**
 * Reusable helper to check if a date string (YYYY-MM-DD) falls within a custom date range
 */
export function isWithinDateRange(dateStr?: string, startDate?: string, endDate?: string): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return false;
  if (startDate) {
    const start = new Date(startDate + 'T00:00:00');
    if (!isNaN(start.getTime()) && target < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate + 'T23:59:59.999');
    if (!isNaN(end.getTime()) && target > end) return false;
  }
  return true;
}

/**
 * Helper to check if a work log is today
 */
export function isToday(dateStr?: string, referenceDate = new Date()): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return false;
  const now = new Date(referenceDate);
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

/**
 * Helper to get a log's effective date
 */
export function getLogDate(log: WorkLog): string {
  return log.requestedDate || log.date || '';
}

/**
 * Helper to get a log's normalized task type
 */
export function getLogTask(log: WorkLog): TaskType {
  if (log.task && TASK_OPTIONS.includes(log.task)) return log.task;
  const cat = (log.category || '').toLowerCase();
  if (cat.includes('shooting') || cat.includes('camera')) return 'Shootings';
  if (cat.includes('photo')) return 'Photos';
  if (cat.includes('thumbnail')) return 'Thumbnail';
  if (cat.includes('reel') || cat.includes('social')) return 'Reels';
  if (cat.includes('short')) return 'Shorts';
  if (cat.includes('edit') || cat.includes('video') || cat.includes('color') || cat.includes('youtube')) return 'Videos';
  return 'Others';
}

/**
 * Helper to check if a log is completed
 */
export function isLogCompleted(log: WorkLog): boolean {
  return log.status === 'Completed' || log.workDone === 'Yes';
}

/**
 * Base score calculation for a set of work logs
 * - Completed = 1.0 * priorityMultiplier
 * - In Progress = 0.5 * priorityMultiplier
 * - Pending = 0.0
 * Priority multipliers: High = 1.25, Medium = 1.0, Low = 0.85
 */
export function calculateScoreFromLogs(logs: WorkLog[]): {
  kpiScore: number;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
  completionRate: number;
  deliverables: number;
} {
  if (logs.length === 0) {
    return {
      kpiScore: 0, // No records yet -> 0%, truthful empty state!
      completed: 0,
      inProgress: 0,
      pending: 0,
      total: 0,
      completionRate: 0,
      deliverables: 0,
    };
  }

  let totalWeight = 0;
  let earnedScore = 0;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let deliverables = 0;

  for (const log of logs) {
    let priorityWeight = 1.0;
    if (log.priority === 'High') priorityWeight = 1.25;
    else if (log.priority === 'Low') priorityWeight = 0.85;

    totalWeight += priorityWeight;
    const qty = typeof log.quantity === 'number' && log.quantity > 0 ? log.quantity : 1;

    if (isLogCompleted(log)) {
      earnedScore += 1.0 * priorityWeight;
      completed += 1;
      deliverables += qty;
    } else if (log.status === 'In Progress') {
      earnedScore += 0.5 * priorityWeight;
      inProgress += 1;
    } else {
      pending += 1;
    }
  }

  const rawRatio = totalWeight > 0 ? (earnedScore / totalWeight) * 100 : 0;
  const roundedKPI = Math.min(100, Math.max(0, Math.round(rawRatio)));
  const completionRate = logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0;

  return {
    kpiScore: roundedKPI,
    completed,
    inProgress,
    pending,
    total: logs.length,
    completionRate,
    deliverables,
  };
}

/**
 * Reusable KPI functions for a user
 */
export function calculateWeeklyKPI(employeeId: string, logs: WorkLog[]): number {
  const filtered = logs.filter(
    (l) => l.employeeId === employeeId && isWithinPeriod(getLogDate(l), 'week')
  );
  return calculateScoreFromLogs(filtered).kpiScore;
}

export function calculateMonthlyKPI(employeeId: string, logs: WorkLog[]): number {
  const filtered = logs.filter(
    (l) => l.employeeId === employeeId && isWithinPeriod(getLogDate(l), 'month')
  );
  return calculateScoreFromLogs(filtered).kpiScore;
}

export function calculateYearlyKPI(employeeId: string, logs: WorkLog[]): number {
  const filtered = logs.filter(
    (l) => l.employeeId === employeeId && isWithinPeriod(getLogDate(l), 'year')
  );
  return calculateScoreFromLogs(filtered).kpiScore;
}

export function getEmployeePeriodStats(employeeId: string, logs: WorkLog[], period: 'week' | 'month' | 'year') {
  const filtered = logs.filter(
    (l) => l.employeeId === employeeId && isWithinPeriod(getLogDate(l), period)
  );
  return calculateScoreFromLogs(filtered);
}

/**
 * Specific Task breakdown count (Videos, Shorts, Reels, Photos, Shootings, Others)
 * Calculated strictly from real saved records for the selected period
 */
export function getTaskBreakdown(logs: WorkLog[], period?: 'today' | 'week' | 'month' | 'year'): Record<TaskType, { tasks: number; deliverables: number; completed: number }> {
  const breakdown: Record<TaskType, { tasks: number; deliverables: number; completed: number }> = {
    Videos: { tasks: 0, deliverables: 0, completed: 0 },
    Shorts: { tasks: 0, deliverables: 0, completed: 0 },
    Reels: { tasks: 0, deliverables: 0, completed: 0 },
    Photos: { tasks: 0, deliverables: 0, completed: 0 },
    Thumbnail: { tasks: 0, deliverables: 0, completed: 0 },
    Shootings: { tasks: 0, deliverables: 0, completed: 0 },
    Others: { tasks: 0, deliverables: 0, completed: 0 },
  };

  const filteredLogs = period ? logs.filter((l) => isWithinPeriod(getLogDate(l), period)) : logs;

  for (const log of filteredLogs) {
    const task = getLogTask(log);
    const qty = typeof log.quantity === 'number' && log.quantity > 0 ? log.quantity : 1;
    const completed = isLogCompleted(log);

    breakdown[task].tasks += 1;
    if (completed) {
      breakdown[task].completed += 1;
      breakdown[task].deliverables += qty;
    }
  }

  return breakdown;
}

/**
 * Work Trend calculation for Today, Week, Month, and Year periods
 */
export function getTrendData(logs: WorkLog[], period: 'today' | 'week' | 'month' | 'year'): { label: string; completed: number; total: number; deliverables: number }[] {
  const now = new Date();

  if (period === 'today') {
    const todayLogs = logs.filter((l) => isToday(getLogDate(l)));
    const slots = [
      { label: '08:00', minHour: 0, maxHour: 9 },
      { label: '10:00', minHour: 9, maxHour: 11 },
      { label: '12:00', minHour: 11, maxHour: 13 },
      { label: '14:00', minHour: 13, maxHour: 15 },
      { label: '16:00', minHour: 15, maxHour: 17 },
      { label: '18:00', minHour: 17, maxHour: 19 },
      { label: '20:00', minHour: 19, maxHour: 24 },
    ];

    return slots.map((s) => {
      const slotLogs = todayLogs.filter((l) => {
        let hour = 12;
        if (l.createdAt) {
          const d = new Date(l.createdAt);
          if (!isNaN(d.getTime())) hour = d.getHours();
        }
        return hour >= s.minHour && hour < s.maxHour;
      });
      const completed = slotLogs.filter(isLogCompleted).length;
      const deliverables = slotLogs.reduce(
        (acc, l) => acc + (isLogCompleted(l) ? (typeof l.quantity === 'number' && l.quantity > 0 ? l.quantity : 1) : 0),
        0
      );
      return {
        label: s.label,
        completed,
        total: slotLogs.length,
        deliverables,
      };
    });
  }

  if (period === 'week') {
    // Mon through Sun of current week
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);

    return days.map((label, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      const dateStr = d.toISOString().split('T')[0];

      const dayLogs = logs.filter((l) => getLogDate(l) === dateStr);
      const completed = dayLogs.filter(isLogCompleted).length;
      const deliverables = dayLogs.reduce(
        (acc, l) => acc + (isLogCompleted(l) ? (typeof l.quantity === 'number' && l.quantity > 0 ? l.quantity : 1) : 0),
        0
      );

      return {
        label,
        completed,
        total: dayLogs.length,
        deliverables,
      };
    });
  }

  if (period === 'month') {
    // Current month 4 or 5 weeks
    const monthLogs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'month'));

    const weeks = [
      { label: 'Week 1 (1-7)', start: 1, end: 7 },
      { label: 'Week 2 (8-14)', start: 8, end: 14 },
      { label: 'Week 3 (15-21)', start: 15, end: 21 },
      { label: 'Week 4 (22-28)', start: 22, end: 28 },
      { label: 'Week 5 (29+)', start: 29, end: 31 },
    ];

    return weeks.map((w) => {
      const wLogs = monthLogs.filter((l) => {
        const d = new Date(getLogDate(l) + 'T00:00:00');
        const dayOfMonth = d.getDate();
        return dayOfMonth >= w.start && dayOfMonth <= w.end;
      });
      const completed = wLogs.filter(isLogCompleted).length;
      const deliverables = wLogs.reduce(
        (acc, l) => acc + (isLogCompleted(l) ? (typeof l.quantity === 'number' && l.quantity > 0 ? l.quantity : 1) : 0),
        0
      );
      return {
        label: w.label,
        completed,
        total: wLogs.length,
        deliverables,
      };
    });
  }

  // period === 'year'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearLogs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'year'));

  return months.map((label, monthIndex) => {
    const mLogs = yearLogs.filter((l) => {
      const d = new Date(getLogDate(l) + 'T00:00:00');
      return d.getMonth() === monthIndex;
    });
    const completed = mLogs.filter(isLogCompleted).length;
    const deliverables = mLogs.reduce(
      (acc, l) => acc + (isLogCompleted(l) ? (typeof l.quantity === 'number' && l.quantity > 0 ? l.quantity : 1) : 0),
      0
    );
    return {
      label,
      completed,
      total: mLogs.length,
      deliverables,
    };
  });
}

/**
 * Status summary (Completed, In Progress, Pending)
 */
export function getStatusSummary(logs: WorkLog[], period?: 'today' | 'week' | 'month' | 'year'): {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
  completedPercent: number;
  inProgressPercent: number;
  pendingPercent: number;
} {
  const filtered = period ? logs.filter((l) => isWithinPeriod(getLogDate(l), period)) : logs;
  const total = filtered.length;
  if (total === 0) {
    return {
      completed: 0,
      inProgress: 0,
      pending: 0,
      total: 0,
      completedPercent: 0,
      inProgressPercent: 0,
      pendingPercent: 0,
    };
  }

  let completed = 0;
  let inProgress = 0;
  let pending = 0;

  for (const l of filtered) {
    if (l.status === 'Completed' || l.workDone === 'Yes') completed += 1;
    else if (l.status === 'In Progress') inProgress += 1;
    else pending += 1;
  }

  return {
    completed,
    inProgress,
    pending,
    total,
    completedPercent: Math.round((completed / total) * 100),
    inProgressPercent: Math.round((inProgress / total) * 100),
    pendingPercent: Math.round((pending / total) * 100),
  };
}

/**
 * Productivity summary across Today, Week, Month, Year
 */
export function getProductivitySummary(logs: WorkLog[]): {
  today: { tasks: number; deliverables: number };
  week: { tasks: number; deliverables: number };
  month: { tasks: number; deliverables: number };
  year: { tasks: number; deliverables: number };
} {
  const sumDeliverables = (arr: WorkLog[]) =>
    arr.reduce((acc, l) => acc + (isLogCompleted(l) ? (typeof l.quantity === 'number' && l.quantity > 0 ? l.quantity : 1) : 0), 0);

  const todayLogs = logs.filter((l) => isToday(getLogDate(l)));
  const weekLogs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'week'));
  const monthLogs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'month'));
  const yearLogs = logs.filter((l) => isWithinPeriod(getLogDate(l), 'year'));

  return {
    today: {
      tasks: todayLogs.filter(isLogCompleted).length,
      deliverables: sumDeliverables(todayLogs),
    },
    week: {
      tasks: weekLogs.filter(isLogCompleted).length,
      deliverables: sumDeliverables(weekLogs),
    },
    month: {
      tasks: monthLogs.filter(isLogCompleted).length,
      deliverables: sumDeliverables(monthLogs),
    },
    year: {
      tasks: yearLogs.filter(isLogCompleted).length,
      deliverables: sumDeliverables(yearLogs),
    },
  };
}

/**
 * Team Ranking calculation for any period
 */
export function calculateEmployeeRanking(
  period: 'week' | 'month' | 'year',
  employees: User[],
  logs: WorkLog[]
): RankingItem[] {
  const activeEmployees = employees.filter((e) => e.status === 'Active');

  const items: RankingItem[] = activeEmployees.map((emp) => {
    const periodLogs = logs.filter(
      (l) => l.employeeId === emp.id && isWithinPeriod(getLogDate(l), period)
    );
    const stats = calculateScoreFromLogs(periodLogs);

    // Calculate active days with logs
    const activeDates = new Set(periodLogs.map((l) => getLogDate(l)));
    const activeDays = activeDates.size;

    let taskPoints = 0;
    for (const l of periodLogs) {
      const weight = l.priority === 'High' ? 1.25 : l.priority === 'Low' ? 0.85 : 1.0;
      if (isLogCompleted(l)) taskPoints += 10 * weight;
      else if (l.status === 'In Progress') taskPoints += 5 * weight;
    }
    const consistencyBonus = activeDays * 3;
    const rankingScore = Math.round(taskPoints + (stats.kpiScore * 0.5) + consistencyBonus);

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      employeeEmail: emp.email,
      role: emp.role,
      kpiScore: stats.kpiScore,
      completedTasks: stats.completed,
      totalTasks: stats.total,
      completionRate: stats.completionRate,
      rankingScore,
      activeDays,
      rank: 1,
    };
  });

  items.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
    if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
    return b.kpiScore - a.kpiScore;
  });

  return items.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export function calculateEmployeeOfMonth(
  employees: User[],
  logs: WorkLog[],
  period: 'month' | 'week' | 'year' = 'month'
): RankingItem | null {
  const ranking = calculateEmployeeRanking(period, employees, logs);
  return ranking.length > 0 ? ranking[0] : null;
}

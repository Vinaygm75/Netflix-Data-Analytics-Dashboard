export type Role = 'ADMIN' | 'EMPLOYEE';

export type TaskType =
  | 'Videos'
  | 'Shorts'
  | 'Reels'
  | 'Photos'
  | 'Thumbnail'
  | 'Shootings'
  | 'Others';

export const TASK_OPTIONS: TaskType[] = [
  'Videos',
  'Shorts',
  'Reels',
  'Photos',
  'Thumbnail',
  'Shootings',
  'Others',
];

export const TASK_TITLE_LABELS: Record<TaskType, string> = {
  Videos: 'Video Title',
  Shorts: 'Short Title',
  Reels: 'Reel Title',
  Photos: 'Photo Title',
  Thumbnail: 'Thumbnail Title',
  Shootings: 'Shooting Title',
  Others: 'Work Title',
};

export type WorkCategory =
  | 'Video Editing'
  | 'Video Shooting'
  | 'Photography'
  | 'Reel'
  | 'YouTube'
  | 'Social Media'
  | 'Client Work'
  | 'Internal Work'
  | 'Other';

export type WorkStatus = 'Completed' | 'In Progress' | 'Pending';

export type Priority = 'Low' | 'Medium' | 'High';

export type WorkDoneOption = 'Yes' | 'No';

export type NoteStatus = 'Upcoming' | 'In Progress' | 'Completed';

export interface User {
  id: string; // e.g. admin-junty or EMP001
  name: string;
  loginId?: string;
  email: string;
  googleUserId?: string;
  profileImage?: string;
  role: Role;
  status: 'Active' | 'Inactive';
  createdAt: string;
  lastLoginAt?: string;
  hasLoggedIn?: boolean;
}

export interface WorkLog {
  id: string; // e.g. WL001
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  task: TaskType;
  title: string;
  status: WorkStatus;
  requestedBy: string;
  requestedDate: string; // YYYY-MM-DD
  quantity: number; // Deliverables count (e.g. 1, 2, 5, 10)
  workDone: WorkDoneOption; // 'Yes' | 'No'
  thumbnail?: string; // Persistent URL or path for Task Thumbnail
  createdAt: string;
  updatedAt: string;

  // Backwards compatibility optional fields
  date?: string;
  description?: string;
  category?: WorkCategory | string;
  priority?: Priority;
  timeSpent?: string;
  clientProject?: string;
  notes?: string;
}

export interface Preset {
  id: string; // e.g. PRESET001
  employeeId: string;
  employeeEmail: string;
  presetName?: string; // Optional user friendly name for the preset
  task: TaskType;
  title: string;
  requestedBy: string;
  quantity?: number;
  workDone?: WorkDoneOption;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string; // e.g. NOTE-101
  employeeId: string;
  employeeEmail: string;
  title: string;
  content: string;
  category: string;
  dueDate?: string; // YYYY-MM-DD
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KPIRecord {
  employeeId: string;
  employeeName: string;
  weeklyKPI: number;
  monthlyKPI: number;
  yearlyKPI: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  totalTasks: number;
  completionRate: number;
}

export interface RankingItem {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  role: Role;
  kpiScore: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  rankingScore: number;
  activeDays: number;
  rank: number;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  googleAuthConnected: boolean;
  googleSheetsConnected: boolean;
  googleDriveConnected: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetName: string;
  configuredVia: 'environment' | 'settings' | 'central_sheet';
  lastSync: string;
  itemsCount: {
    employees: number;
    workLogs: number;
    notes: number;
  };
  sheets: {
    name: string;
    description: string;
    rowCount: number;
  }[];
}

export interface AttendanceRecord {
  id: string; // e.g. ATT_123456
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  loginTime: string; // e.g. "09:30 AM"
  logoutTime?: string; // e.g. "06:15 PM"
  duration?: string; // e.g. "8h 45m" (Login Duration)
  activeHours?: string; // e.g. "5h 48m" (Active Hours: Real Mac activity intersected with session)
  activeSeconds?: number;
  status: 'Logged In' | 'Completed' | 'Present' | 'Active';
  createdAt: string;
  updatedAt: string;
}

export type ComputerActivityState =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SLEEPING'
  | 'LOCKED'
  | 'OFFLINE'
  | 'PERMISSION_REQUIRED';

export interface ComputerDevice {
  id: string; // e.g. FW-MAC-M4PRO01
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  deviceModel: string; // e.g. Mac mini (Apple M4)
  macOSVersion?: string; // e.g. macOS 15.0 Sequoia
  status: 'Active' | 'Revoked' | 'Inactive';
  registeredAt: string;
  lastSeenAt: string;
  deviceSecretHash?: string;
  isRegisteredAgent?: boolean;
}

export interface ComputerActivityInterval {
  id: string;
  deviceId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO String
  endTime: string; // ISO String
  durationSeconds: number;
  state: 'ACTIVE';
  createdAt: string;
}

export interface ComputerDailySummary {
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  deviceId: string;
  deviceModel?: string;
  totalActiveSeconds: number;
  activeFormatted: string; // e.g. "6h 32m"
  intervalsCount: number;
  lastState: ComputerActivityState;
  lastHeartbeatAt: string;
  lastInputType?: 'keyboard' | 'mouse' | 'none';
}

export interface ComputerEmployeeOverview {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role: Role;
  device: ComputerDevice | null;
  currentState: ComputerActivityState;
  todayActiveSeconds: number;
  todayActiveFormatted: string;
  weeklyActiveSeconds: number;
  weeklyActiveFormatted: string;
  monthlyActiveSeconds: number;
  monthlyActiveFormatted: string;
  lastSeen: string;
  intervals: ComputerActivityInterval[];
}

// ============================================================================
// SHARED COMPUTER ACTIVITY CONSTANTS
// ============================================================================
/** Inactivity threshold in seconds (5 minutes = 300 seconds) before marking employee as INACTIVE */
export const INACTIVITY_THRESHOLD_SECONDS = 300;
/** Heartbeat interval in seconds (30 seconds) */
export const HEARTBEAT_INTERVAL_SECONDS = 30;
/** Grace period for offline detection in seconds (90 seconds) */
export const OFFLINE_GRACE_PERIOD_SECONDS = 90;


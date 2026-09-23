export type ActivityState =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SLEEPING'
  | 'LOCKED'
  | 'OFFLINE'
  | 'PERMISSION_REQUIRED';

export type InputActivityType = 'keyboard' | 'mouse' | 'none';

export interface DeviceRegistration {
  deviceId: string; // e.g. FW-MAC-M4PRO01
  deviceSecret: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  deviceModel: string; // e.g. "Mac mini (Apple M4)" or "Mac mini (Apple M2 Pro)"
  macOSVersion?: string;
  serverUrl: string;
  registeredAt: string;
}

export interface ActivitySnapshot {
  timestamp: string;
  state: ActivityState;
  isAwake: boolean;
  isDisplayActive: boolean;
  isSessionUnlocked: boolean;
  idleSeconds: number;
  lastInputType: InputActivityType;
  lastInputTimestamp: string;
}

export interface HeartbeatPayload {
  deviceId: string;
  deviceSecret: string;
  timestamp: string; // ISO 8601
  state: ActivityState;
  activityDetail: {
    lastInputSecondsAgo: number;
    inputType: InputActivityType;
    idleSeconds: number;
  };
  agentVersion: string;
  deviceModel?: string;
  macosVersion?: string;
}

export interface HeartbeatResponse {
  success: boolean;
  currentDayActiveSeconds?: number;
  activeFormatted?: string;
  serverTime?: string;
  message?: string;
  error?: string;
}

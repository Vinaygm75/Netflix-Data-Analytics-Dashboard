export interface AgentConfig {
  /** Inactivity threshold in seconds before marking user as INACTIVE. Default: 300 (5 minutes) */
  inactivityThresholdSeconds: number;
  /** Heartbeat interval to server in seconds. Default: 30 seconds */
  heartbeatIntervalSeconds: number;
  /** Grace period for offline detection in seconds */
  offlineGracePeriodSeconds: number;
  /** Backend server URL */
  serverUrl: string;
  /** Local storage directory for agent settings and offline queue */
  configDir: string;
  /** Local config file path */
  configFile: string;
  /** Local offline heartbeat queue file path */
  offlineQueueFile: string;
}

// Configurable constants as requested by user prompt
export const INACTIVITY_THRESHOLD_SECONDS = 300; // 5 minutes default
export const HEARTBEAT_INTERVAL_SECONDS = 30;    // 30 seconds default
export const OFFLINE_GRACE_PERIOD_SECONDS = 90;  // 90 seconds grace period

export function getAgentConfig(): AgentConfig {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const configDir = `${homeDir}/Library/Application Support/FlyingWhalesAgent`;
  return {
    inactivityThresholdSeconds: parseInt(process.env.FW_INACTIVITY_THRESHOLD || String(INACTIVITY_THRESHOLD_SECONDS), 10),
    heartbeatIntervalSeconds: parseInt(process.env.FW_HEARTBEAT_INTERVAL || String(HEARTBEAT_INTERVAL_SECONDS), 10),
    offlineGracePeriodSeconds: OFFLINE_GRACE_PERIOD_SECONDS,
    serverUrl: process.env.FW_SERVER_URL || 'http://localhost:3000',
    configDir,
    configFile: `${configDir}/config.json`,
    offlineQueueFile: `${configDir}/offline_queue.json`,
  };
}

import fs from 'fs';
import path from 'path';
import { HeartbeatPayload, HeartbeatResponse, DeviceRegistration, ActivityState } from './types';
import { AgentConfig } from './config';

export class HeartbeatClient {
  private config: AgentConfig;
  private registration: DeviceRegistration | null = null;
  private offlineQueue: HeartbeatPayload[] = [];
  private isOnline: boolean = true;

  constructor(config: AgentConfig, registration?: DeviceRegistration) {
    this.config = config;
    if (registration) {
      this.registration = registration;
    } else {
      this.loadRegistration();
    }
    this.loadOfflineQueue();
  }

  public setRegistration(reg: DeviceRegistration) {
    this.registration = reg;
    this.saveRegistration();
  }

  public getRegistration(): DeviceRegistration | null {
    return this.registration;
  }

  private loadRegistration() {
    try {
      if (fs.existsSync(this.config.configFile)) {
        const raw = fs.readFileSync(this.config.configFile, 'utf-8');
        this.registration = JSON.parse(raw);
      }
    } catch {
      this.registration = null;
    }
  }

  private saveRegistration() {
    try {
      if (!fs.existsSync(this.config.configDir)) {
        fs.mkdirSync(this.config.configDir, { recursive: true });
      }
      if (this.registration) {
        fs.writeFileSync(this.config.configFile, JSON.stringify(this.registration, null, 2), 'utf-8');
      }
    } catch (e: any) {
      console.error('[HEARTBEAT] Failed to save config:', e?.message);
    }
  }

  private loadOfflineQueue() {
    try {
      if (fs.existsSync(this.config.offlineQueueFile)) {
        const raw = fs.readFileSync(this.config.offlineQueueFile, 'utf-8');
        this.offlineQueue = JSON.parse(raw);
      }
    } catch {
      this.offlineQueue = [];
    }
  }

  private saveOfflineQueue() {
    try {
      if (!fs.existsSync(this.config.configDir)) {
        fs.mkdirSync(this.config.configDir, { recursive: true });
      }
      fs.writeFileSync(this.config.offlineQueueFile, JSON.stringify(this.offlineQueue, null, 2), 'utf-8');
    } catch {
      // Ignore
    }
  }

  /**
   * Send heartbeat to server.
   */
  public async sendHeartbeat(payload: Omit<HeartbeatPayload, 'deviceId' | 'deviceSecret' | 'agentVersion'>): Promise<HeartbeatResponse> {
    if (!this.registration) {
      return { success: false, error: 'Device not registered. Please complete pairing first.' };
    }

    const fullPayload: HeartbeatPayload = {
      deviceId: this.registration.deviceId,
      deviceSecret: this.registration.deviceSecret,
      agentVersion: '1.0.0',
      deviceModel: this.registration.deviceModel,
      macosVersion: this.registration.macOSVersion,
      ...payload,
    };

    const targetUrl = `${this.registration.serverUrl || this.config.serverUrl}/api/presence/heartbeat`;

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FlyingWhales-MacOS-Agent/1.0.0 (Apple Silicon; macOS)',
        },
        body: JSON.stringify(fullPayload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as HeartbeatResponse;
      this.isOnline = true;

      // Flush offline queue if any queued
      if (this.offlineQueue.length > 0) {
        this.flushOfflineQueue();
      }

      return data;
    } catch (err: any) {
      this.isOnline = false;
      // Queue offline event (max 50 to prevent unbounded memory growth)
      if (this.offlineQueue.length < 50) {
        this.offlineQueue.push(fullPayload);
        this.saveOfflineQueue();
      }
      return {
        success: false,
        error: `Offline: ${err?.message || 'Network unavailable'}`,
      };
    }
  }

  private async flushOfflineQueue() {
    if (this.offlineQueue.length === 0 || !this.registration) return;
    const targetUrl = `${this.registration.serverUrl || this.config.serverUrl}/api/presence/heartbeat`;

    const itemsToSend = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of itemsToSend) {
      try {
        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch {
        // Stop flushing if network drops again
        break;
      }
    }
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }
}

import { ActivityMonitor } from './activity-monitor';
import { HeartbeatClient } from './heartbeat-client';
import { MacOSSystem } from './macos-system';
import { getAgentConfig, AgentConfig } from './config';
import { DeviceRegistration, ActivityState } from './types';
import { PermissionsManager } from './permissions';

export class AgentRunner {
  private config: AgentConfig;
  private monitor: ActivityMonitor;
  private client: HeartbeatClient;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private todayActiveFormatted: string = '00h 00m';

  constructor(config?: AgentConfig, registration?: DeviceRegistration) {
    this.config = config || getAgentConfig();
    this.monitor = new ActivityMonitor(this.config.inactivityThresholdSeconds);
    this.client = new HeartbeatClient(this.config, registration);
  }

  public getMonitor(): ActivityMonitor {
    return this.monitor;
  }

  public getClient(): HeartbeatClient {
    return this.client;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const hw = MacOSSystem.getHardwareDeviceInfo();
    const reg = this.client.getRegistration();

    console.log('====================================================');
    console.log('   FLYING WHALES MACOS DESKTOP ACTIVITY AGENT       ');
    console.log('====================================================');
    console.log(`Device ID:         ${reg?.deviceId || hw.deviceId}`);
    console.log(`Hardware Model:    ${reg?.deviceModel || hw.model}`);
    console.log(`Apple Silicon:     ${hw.isAppleSilicon ? 'Yes (Native arm64)' : 'No'}`);
    console.log(`Employee:          ${reg ? `${reg.employeeName} (${reg.employeeEmail})` : 'Not Paired'}`);
    console.log(`Inactivity Limit:  ${this.config.inactivityThresholdSeconds}s (${Math.round(this.config.inactivityThresholdSeconds / 60)} min)`);
    console.log(`Heartbeat Rate:    Every ${this.config.heartbeatIntervalSeconds}s`);
    console.log('Privacy Protected: Keystrokes/Screens/Audio/Webcam ZERO CAPTURE');
    console.log('----------------------------------------------------');

    // Perform initial tick immediately
    this.tick();

    // Schedule regular heartbeat interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.heartbeatIntervalSeconds * 1000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[AGENT] Stopped.');
  }

  public async tick() {
    const snapshot = this.monitor.evaluateState();
    const state = snapshot.state;

    // Send heartbeat to backend
    if (this.client.getRegistration()) {
      const res = await this.client.sendHeartbeat({
        timestamp: snapshot.timestamp,
        state,
        activityDetail: {
          lastInputSecondsAgo: Math.round(snapshot.idleSeconds),
          inputType: snapshot.lastInputType,
          idleSeconds: Math.round(snapshot.idleSeconds),
        },
      });

      if (res.success && res.activeFormatted) {
        this.todayActiveFormatted = res.activeFormatted;
      }
    }

    const stateEmoji =
      state === 'ACTIVE'
        ? '🟢'
        : state === 'INACTIVE'
        ? '🟡'
        : state === 'SLEEPING'
        ? '💤'
        : state === 'LOCKED'
        ? '🔒'
        : '⚪';

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(
      `[${timestamp}] ${stateEmoji} State: ${state.padEnd(8)} | Idle: ${String(Math.round(snapshot.idleSeconds)).padStart(3)}s | Input: ${snapshot.lastInputType.padEnd(8)} | Active Today: ${this.todayActiveFormatted}`
    );
  }

  public async runSelfTest(): Promise<boolean> {
    console.log('\n--- STARTING MACOS AGENT ACCURACY VERIFICATION ---');
    console.log('Testing all working time rules and state transitions...\n');

    let allPassed = true;

    // 1. Initial State Check: Fresh awake system with recent activity
    MacOSSystem.setSimulatedState({ idleSeconds: 5, displaySleep: false, locked: false, sleep: false });
    let snap = this.monitor.evaluateState();
    if (snap.state === 'ACTIVE') {
      console.log('✅ Rule 1 (Awake + Input < 300s): Detected ACTIVE state correctly.');
    } else {
      console.error(`❌ Rule 1 Failed: Expected ACTIVE, got ${snap.state}`);
      allPassed = false;
    }

    // 2. Inactivity Threshold Check: Idle time exceeds 300 seconds (5 minutes)
    MacOSSystem.setSimulatedState({ idleSeconds: 305 });
    snap = this.monitor.evaluateState();
    if (snap.state === 'INACTIVE') {
      console.log('✅ Rule 2 (Inactivity > 300s): Transitioned to INACTIVE correctly.');
    } else {
      console.error(`❌ Rule 2 Failed: Expected INACTIVE, got ${snap.state}`);
      allPassed = false;
    }

    // 3. User Input Resumes: User presses key or moves mouse (idle resets to 2s)
    MacOSSystem.setSimulatedState({ idleSeconds: 2 });
    this.monitor.recordInputEvent('keyboard');
    snap = this.monitor.evaluateState();
    if (snap.state === 'ACTIVE' && snap.lastInputType === 'keyboard') {
      console.log('✅ Rule 3 (Input Event Resumed): Transitioned back to ACTIVE correctly.');
    } else {
      console.error(`❌ Rule 3 Failed: Expected ACTIVE with keyboard input, got ${snap.state}`);
      allPassed = false;
    }

    // 4. Sleep Check: System or Display goes to sleep
    MacOSSystem.setSimulatedState({ displaySleep: true });
    snap = this.monitor.evaluateState();
    if (snap.state === 'SLEEPING') {
      console.log('✅ Rule 4 (Display Sleep): Detected SLEEPING state immediately.');
    } else {
      console.error(`❌ Rule 4 Failed: Expected SLEEPING, got ${snap.state}`);
      allPassed = false;
    }

    // 5. Wake Check: System wakes up, but user has NOT touched mouse/keyboard yet
    MacOSSystem.setSimulatedState({ displaySleep: false, idleSeconds: 65 });
    snap = this.monitor.evaluateState();
    if (snap.state === 'INACTIVE') {
      console.log('✅ Rule 5 (Post-Wake No Input): Does NOT auto-count; remains INACTIVE.');
    } else {
      console.error(`❌ Rule 5 Failed: Expected INACTIVE on wake before input, got ${snap.state}`);
      allPassed = false;
    }

    // 6. Post-Wake User Input: User moves mouse (idle < 30s)
    MacOSSystem.setSimulatedState({ idleSeconds: 3 });
    this.monitor.recordInputEvent('mouse');
    snap = this.monitor.evaluateState();
    if (snap.state === 'ACTIVE') {
      console.log('✅ Rule 6 (Post-Wake User Input): Resumes ACTIVE counting upon mouse movement.');
    } else {
      console.error(`❌ Rule 6 Failed: Expected ACTIVE, got ${snap.state}`);
      allPassed = false;
    }

    // 7. Lock Check: Screen locked
    MacOSSystem.setSimulatedState({ locked: true });
    snap = this.monitor.evaluateState();
    if (snap.state === 'LOCKED') {
      console.log('✅ Rule 7 (Session Locked): Detected LOCKED state and stopped counting.');
    } else {
      console.error(`❌ Rule 7 Failed: Expected LOCKED, got ${snap.state}`);
      allPassed = false;
    }

    // Reset simulation
    MacOSSystem.resetSimulation();

    console.log('\n--- VERIFICATION RESULT ---');
    if (allPassed) {
      console.log('🎉 ALL MACOS AGENT BEHAVIORAL CHECKS PASSED PERFECTLY!\n');
    } else {
      console.log('⚠️ Some checks failed. Review output above.\n');
    }

    return allPassed;
  }
}

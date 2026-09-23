import { ActivityState, InputActivityType, ActivitySnapshot } from './types';
import { MacOSSystem } from './macos-system';
import { INACTIVITY_THRESHOLD_SECONDS } from './config';

export class ActivityMonitor {
  private inactivityThresholdSeconds: number;
  private currentState: ActivityState = 'INACTIVE';
  private wasSleeping: boolean = false;
  private wasLocked: boolean = false;
  private lastInputType: InputActivityType = 'none';
  private lastInputTimestamp: string = new Date().toISOString();
  private previousIdleSeconds: number = 0;

  constructor(thresholdSeconds: number = INACTIVITY_THRESHOLD_SECONDS) {
    this.inactivityThresholdSeconds = thresholdSeconds;
  }

  public setThreshold(seconds: number) {
    this.inactivityThresholdSeconds = seconds;
  }

  public getThreshold(): number {
    return this.inactivityThresholdSeconds;
  }

  /**
   * Manually record an input event (called by native event monitor or simulated tests).
   * Privacy rule: Only the event category ('keyboard' or 'mouse') and timestamp are recorded.
   * Zero keycodes, text, or coordinates are ever captured.
   */
  public recordInputEvent(type: InputActivityType) {
    this.lastInputType = type;
    this.lastInputTimestamp = new Date().toISOString();
  }

  /**
   * Evaluate current system state and determine whether working time is ACTIVE or INACTIVE.
   */
  public evaluateState(): ActivitySnapshot {
    const isSleeping = MacOSSystem.isSystemSleeping();
    const isDisplaySleep = MacOSSystem.isDisplaySleeping();
    const isLocked = MacOSSystem.isSessionLocked();
    const idleSeconds = MacOSSystem.getSystemIdleSeconds();

    // Detect if idle timer reset (indicating user keyboard or mouse activity occurred)
    if (idleSeconds < this.previousIdleSeconds || idleSeconds < 5) {
      if (this.lastInputType === 'none') {
        this.lastInputType = 'mouse'; // default input indicator
      }
      this.lastInputTimestamp = new Date().toISOString();
    }
    this.previousIdleSeconds = idleSeconds;

    let computedState: ActivityState = 'INACTIVE';

    // 1. Check Sleep Condition
    if (isSleeping || isDisplaySleep) {
      this.wasSleeping = true;
      computedState = 'SLEEPING';
      this.currentState = computedState;
      return {
        timestamp: new Date().toISOString(),
        state: computedState,
        isAwake: false,
        isDisplayActive: false,
        isSessionUnlocked: !isLocked,
        idleSeconds,
        lastInputType: this.lastInputType,
        lastInputTimestamp: this.lastInputTimestamp,
      };
    }

    // 2. Check Locked Condition
    if (isLocked) {
      this.wasLocked = true;
      computedState = 'LOCKED';
      this.currentState = computedState;
      return {
        timestamp: new Date().toISOString(),
        state: computedState,
        isAwake: true,
        isDisplayActive: true,
        isSessionUnlocked: false,
        idleSeconds,
        lastInputType: this.lastInputType,
        lastInputTimestamp: this.lastInputTimestamp,
      };
    }

    // 3. Post-wake / Post-unlock check:
    // When waking or unlocking, do NOT immediately count active time.
    // Wait until user actually touches the keyboard or mouse (idleSeconds < 30).
    if (this.wasSleeping || this.wasLocked) {
      if (idleSeconds < 30) {
        // User has performed actual input after waking/unlocking
        this.wasSleeping = false;
        this.wasLocked = false;
        computedState = 'ACTIVE';
      } else {
        // Still waiting for first input after wake/unlock
        computedState = 'INACTIVE';
      }
    } else {
      // 4. Normal working state evaluation:
      // Active if user had recent input within inactivity threshold
      if (idleSeconds < this.inactivityThresholdSeconds) {
        computedState = 'ACTIVE';
      } else {
        computedState = 'INACTIVE';
      }
    }

    this.currentState = computedState;

    return {
      timestamp: new Date().toISOString(),
      state: computedState,
      isAwake: true,
      isDisplayActive: true,
      isSessionUnlocked: true,
      idleSeconds,
      lastInputType: this.lastInputType,
      lastInputTimestamp: this.lastInputTimestamp,
    };
  }

  public getCurrentState(): ActivityState {
    return this.currentState;
  }
}

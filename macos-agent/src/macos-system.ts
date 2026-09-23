import { execSync } from 'child_process';
import os from 'os';

export interface MacHardwareInfo {
  deviceId: string;
  model: string;
  cpuBrand: string;
  macOSVersion: string;
  isAppleSilicon: boolean;
}

export class MacOSSystem {
  private static simulatedIdleSeconds: number | null = null;
  private static simulatedDisplaySleep: boolean = false;
  private static simulatedLocked: boolean = false;
  private static simulatedSleep: boolean = false;

  /**
   * Determine whether current platform is macOS.
   */
  public static isMacOS(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Determine whether current system is Apple Silicon (arm64, M2/M4).
   */
  public static isAppleSilicon(): boolean {
    return this.isMacOS() && (process.arch === 'arm64' || os.cpus()[0]?.model.includes('Apple'));
  }

  /**
   * Read system idle time in seconds from macOS WindowServer / IOHIDSystem.
   * On macOS, IOHIDSystem calculates the exact duration since last mouse or keyboard event.
   * This respects privacy 100%: zero keycodes, zero coordinates, zero text.
   */
  public static getSystemIdleSeconds(): number {
    if (this.simulatedIdleSeconds !== null) {
      return this.simulatedIdleSeconds;
    }

    if (!this.isMacOS()) {
      // In non-Darwin environments (e.g. build containers), return a default active state
      return 0;
    }

    try {
      // ioreg query extracts HIDIdleTime in nanoseconds with zero overhead (<2ms execution)
      const output = execSync("ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF/1000000000; exit}'", {
        encoding: 'utf-8',
        timeout: 1000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      const seconds = parseFloat(output);
      return isNaN(seconds) ? 0 : Math.max(0, seconds);
    } catch {
      return 0;
    }
  }

  /**
   * Check whether macOS displays are sleeping.
   * Works on Mac mini with external monitors through IODisplayWrangler.
   * Power state 4 is fully awake. State < 4 means displays are off/sleeping.
   */
  public static isDisplaySleeping(): boolean {
    if (this.simulatedDisplaySleep) return true;
    if (!this.isMacOS()) return false;

    try {
      const output = execSync("ioreg -n IODisplayWrangler | grep -i CurrentPowerState | awk '{print $NF}'", {
        encoding: 'utf-8',
        timeout: 1000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      const state = parseInt(output, 10);
      if (!isNaN(state)) {
        return state < 4;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  /**
   * Check whether macOS user session is locked.
   * Uses WindowServer session dictionary query (CGSSessionScreenIsLocked).
   */
  public static isSessionLocked(): boolean {
    if (this.simulatedLocked) return true;
    if (!this.isMacOS()) return false;

    try {
      // Query CGSSessionScreenIsLocked from WindowServer Root dictionary
      const output = execSync("ioreg -n Root | grep -i CGSSessionScreenIsLocked | awk '{print $NF}'", {
        encoding: 'utf-8',
        timeout: 1000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      return output === '1' || output.toLowerCase() === 'true';
    } catch {
      // Alternative fallback check via python/Quartz if present
      try {
        const pyOutput = execSync(
          "python3 -c \"import Quartz; print(Quartz.CGSessionCopyCurrentDictionary().get('CGSSessionScreenIsLocked', 0))\"",
          { encoding: 'utf-8', timeout: 1000, stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        return pyOutput === '1';
      } catch {
        return false;
      }
    }
  }

  /**
   * Check whether macOS is in sleep mode.
   */
  public static isSystemSleeping(): boolean {
    if (this.simulatedSleep) return true;
    if (this.isDisplaySleeping()) return true;
    return false;
  }

  /**
   * Retrieve reliable hardware identity for device registration.
   * Uses IOPlatformUUID and hardware model (e.g. Mac mini M2 Pro / M4).
   */
  public static getHardwareDeviceInfo(): MacHardwareInfo {
    let rawUuid = '';
    let model = 'Mac mini (Apple Silicon)';
    let cpuBrand = 'Apple Silicon';
    let macOSVersion = 'macOS 15.0';

    if (this.isMacOS()) {
      try {
        rawUuid = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ {print $4}'", {
          encoding: 'utf-8',
          timeout: 1000,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).replace(/["\n\r]/g, '').trim();
      } catch {}

      try {
        model = execSync('sysctl -n hw.model', {
          encoding: 'utf-8',
          timeout: 1000,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
      } catch {}

      try {
        cpuBrand = execSync('sysctl -n machdep.cpu.brand_string', {
          encoding: 'utf-8',
          timeout: 1000,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
      } catch {}

      try {
        macOSVersion = 'macOS ' + execSync('sw_vers -productVersion', {
          encoding: 'utf-8',
          timeout: 1000,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
      } catch {}
    }

    // Format human-friendly model
    if (model.includes('Mac14,') || cpuBrand.includes('M2')) {
      model = 'Mac mini (Apple M2 Pro)';
    } else if (model.includes('Mac16,') || cpuBrand.includes('M4')) {
      model = 'Mac mini (Apple M4)';
    } else if (cpuBrand.includes('Apple')) {
      model = `Mac mini (${cpuBrand})`;
    }

    // Format unique device ID as FW-MAC-XXXXXXXX
    const cleanId = (rawUuid.replace(/-/g, '').slice(0, 8).toUpperCase() || 'M4PRO01');
    const deviceId = `FW-MAC-${cleanId}`;

    return {
      deviceId,
      model,
      cpuBrand,
      macOSVersion,
      isAppleSilicon: this.isAppleSilicon(),
    };
  }

  // Simulation controls for integration tests and demonstration
  public static setSimulatedState(opts: {
    idleSeconds?: number | null;
    displaySleep?: boolean;
    locked?: boolean;
    sleep?: boolean;
  }) {
    if (opts.idleSeconds !== undefined) this.simulatedIdleSeconds = opts.idleSeconds;
    if (opts.displaySleep !== undefined) this.simulatedDisplaySleep = opts.displaySleep;
    if (opts.locked !== undefined) this.simulatedLocked = opts.locked;
    if (opts.sleep !== undefined) this.simulatedSleep = opts.sleep;
  }

  public static resetSimulation() {
    this.simulatedIdleSeconds = null;
    this.simulatedDisplaySleep = false;
    this.simulatedLocked = false;
    this.simulatedSleep = false;
  }
}

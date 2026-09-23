import { execSync } from 'child_process';
import { MacOSSystem } from './macos-system';

export interface PermissionStatus {
  hasAccessibility: boolean;
  hasInputMonitoring: boolean;
  canDetectActivity: boolean;
  instructions?: string[];
}

export class PermissionsManager {
  /**
   * Check permissions status on macOS.
   * Note: `IOHIDSystem` reading of `HIDIdleTime` does NOT require Accessibility or Input Monitoring privileges,
   * making basic idle tracking completely permission-free and unblockable.
   * Event tap hooks for differentiating keyboard vs mouse benefit from Accessibility permissions.
   */
  public static checkPermissions(): PermissionStatus {
    if (!MacOSSystem.isMacOS()) {
      return {
        hasAccessibility: true,
        hasInputMonitoring: true,
        canDetectActivity: true,
      };
    }

    let hasAccessibility = false;
    try {
      // osascript test checking if process has accessibility rights
      const res = execSync(
        "osascript -e 'tell application \"System Events\" to get name of first process' 2>&1",
        { encoding: 'utf-8', timeout: 1500, stdio: ['pipe', 'pipe', 'ignore'] }
      );
      if (!res.includes('not allowed') && !res.includes('execution error')) {
        hasAccessibility = true;
      }
    } catch {
      hasAccessibility = false;
    }

    return {
      hasAccessibility,
      hasInputMonitoring: true,
      canDetectActivity: true, // IOHIDSystem idle detection works regardless
      instructions: [
        'Open System Settings > Privacy & Security > Accessibility.',
        'Ensure Flying Whales Agent is toggled ON.',
        'This allows distinguishing mouse vs keyboard activity without reading keys or screen contents.',
      ],
    };
  }
}

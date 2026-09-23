import { AgentRunner } from './agent-runner';
import { MacOSSystem } from './macos-system';
import { getAgentConfig } from './config';
import { DeviceRegistration } from './types';
import { PermissionsManager } from './permissions';

async function main() {
  const args = process.argv.slice(2);
  const config = getAgentConfig();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Flying Whales macOS Activity Agent
Usage:
  npx tsx macos-agent/src/index.ts [options]

Options:
  --test              Run self-test suite validating all active/inactive rules
  --status            Display current device identity, pairing, and permissions
  --register          Pair device interactively with Flying Whales server
  --threshold <sec>   Override inactivity threshold (default: 300 seconds)
  --server <url>      Override Flying Whales server URL (default: http://localhost:3000)
    `);
    process.exit(0);
  }

  const runner = new AgentRunner(config);

  if (args.includes('--test')) {
    const success = await runner.runSelfTest();
    process.exit(success ? 0 : 1);
  }

  if (args.includes('--status')) {
    const hw = MacOSSystem.getHardwareDeviceInfo();
    const perm = PermissionsManager.checkPermissions();
    const reg = runner.getClient().getRegistration();

    console.log('=== FLYING WHALES MACOS AGENT STATUS ===');
    console.log(`Device ID:       ${reg?.deviceId || hw.deviceId}`);
    console.log(`Hardware Model:  ${reg?.deviceModel || hw.model}`);
    console.log(`CPU Architecture:${hw.cpuBrand} (Apple Silicon: ${hw.isAppleSilicon})`);
    console.log(`Operating System:${hw.macOSVersion}`);
    console.log(`Paired Employee: ${reg ? `${reg.employeeName} (${reg.employeeEmail})` : 'Unregistered'}`);
    console.log(`Activity Monitor:${perm.canDetectActivity ? 'Ready (IOHIDSystem)' : 'Not Available'}`);
    console.log(`Accessibility:   ${perm.hasAccessibility ? 'Granted' : 'Standard Idle Mode'}`);
    console.log('========================================');
    process.exit(0);
  }

  // Normal daemon execution
  runner.start();

  // Clean exit handlers
  process.on('SIGINT', () => {
    runner.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    runner.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[AGENT CRASH]', err);
  process.exit(1);
});

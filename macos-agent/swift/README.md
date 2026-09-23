# Flying Whales macOS Native Apple Silicon Agent

Native, privacy-first computer activity agent for Apple Silicon Mac computers (M2 Pro, M4, etc.) at Flying Whales Ad Films.

---

## Automatic Background Startup (LaunchAgent)

The agent operates in the background via macOS **launchd** (`LaunchAgent`). Once installed, **Terminal is NOT required** — the agent starts automatically upon user login, restarts if unexpectedly terminated, and displays its live status directly in the macOS menu bar.

### Prerequisites
- Apple Silicon Mac (M2 Pro, M4, etc.)
- macOS 13.0 or higher
- Device paired via the Flying Whales Admin portal (`config.json` placed in `~/Library/Application Support/FlyingWhalesAgent/config.json`)

---

## Quick Commands (Makefile)

All operations can be run directly from this directory (`macos-agent/swift`):

```bash
# 1. Install & start background LaunchAgent (compiles if needed)
make install

# 2. Check background service & process status
make status

# 3. View live background logs
make logs

# 4. Restart the background agent
make restart

# 5. Uninstall background LaunchAgent (preserves your config.json pairing)
make uninstall
```

---

## Detailed Installation Workflow

### Step 1: Install the Background Agent
```bash
cd macos-agent/swift
make install
# Or: chmod +x install.sh && ./install.sh
```

**What the installer does:**
1. Compiles `FlyingWhalesAgent` natively for Apple Silicon (`arm64`, macOS 13+).
2. Installs the executable to:
   `~/Library/Application Support/FlyingWhalesAgent/FlyingWhalesAgent`
3. Generates the LaunchAgent plist at:
   `~/Library/LaunchAgents/com.flyingwhales.agent.plist`
4. Cleans up any duplicate or orphaned background instances using advisory process locking (`agent.lock`).
5. Registers and activates the service in macOS `launchd` under the logged-in user Aqua GUI session (`gui/<uid>`).
6. Starts the agent immediately.

### Step 2: Close Terminal
You can now **completely close Terminal**. The agent continues running seamlessly in the background.

---

## How to Verify the Agent is Running (Without Opening Terminal)

### 1. macOS System Menu Bar
Look at the top-right macOS menu bar. The agent displays its live status icon:
- `🐳 🟢 02h 15m`: **ACTIVE** (Mac is awake, unlocked, active display, and user keyboard/mouse input detected).
- `🐳 🟡 02h 15m`: **INACTIVE** (>300 seconds since last physical keyboard/mouse event).
- `🐳 💤`: **SLEEPING** (System or display sleep active).
- `🐳 🔒`: **LOCKED** (Screen locked).
- `🐳 ⚠️ Unpaired`: Missing `config.json` pairing from Admin portal.

Clicking the `🐳` icon reveals current active minutes today, current state, and a shortcut to the Admin Settings portal.

### 2. Admin Computer Activity Dashboard
Open the Flying Whales Web Dashboard:
- Navigate to **Presence & Devices** > **Computer Activity**.
- Notice the paired device row shows **🟢 ACTIVE** with updated heartbeat timestamps (sent every 30 seconds).

---

## LaunchAgent Configuration Details

- **LaunchAgent Plist**: `~/Library/LaunchAgents/com.flyingwhales.agent.plist`
- **Application Support Directory**: `~/Library/Application Support/FlyingWhalesAgent/`
- **Installed Executable**: `~/Library/Application Support/FlyingWhalesAgent/FlyingWhalesAgent`
- **Standard Output Log**: `~/Library/Application Support/FlyingWhalesAgent/agent.log`
- **Standard Error Log**: `~/Library/Application Support/FlyingWhalesAgent/agent-error.log`
- **Process ID File**: `~/Library/Application Support/FlyingWhalesAgent/agent.pid`
- **Single-Instance Lock**: `~/Library/Application Support/FlyingWhalesAgent/agent.lock`
- **Config & Secret**: `~/Library/Application Support/FlyingWhalesAgent/config.json`

---

## Behavior Across Mac Restarts and Crashes

- **Mac Restart / User Login**: Because `<key>RunAtLoad</key><true/>` is configured in the plist, `launchd` automatically launches `FlyingWhalesAgent` as soon as the user logs in to macOS. No Terminal is ever needed.
- **Crash Recovery**: The plist uses `<key>KeepAlive</key><dict><key>Crashed</key><true/><key>SuccessfulExit</key><false/></dict>` so if the process ever exits unexpectedly, launchd restarts it automatically within 5 seconds.
- **Duplicate Prevention**: POSIX `flock` on `agent.lock` guarantees that only one process can execute at any time.

---

## Uninstallation

To cleanly stop and remove the LaunchAgent:
```bash
cd macos-agent/swift
make uninstall
# Or: chmod +x uninstall.sh && ./uninstall.sh
```
*Note: Uninstallation unloads and deletes `com.flyingwhales.agent.plist`. Your device identity and pairing credentials (`config.json`) are safely preserved.*

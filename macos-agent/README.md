# Flying Whales macOS Employee Activity Agent

Native, privacy-first computer activity agent for Apple Silicon Mac computers (Mac mini M2 Pro, Mac mini M4, etc.) at Flying Whales Ad Films.

## Purpose

The agent measures **actual active working time** (awake, unlocked, active display, and user keyboard/mouse activity). It is strictly an activity timer, **not surveillance software**.

### Privacy Guarantee
- ❌ **NO screenshots** or screen recording
- ❌ **NO webcam or microphone access**
- ❌ **NO keystroke logging, text capture, or password reading**
- ❌ **NO clipboard inspection**
- ❌ **NO browser history or URL tracking**
- ❌ **NO document or file access**
- ❌ **NO mouse coordinates or clicks logging**
- ✅ **ONLY active state detection**: `ACTIVE`, `INACTIVE`, `SLEEPING`, `LOCKED`, `OFFLINE`

---

## Working Time Logic

1. **Active Working Condition**:
   - Mac is awake
   - Display/session is active
   - User has recent mouse OR keyboard activity (does not require both simultaneously; typing alone or mouse alone counts)
   - Mac is not locked
   - Mac is not sleeping
   - Request comes from registered macOS desktop agent (phone logins are strictly ignored)

2. **Inactive Condition**:
   - Inactivity limit reached: No input for 300 seconds (5 minutes configurable)
   - System sleep or shutdown
   - Display sleep
   - Screen locked (`com.apple.screenIsLocked`)
   - Network failure / offline: queued locally without generating fake time

3. **Wake & Unlock Rule**:
   - Does NOT count active time immediately upon wake or unlock.
   - Waits until user actually performs keyboard or mouse input.

---

## Installation & Background Service (macOS LaunchAgent)

The agent runs natively in the background as an Apple Silicon LaunchAgent. Once installed, **Terminal is NOT required** — the agent starts automatically upon user login, restarts if unexpectedly terminated, and displays its status in the macOS menu bar.

### Option A: Swift Native Agent with Automatic Background Startup (Recommended)

```bash
cd macos-agent/swift

# Step 1: Install as persistent background LaunchAgent
make install
# Or: ./install.sh
```

**What this does:**
1. Compiles `FlyingWhalesAgent` natively for Apple Silicon (`arm64`, macOS 13+).
2. Copies executable to `~/Library/Application Support/FlyingWhalesAgent/FlyingWhalesAgent`.
3. Creates LaunchAgent plist at `~/Library/LaunchAgents/com.flyingwhales.agent.plist`.
4. Registers and starts the service using `launchctl`.
5. Enforces single-instance execution (locks `agent.lock` so duplicate processes cannot run).
6. **You can now completely close Terminal.** The agent will continue running.

#### Managing the Background Agent:
```bash
# Check service and process status:
make status
# Or: ./status.sh

# View live logs:
make logs
# Or: tail -f ~/Library/Application Support/FlyingWhalesAgent/agent.log

# Restart the service:
make restart

# Uninstall LaunchAgent (preserves your config.json device pairing):
make uninstall
# Or: ./uninstall.sh
```

#### Verification Without Opening Terminal:
- Look at the top macOS system menu bar:
  - `🐳 🟢 04h 15m`: Awake, unlocked, and actively working today.
  - `🐳 🟡 04h 15m`: Inactive (>300s since last keyboard/mouse event).
  - `🐳 💤`: System or display sleeping.
  - `🐳 🔒`: Screen locked.
  - `🐳 ⚠️ Unpaired`: Missing `config.json` pairing from Admin portal.
- Clicking the `🐳` icon opens quick status and preferences.

---

### Option B: Manual Foreground Execution (Terminal Mode)
```bash
cd macos-agent/swift
make build
./FlyingWhalesAgent
```
*Note: If the background LaunchAgent is already running, launching `./FlyingWhalesAgent` in Terminal will detect the existing instance and exit cleanly to prevent duplicate processes.*

---

### Option C: Node / TypeScript Agent
```bash
# Run self-test suite (validates all 7 state transitions)
npx tsx macos-agent/src/index.ts --test

# Check device info & status
npx tsx macos-agent/src/index.ts --status

# Start background agent
npx tsx macos-agent/src/index.ts
```

### Environment Variables
- `FW_INACTIVITY_THRESHOLD`: Inactivity seconds before `INACTIVE` (default: `300`)
- `FW_HEARTBEAT_INTERVAL`: Heartbeat frequency in seconds (default: `30`)
- `FW_SERVER_URL`: Flying Whales server URL (default: `http://localhost:3000`)

#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Flying Whales macOS Native Agent - Background LaunchAgent Installer
# Target: Apple Silicon macOS (M2 Pro, M4, macOS 13+)
# Installs to: ~/Library/LaunchAgents/com.flyingwhales.agent.plist
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SUPPORT_DIR="$HOME/Library/Application Support/FlyingWhalesAgent"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.flyingwhales.agent.plist"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME"
EXECUTABLE_DEST="$APP_SUPPORT_DIR/FlyingWhalesAgent"
LOG_PATH="$APP_SUPPORT_DIR/agent.log"
ERR_LOG_PATH="$APP_SUPPORT_DIR/agent-error.log"
CONFIG_PATH="$APP_SUPPORT_DIR/config.json"
LABEL="com.flyingwhales.agent"
CURRENT_UID="$(id -u)"

echo "🐳 ========================================================="
echo "🐳 Flying Whales macOS Agent: Automatic Background Installer"
echo "🐳 ========================================================="

# 1. Ensure binary is compiled
if [ ! -f "$SCRIPT_DIR/FlyingWhalesAgent" ]; then
    echo "⚙️  Executable not found. Compiling native Apple Silicon agent..."
    (cd "$SCRIPT_DIR" && make build)
fi

if [ ! -f "$SCRIPT_DIR/FlyingWhalesAgent" ]; then
    echo "❌ Error: Failed to find or compile $SCRIPT_DIR/FlyingWhalesAgent."
    exit 1
fi

# 2. Prepare Application Support directory
mkdir -p "$APP_SUPPORT_DIR"
mkdir -p "$LAUNCH_AGENTS_DIR"

# Check if config.json exists
if [ -f "$CONFIG_PATH" ]; then
    echo "✅ Verified device config: $CONFIG_PATH"
else
    echo "⚠️  Notice: $CONFIG_PATH not found yet."
    echo "   The agent will install and run, and will link automatically once paired from Admin portal."
fi

# 3. Stop any existing running instance or loaded LaunchAgent (Ensures Idempotence)
echo "🔄 Checking for existing running agent processes..."
launchctl bootout "gui/$CURRENT_UID/$LABEL" 2>/dev/null || true
launchctl unload "$PLIST_PATH" 2>/dev/null || true
pkill -f "$APP_SUPPORT_DIR/FlyingWhalesAgent" 2>/dev/null || true
pkill -f "$SCRIPT_DIR/FlyingWhalesAgent" 2>/dev/null || true
sleep 1

# 4. Copy the compiled executable to the permanent Application Support directory
echo "📦 Installing executable to $EXECUTABLE_DEST..."
cp -f "$SCRIPT_DIR/FlyingWhalesAgent" "$EXECUTABLE_DEST"
chmod +x "$EXECUTABLE_DEST"

# 5. Generate absolute-path LaunchAgent plist
echo "📝 Generating LaunchAgent plist at $PLIST_PATH..."
cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$EXECUTABLE_DEST</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_SUPPORT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>StandardOutPath</key>
    <string>$LOG_PATH</string>
    <key>StandardErrorPath</key>
    <string>$ERR_LOG_PATH</string>
    <key>ProcessType</key>
    <string>Interactive</string>
    <key>LimitLoadToSessionType</key>
    <array>
        <string>Aqua</string>
    </array>
</dict>
</plist>
EOF

chmod 644 "$PLIST_PATH"

# 6. Load service into macOS launchd
echo "🚀 Registering and starting background service with launchd..."
# Try modern bootstrap first, fallback to load
if ! launchctl bootstrap "gui/$CURRENT_UID" "$PLIST_PATH" 2>/dev/null; then
    launchctl load -w "$PLIST_PATH"
fi

# 7. Verification
sleep 2
echo "🔍 Verifying background agent process..."

RUNNING_PID=$(pgrep -f "$EXECUTABLE_DEST" || true)

if [ -n "$RUNNING_PID" ]; then
    echo "🎉 SUCCESS: Flying Whales Agent is now running in the background!"
    echo "   Process ID: $RUNNING_PID"
    echo "   LaunchAgent: $PLIST_PATH"
    echo "   Log File:    $LOG_PATH"
    echo "   Status Bar:  Look for the 🐳 icon in your macOS menu bar."
    echo ""
    echo "💡 You can now safely CLOSE Terminal completely."
    echo "   The agent will run persistently and start automatically on every login."
else
    echo "⚠️  Agent loaded into launchd. Checking status..."
    launchctl list | grep "$LABEL" || true
    if [ -f "$LOG_PATH" ]; then
        echo "Recent log output:"
        tail -n 10 "$LOG_PATH"
    fi
fi

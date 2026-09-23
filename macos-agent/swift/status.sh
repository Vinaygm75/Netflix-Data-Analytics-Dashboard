#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Flying Whales macOS Native Agent - Background Status Checker
# ============================================================================

LABEL="com.flyingwhales.agent"
CURRENT_UID="$(id -u)"
APP_SUPPORT_DIR="$HOME/Library/Application Support/FlyingWhalesAgent"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_PATH="$APP_SUPPORT_DIR/agent.log"
PID_FILE="$APP_SUPPORT_DIR/agent.pid"

echo "🐳 ========================================================="
echo "🐳 Flying Whales macOS Agent: Service Status"
echo "🐳 ========================================================="

# 1. Check LaunchAgent plist
if [ -f "$PLIST_PATH" ]; then
    echo "✅ LaunchAgent Plist: Installed ($PLIST_PATH)"
else
    echo "❌ LaunchAgent Plist: Not installed"
fi

# 2. Check launchctl registration
LAUNCHCTL_STATUS=$(launchctl list | grep "$LABEL" || true)
if [ -n "$LAUNCHCTL_STATUS" ]; then
    echo "✅ launchd Status:    Registered ($LAUNCHCTL_STATUS)"
else
    echo "⚠️  launchd Status:    Not registered"
fi

# 3. Check running processes
RUNNING_PIDS=$(pgrep -f "FlyingWhalesAgent" || true)
if [ -n "$RUNNING_PIDS" ]; then
    echo "✅ Process Status:    RUNNING (PID: $RUNNING_PIDS)"
else
    echo "❌ Process Status:    NOT RUNNING"
fi

# 4. Check device config
if [ -f "$APP_SUPPORT_DIR/config.json" ]; then
    echo "✅ Device Config:     Present ($APP_SUPPORT_DIR/config.json)"
else
    echo "⚠️  Device Config:     Missing"
fi

# 5. Show recent logs
if [ -f "$LOG_PATH" ]; then
    echo ""
    echo "📋 Recent Agent Logs ($LOG_PATH):"
    echo "---------------------------------------------------------"
    tail -n 12 "$LOG_PATH"
    echo "---------------------------------------------------------"
fi

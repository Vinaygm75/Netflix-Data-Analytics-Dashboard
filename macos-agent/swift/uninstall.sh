#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Flying Whales macOS Native Agent - Background LaunchAgent Uninstaller
# ============================================================================

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.flyingwhales.agent.plist"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME"
LABEL="com.flyingwhales.agent"
CURRENT_UID="$(id -u)"
APP_SUPPORT_DIR="$HOME/Library/Application Support/FlyingWhalesAgent"

echo "🐳 ========================================================="
echo "🐳 Flying Whales macOS Agent: Background Uninstaller"
echo "🐳 ========================================================="

echo "🛑 Stopping and unloading LaunchAgent..."
launchctl bootout "gui/$CURRENT_UID/$LABEL" 2>/dev/null || true
launchctl unload "$PLIST_PATH" 2>/dev/null || true
pkill -f "$APP_SUPPORT_DIR/FlyingWhalesAgent" 2>/dev/null || true
pkill -f "FlyingWhalesAgent" 2>/dev/null || true

if [ -f "$PLIST_PATH" ]; then
    rm -f "$PLIST_PATH"
    echo "🗑️  Removed LaunchAgent plist: $PLIST_PATH"
fi

if [ -f "$APP_SUPPORT_DIR/agent.lock" ]; then
    rm -f "$APP_SUPPORT_DIR/agent.lock"
fi
if [ -f "$APP_SUPPORT_DIR/agent.pid" ]; then
    rm -f "$APP_SUPPORT_DIR/agent.pid"
fi

echo "✅ Uninstallation complete."
echo "ℹ️  Note: Your device pairing file ($APP_SUPPORT_DIR/config.json) was preserved."

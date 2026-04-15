#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GREETING_PATH="$SCRIPT_DIR/public/greeting.html"
PLIST_NAME="com.wdyd.greeting"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
echo "🤖 Setting up WDYD greeting..."
if [ ! -f "$GREETING_PATH" ]; then
  echo "❌ greeting.html not found at $GREETING_PATH"
  exit 1
fi
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/open</string>
        <string>-a</string>
        <string>Google Chrome</string>
        <string>$GREETING_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load -w "$PLIST_PATH"
echo "✅ Done! Robot will greet you on login."
echo "Test now: open $GREETING_PATH"

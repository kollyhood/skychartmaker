#!/bin/bash
# Starts (or restarts) the signage-server mini-service and keeps it running.
# Idempotent: safe to call multiple times.

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
SERVER_DIR="$PROJECT_DIR/mini-services/signage-server"
LOG_FILE="$PROJECT_DIR/signage-server.log"
PID_FILE="$PROJECT_DIR/signage-server.pid"

# Kill any existing instance
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping existing signage-server (PID $OLD_PID)..."
    kill -TERM "$OLD_PID" 2>/dev/null || true
    sleep 1
    kill -KILL "$OLD_PID" 2>/dev/null || true
  fi
fi
pkill -f "signage-server/index.ts" 2>/dev/null || true
sleep 1

# Start fresh
cd "$SERVER_DIR"
echo "Starting signage-server..."
setsid bun index.ts > "$LOG_FILE" 2>&1 < /dev/null &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"
disown 2>/dev/null || true

# Wait for it to bind to the ports
sleep 3

if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "signage-server started (PID $NEW_PID)"
  echo "  WS   port: 3004"
  echo "  REST port: 3005"
  echo "  Log: $LOG_FILE"
else
  echo "signage-server failed to start - check $LOG_FILE"
  exit 1
fi

# Quick smoke test
if curl -sf http://127.0.0.1:3005/health > /dev/null 2>&1; then
  echo "REST /health responding"
else
  echo "REST /health not responding yet (server may still be warming up)"
fi

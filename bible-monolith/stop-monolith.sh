#!/bin/bash
# bible-monolith shutdown script

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/logs/bible-monolith.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "[$(date)] No PID file found. Trying to find process..."
    PID=$(pgrep -f "bible-monolith.jar" | head -1)
    if [ -z "$PID" ]; then
        echo "[$(date)] bible-monolith is not running."
        exit 0
    fi
else
    PID=$(cat "$PID_FILE")
fi

echo "[$(date)] Stopping bible-monolith (PID $PID)..."

# Graceful shutdown via Spring Actuator
if curl -sf -X POST http://localhost:8080/actuator/shutdown > /dev/null 2>&1; then
    echo "[$(date)] Graceful shutdown initiated."
else
    echo "[$(date)] Actuator shutdown failed, sending SIGTERM..."
    kill "$PID" 2>/dev/null || true
fi

# Wait up to 15 seconds for graceful exit
for i in $(seq 1 15); do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "[$(date)] bible-monolith stopped gracefully."
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
echo "[$(date)] Force killing bible-monolith..."
kill -9 "$PID" 2>/dev/null || true
sleep 1
rm -f "$PID_FILE"
echo "[$(date)] bible-monolith force-stopped."

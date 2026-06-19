#!/bin/bash
# bible-monolith startup script
# Single JVM: -Xms48m -Xmx160m, port 8080
# All 6 services merged into one process

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
DATA_DIR="$PROJECT_DIR/data"
JAR="$SCRIPT_DIR/build/libs/bible-monolith.jar"

mkdir -p "$LOG_DIR" "$DATA_DIR"

PID_FILE="$LOG_DIR/bible-monolith.pid"
LOG_FILE="$LOG_DIR/bible-monolith.log"

if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[$(date)] bible-monolith is already running (PID $OLD_PID)"
        exit 0
    fi
    rm -f "$PID_FILE"
fi

echo "[$(date)] Starting bible-monolith..."
echo "  JAR: $JAR"
echo "  Log: $LOG_FILE"
echo "  PID: $PID_FILE"

cd "$PROJECT_DIR"

nohup java \
    -Xms48m \
    -Xmx160m \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -XX:GCTimeRatio=9 \
    -XX:+ExitOnOutOfMemoryError \
    -Dspring.profiles.active=production \
    -Dsword.modules.path="$DATA_DIR/sword-mods" \
    -jar "$JAR" \
    >> "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"

sleep 3

if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "[$(date)] bible-monolith started successfully (PID $(cat $PID_FILE))"
    echo "[$(date)] Waiting for health check on port 8080..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
            echo "[$(date)] Health check PASSED"
            exit 0
        fi
        sleep 2
    done
    echo "[$(date)] Health check TIMEOUT (process may still be starting)"
else
    echo "[$(date)] FAILED to start bible-monolith"
    cat "$LOG_FILE" | tail -20
    exit 1
fi

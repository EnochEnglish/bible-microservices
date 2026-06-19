#!/bin/bash
# bible-monolith startup script for Linux (Alibaba Cloud ECS)
# Single JVM: -Xms48m -Xmx160m, port 8080
# 1.7 GiB server — this process + nginx fit comfortably
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/tmp/bible-monolith"
DATA_DIR="$SCRIPT_DIR/../data"
JAR="$SCRIPT_DIR/build/libs/bible-monolith.jar"

mkdir -p "$LOG_DIR" "$DATA_DIR"

PID_FILE="$LOG_DIR/monolith.pid"
LOG_FILE="$LOG_DIR/monolith.log"

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

cd "$SCRIPT_DIR/.."

# CRITICAL: sword.modules-path uses hyphens (Spring Boot relaxed binding)
nohup java \
    -Xms48m \
    -Xmx160m \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200 \
    -XX:GCTimeRatio=9 \
    -Dsword.modules-path="$DATA_DIR/sword-mods" \
    -jar "$JAR" \
    >> "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"

sleep 3

if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "[$(date)] bible-monolith started successfully (PID $(cat $PID_FILE))"
    echo "[$(date)] Waiting for health check on port 8080..."
    for i in $(seq 1 40); do
        if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
            echo "[$(date)] Health check PASSED (took $((i*2))s)"
            exit 0
        fi
        if ! kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
            echo "[$(date)] Process died during startup!"
            tail -30 "$LOG_FILE"
            exit 1
        fi
        sleep 2
    done
    echo "[$(date)] Health check TIMEOUT (process may still be starting)"
else
    echo "[$(date)] FAILED to start bible-monolith"
    tail -20 "$LOG_FILE"
    exit 1
fi

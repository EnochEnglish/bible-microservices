#!/bin/bash
# Bible Microservices - Stop Script (Linux)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"

echo "Stopping Bible Microservices..."

SERVICES=("gateway" "module-service" "search-service" "text-service")

for svc in "${SERVICES[@]}"; do
    PID_FILE="$LOG_DIR/${svc}.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping $svc (PID $PID)..."
            kill "$PID"
            sleep 1
            kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null
            echo "  Stopped."
        else
            echo "$svc is not running."
        fi
        rm -f "$PID_FILE"
    else
        echo "$svc: no PID file found."
    fi
done

echo "All services stopped."
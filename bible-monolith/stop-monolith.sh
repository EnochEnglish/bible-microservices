#!/bin/bash
# Stop bible-monolith gracefully
PID_FILE="/tmp/bible-monolith/monolith.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Searching for Java process..."
    PID=$(pgrep -f "bible-monolith.jar" | head -1)
    if [ -z "$PID" ]; then
        echo "No bible-monolith process found."
        exit 0
    fi
else
    PID=$(cat "$PID_FILE")
fi

if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping bible-monolith (PID $PID)..."
    kill "$PID"

    # Wait up to 30s for graceful shutdown
    for i in $(seq 1 30); do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "Stopped successfully."
            rm -f "$PID_FILE"
            exit 0
        fi
        sleep 1
    done

    echo "Graceful shutdown timed out. Force killing..."
    kill -9 "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "Force killed."
else
    echo "PID $PID not found. Removing stale PID file."
    rm -f "$PID_FILE"
fi

#!/bin/bash
# ============================================================
# Bible Microservices — Stop Script
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$SCRIPT_DIR/logs"

echo "=========================================="
echo "  Stopping Bible Microservices..."
echo "=========================================="

stop_service() {
  local name=$1
  local pidfile="$PID_DIR/$name.pid"
  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  Stopping $name (PID: $pid)..."
      kill "$pid" 2>/dev/null
      sleep 2
      # Force kill if still running
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null
        echo "    (force killed)"
      fi
    else
      echo "  $name: not running (stale PID $pid)"
    fi
    rm -f "$pidfile"
  else
    echo "  $name: no PID file"
  fi
}

# Stop in reverse order
stop_service "frontend"
stop_service "gateway"
stop_service "sword-service"
stop_service "auth-service"
stop_service "module-service"
stop_service "search-service"
stop_service "text-service"

# Final cleanup — kill any remaining java/node processes from this project
sleep 1
echo ""
echo "  Cleaning up remaining processes..."
pkill -f "bible-text-service.jar" 2>/dev/null || true
pkill -f "bible-search-service.jar" 2>/dev/null || true
pkill -f "bible-module-service.jar" 2>/dev/null || true
pkill -f "bible-auth-service.jar" 2>/dev/null || true
pkill -f "bible-sword-service.jar" 2>/dev/null || true
pkill -f "bible-gateway.jar" 2>/dev/null || true
pkill -f "server.js" 2>/dev/null || true

echo "=========================================="
echo "  All services stopped."
echo "=========================================="

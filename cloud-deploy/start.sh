#!/bin/bash
# Bible Microservices - Start Script (Linux)
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
DATA_DIR="$SCRIPT_DIR/data"
SERVICES_DIR="$SCRIPT_DIR/services"

mkdir -p "$LOG_DIR" "$DATA_DIR"

echo "=========================================="
echo "  Bible Microservices v1.0"
echo "  Starting 4 services..."
echo "=========================================="

JAVA_OPTS="-Xms256m -Xmx512m"

# 1. Text Service (8081)
echo "[1/4] Starting Text Service on port 8081..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-text-service.jar" \
    --server.port=8081 \
    > "$LOG_DIR/text-service.log" 2>&1 &
echo $! > "$LOG_DIR/text-service.pid"
echo "  PID: $(cat $LOG_DIR/text-service.pid)"

# 2. Search Service (8082)
echo "[2/4] Starting Search Service on port 8082..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-search-service.jar" \
    --server.port=8082 \
    > "$LOG_DIR/search-service.log" 2>&1 &
echo $! > "$LOG_DIR/search-service.pid"
echo "  PID: $(cat $LOG_DIR/search-service.pid)"

# 3. Module Service (8083)
echo "[3/4] Starting Module Service on port 8083..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-module-service.jar" \
    --server.port=8083 \
    > "$LOG_DIR/module-service.log" 2>&1 &
echo $! > "$LOG_DIR/module-service.pid"
echo "  PID: $(cat $LOG_DIR/module-service.pid)"

# 4. Gateway (8080) - START LAST
echo "[4/4] Starting Gateway on port 8080..."
sleep 5  # wait for backend services to boot
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-gateway.jar" \
    --server.port=8080 \
    > "$LOG_DIR/gateway.log" 2>&1 &
echo $! > "$LOG_DIR/gateway.pid"
echo "  PID: $(cat $LOG_DIR/gateway.pid)"

echo "=========================================="
echo "  All services launched!"
echo ""
echo "  Access at: http://YOUR_SERVER_IP:8080"
echo "  API routes:"
echo "    GET /api/v1/bible/{translation}/{book}/{chapter}"
echo "    GET /api/v1/bible/{translation}/random"
echo "    GET /api/v1/bible/translations"
echo "    GET /api/v1/search?q=keyword"
echo ""
echo "  Logs: $LOG_DIR/"
echo "  Stop: ./stop.sh"
echo "=========================================="
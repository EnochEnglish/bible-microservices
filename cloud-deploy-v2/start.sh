#!/bin/bash
# ============================================================
# Bible Microservices — Cloud Deployment Start Script
# Starts all 7 services: 6 backend + 1 frontend
# Tested on: Ubuntu 20.04+/Debian 11+/CentOS 7+
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
DATA_DIR="$SCRIPT_DIR/data"
SERVICES_DIR="$SCRIPT_DIR/services"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_DIR="$LOG_DIR"

mkdir -p "$LOG_DIR" "$DATA_DIR" "$PID_DIR"

# ── Java check ──
if ! command -v java &>/dev/null; then
  echo "[ERROR] Java 17+ required. Install: sudo apt install openjdk-17-jdk"
  exit 1
fi

JAVA_VER=$(java -version 2>&1 | head -1 | grep -oP '"\K\d+')
if [ "$JAVA_VER" -lt 17 ] 2>/dev/null; then
  echo "[WARN] Java $JAVA_VER detected. Java 17+ is recommended."
fi

# ── Node.js check ──
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js 18+ required. Install: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi

echo "=========================================="
echo "  Bible Microservices v2.0"
echo "  Starting all 7 services..."
echo "  Java: $(java -version 2>&1 | head -1)"
echo "  Node: $(node -v)"
echo "=========================================="

JAVA_OPTS="-Xms256m -Xmx512m"

# ── 1. Text Service (8081) — Bible text, annotations, Strong's, dictionaries, bookmarks, notes ──
echo "[1/7] Starting Text Service on port 8081..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-text-service.jar" \
  --server.port=8081 \
  --spring.datasource.url="jdbc:h2:file:$DATA_DIR/text-db" \
  > "$LOG_DIR/text-service.log" 2>&1 &
echo $! > "$PID_DIR/text-service.pid"
echo "  PID: $(cat $PID_DIR/text-service.pid)"

# ── 2. Search Service (8082) — Full-text search ──
echo "[2/7] Starting Search Service on port 8082..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-search-service.jar" \
  --server.port=8082 \
  > "$LOG_DIR/search-service.log" 2>&1 &
echo $! > "$PID_DIR/search-service.pid"
echo "  PID: $(cat $PID_DIR/search-service.pid)"

# ── 3. Module Service (8083) — Module management ──
echo "[3/7] Starting Module Service on port 8083..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-module-service.jar" \
  --server.port=8083 \
  > "$LOG_DIR/module-service.log" 2>&1 &
echo $! > "$PID_DIR/module-service.pid"
echo "  PID: $(cat $PID_DIR/module-service.pid)"

# ── 4. Auth Service (8084) — JWT authentication ──
echo "[4/7] Starting Auth Service on port 8084..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-auth-service.jar" \
  --server.port=8084 \
  --spring.datasource.url="jdbc:h2:file:$DATA_DIR/auth-db" \
  > "$LOG_DIR/auth-service.log" 2>&1 &
echo $! > "$PID_DIR/auth-service.pid"
echo "  PID: $(cat $PID_DIR/auth-service.pid)"

# ── 5. Sword Service (8086) — SWORD module reader (Interlinear, Strong's word-level) ──
echo "[5/7] Starting Sword Service on port 8086..."
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-sword-service.jar" \
  --server.port=8086 \
  --sword.modules-path="$DATA_DIR/sword-mods" \
  > "$LOG_DIR/sword-service.log" 2>&1 &
echo $! > "$PID_DIR/sword-service.pid"
echo "  PID: $(cat $PID_DIR/sword-service.pid)"

# ── 6. Gateway (8080) — API Gateway (internal only) ──
echo "[6/7] Starting Gateway on port 8080..."
sleep 5
nohup java $JAVA_OPTS -jar "$SERVICES_DIR/bible-gateway.jar" \
  --server.port=8080 \
  > "$LOG_DIR/gateway.log" 2>&1 &
echo $! > "$PID_DIR/gateway.pid"
echo "  PID: $(cat $PID_DIR/gateway.pid)"

# ── 7. Frontend (3000) — Static server + API proxy ──
echo "[7/7] Starting Frontend on port 3000..."
nohup node "$FRONTEND_DIR/server.js" \
  > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"
echo "  PID: $(cat $PID_DIR/frontend.pid)"

echo "=========================================="
echo "  All 7 services launched!"
echo ""
echo "  Internal ports (for Nginx reverse proxy):"
echo "    Frontend:   http://localhost:3000  (public entry point)"
echo "    Gateway:    http://localhost:8080  (API gateway)"
echo "    Text:       http://localhost:8081"
echo "    Search:     http://localhost:8082"
echo "    Module:     http://localhost:8083"
echo "    Auth:       http://localhost:8084"
echo "    Sword:      http://localhost:8086"
echo ""
echo "  Wait ~20s for Spring Boot to fully initialize, then:"
echo "    curl http://localhost:3000/"
echo "    curl http://localhost:3000/api/v1/bible/translations"
echo ""
echo "  Logs: $LOG_DIR/"
echo "  Stop: ./stop.sh"
echo "=========================================="

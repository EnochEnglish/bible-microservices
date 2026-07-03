#!/bin/bash
# start-monolith.sh - Bible Microservices monolith deployment
set -e
DEPLOY_DIR=/opt/bible-microservices/deploy-package
MONOLITH_JAR=$DEPLOY_DIR/bible-monolith.jar
LOG_DIR=/opt/bible-microservices/logs
DATA_DIR=/opt/bible-microservices/data

echo "=== Starting Bible Monolith ==="
echo "Stopping old processes..."
pkill -f bible-monolith 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 2

mkdir -p $LOG_DIR

echo "Starting monolith (port 8080)..."
cd $DEPLOY_DIR
nohup java -Xms48m -Xmx160m -XX:+UseG1GC \
  -Dsword.modules-path=$DATA_DIR/sword-mods \
  -jar $MONOLITH_JAR \
  > $LOG_DIR/monolith.log 2>&1 &

echo "Waiting 30s for monolith to boot..."
sleep 30

echo "Starting frontend (port 3000)..."
cd $DEPLOY_DIR/frontend
nohup node server.js > $LOG_DIR/frontend.log 2>&1 &
sleep 2

echo "Configuring nginx..."
cp $DEPLOY_DIR/nginx-usebible.conf /etc/nginx/conf.d/bible.conf
nginx -t && systemctl reload nginx

echo "Done!"
echo "Monolith PID: $(pgrep -f bible-monolith)"
echo "Frontend PID: $(pgrep -f node)"
free -m

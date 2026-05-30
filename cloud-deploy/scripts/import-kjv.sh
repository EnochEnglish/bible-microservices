#!/bin/bash
# Bible Microservices - KJV Import Script (Linux)
# Usage: bash import-kjv.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Python dependencies..."
pip3 install lxml requests -q

echo ""
echo "Importing KJV Bible data..."
echo "This downloads ~10MB OSIS XML and imports ~36,820 verses."
echo "It may take 5-10 minutes..."
echo ""

# Start text-service if not running
if ! curl -s http://localhost:8081/api/v1/bible/translations > /dev/null 2>&1; then
    echo "Text service not running! Start it first:"
    echo "  cd $(dirname $SCRIPT_DIR) && ./start.sh"
    exit 1
fi

python3 "$SCRIPT_DIR/import_kjv.py" "$SCRIPT_DIR/eng-kjv.osis.xml" "http://localhost:8081"

echo ""
echo "KJV import complete! Test:"
echo "  curl http://localhost:8080/api/v1/bible/kjv/john/3/16"
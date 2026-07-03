#!/bin/bash
echo "Stopping Bible Monolith..."
pkill -f bible-monolith 2>/dev/null && echo "Monolith stopped" || echo "Monolith not running"
pkill -f "node server.js" 2>/dev/null && echo "Frontend stopped" || echo "Frontend not running"
#!/bin/sh
# priority: 10
# Example post-execution hook: cleanup

echo "[POST] Starting cleanup process..."
echo "[POST] Step 1: Archiving logs..."
if [ -d /tmp/judgehost/logs ]; then
    echo "[POST] Found logs directory, creating archive..."
    sleep 1
    echo "[POST] Logs archived successfully"
else
    echo "[POST] No logs directory found"
fi
sleep 1
echo "[POST] Step 2: Clearing temporary files..."
if [ -d /tmp/judgehost/temp ]; then
    echo "[POST] Removing temporary files..."
    rm -rf /tmp/judgehost/temp/* 2>/dev/null || true
    sleep 1
    echo "[POST] Temporary files cleared"
fi
sleep 1
echo "[POST] Step 3: Clearing cache..."
if [ -d /tmp/judgehost/cache ]; then
    echo "[POST] Clearing cache directory..."
    rm -rf /tmp/judgehost/cache/* 2>/dev/null || true
    sleep 1
    echo "[POST] Cache cleared"
fi
sleep 1
echo "[POST] Step 4: Final verification..."
sleep 1
echo "[POST] Cleanup process completed successfully!"

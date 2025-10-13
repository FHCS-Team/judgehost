#!/bin/sh
# priority: 20
# depends: 01_prepare_env.sh
# Example pre-execution hook: check dependencies

echo "[PRE] Starting dependency checks..."
echo "[PRE] Checking if config file exists..."
if [ -f /tmp/judgehost/config.env ]; then
    echo "[PRE] ✓ Configuration file found"
else
    echo "[PRE] ✗ Configuration file missing!"
fi
sleep 2
echo "[PRE] Checking system tools..."
for tool in sh cat echo sleep grep; do
    if which "$tool" >/dev/null 2>&1; then
        echo "[PRE] ✓ $tool is available"
    else
        echo "[PRE] ✗ $tool is missing!"
    fi
    sleep 0.5
done
sleep 1
echo "[PRE] Checking temporary directories..."
for dir in logs cache temp; do
    if [ -d "/tmp/judgehost/$dir" ]; then
        echo "[PRE] ✓ Directory /tmp/judgehost/$dir exists"
    else
        echo "[PRE] ✗ Directory /tmp/judgehost/$dir missing!"
    fi
    sleep 0.3
done
echo "[PRE] All dependency checks completed!"

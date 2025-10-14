#!/bin/bash
set -e

echo "[STAGE 2] Starting PostgreSQL and initializing database"

# Start PostgreSQL in background
su postgres -c "postgres -D /var/lib/postgresql/data/pgdata" &
POSTGRES_PID=$!

# Wait for PostgreSQL to be ready
for i in {1..30}; do
  if pg_isready -U judge -d hackathon_db 2>/dev/null; then
    echo "[STAGE 2] PostgreSQL is ready"
    break
  fi
  echo "[STAGE 2] Waiting for PostgreSQL... ($i/30)"
  sleep 2
done

# Create base tables
echo "[STAGE 2] Creating base schema..."
psql -U judge -d hackathon_db <<'EOF'
CREATE TABLE IF NOT EXISTS events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id BIGINT,
    event_type VARCHAR(50),
    event_ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    payload JSONB
);

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    signup_ts TIMESTAMP,
    country CHAR(2),
    plan VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS devices (
    device_id BIGINT PRIMARY KEY,
    device_type VARCHAR(30),
    os_version VARCHAR(20)
);
EOF

# Generate sample data
echo "[STAGE 2] Generating sample dataset (1M+ records)..."
python3 /workspace/generate_data.py

# Record initial size
INITIAL_SIZE=$(psql -U judge -d hackathon_db -t -c "SELECT pg_database_size('hackathon_db');")
echo "[STAGE 2] Initial database size: $INITIAL_SIZE bytes"

# Save for later
mkdir -p /shared
echo $INITIAL_SIZE > /shared/initial_size.txt

echo "[STAGE 2] Database ready and running (PID: $POSTGRES_PID)"
echo "[STAGE 2] Stage complete - PostgreSQL will continue running"

# Keep container alive
tail -f /dev/null

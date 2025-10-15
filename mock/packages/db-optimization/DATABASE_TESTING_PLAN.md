# Database Container Testing Plan

This document provides a comprehensive plan to test the database container in isolation, verifying proper configuration, mounting, initialization, and functionality.

## Overview

The database container is part of the `db-optimization` problem package. It runs PostgreSQL 14 and must be properly initialized with baseline data before the submission container can execute tests.

### Stage Architecture

**Stage 1 - Image Building (One-time, Reusable)**:

- **Purpose**: Build the database Docker image with all necessary dependencies
- **Process**: Runs the Dockerfile to create an image
- **Reusability**: Built once and reused across all submission evaluations
- **Output**: A Docker image (e.g., `db-optimization-database:latest`)
- **No Execution**: Does not run the database or execute hooks

**Stage 2 - Container Execution (Fresh per Evaluation)**:

- **Purpose**: Run a fresh container for each submission evaluation
- **Process**: Creates and starts a new container from the Stage 1 image
- **Mounts**: Hooks and data directories are mounted at runtime
- **Fresh State**: New container ensures clean state for each evaluation
- **Executes**: Runs pre/periodic hooks and starts the database service

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: Image Building (ONE TIME)                             │
│                                                                 │
│  Dockerfile  ─────> [docker build] ─────> Image (reusable)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (reuse for all evaluations)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: Container Execution (FRESH FOR EACH EVALUATION)       │
│                                                                 │
│  Evaluation 1:  Image ──> [docker create + mounts] ──> Run     │
│  Evaluation 2:  Image ──> [docker create + mounts] ──> Run     │
│  Evaluation 3:  Image ──> [docker create + mounts] ──> Run     │
│                                                                 │
│  Each evaluation gets a FRESH container with clean state       │
└─────────────────────────────────────────────────────────────────┘
```

## Test Phases

### Phase 1: Stage 1 - Build the Docker Image

**Objective**: Build a reusable database image with all dependencies installed (one-time setup).

```bash
cd /home/vtvinh24/Desktop/Workspace/Capstone/judgehost/mock/packages/db-optimization/database

# Build the image
docker build -t db-optimization-database:test .

# Verify image exists
docker images | grep db-optimization-database

# Inspect image layers
docker history db-optimization-database:test
```

**Expected Results**:

- Image builds without errors
- Image size is reasonable (< 500MB for PostgreSQL Alpine)
- Base image is `postgres:14-alpine`

---

### Phase 2: Stage 2 - Create Container with Mounts

**Objective**: Create a fresh container using the Stage 1 image with proper volume mounts for hooks and data (simulating a new evaluation).

```bash
cd /home/vtvinh24/Desktop/Workspace/Capstone/judgehost/mock/packages/db-optimization

# Get absolute paths
PACKAGE_DIR=$(pwd)
DATABASE_DIR="$PACKAGE_DIR/database"

# Create container (Stage 2)
docker create \
  --name db-optimization-database-test \
  --mount type=bind,source="$DATABASE_DIR/hooks",target=/workspace/hooks,readonly \
  --mount type=bind,source="$DATABASE_DIR/data",target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  -e POSTGRES_USER=judge \
  -e POSTGRES_PASSWORD=judgepass \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  --cpu-quota=200000 \
  --memory=2g \
  db-optimization-database:test

# Verify container created
docker ps -a | grep db-optimization-database-test
```

**Expected Results**:

- Container created successfully with status `Created`
- Container shows resource limits applied

---

### Phase 3: Verify Mounts Before Starting

**Objective**: Inspect the container configuration to verify mounts are correctly set up.

```bash
# Inspect container mounts
docker inspect db-optimization-database-test --format='{{json .Mounts}}' | python3 -m json.tool

# Inspect environment variables
docker inspect db-optimization-database-test --format='{{json .Config.Env}}' | python3 -m json.tool

# Inspect resource limits
docker inspect db-optimization-database-test --format='{{json .HostConfig.Memory}}'
docker inspect db-optimization-database-test --format='{{json .HostConfig.CpuQuota}}'
```

**Expected Results**:

- Two bind mounts visible:
  - `/workspace/hooks` → `database/hooks` (readonly)
  - `/workspace/data` → `database/data` (readonly)
- Environment variables set correctly:
  - `POSTGRES_DB=hackathon_db`
  - `POSTGRES_USER=judge`
  - `POSTGRES_PASSWORD=judgepass`
- Resource limits:
  - Memory: 2147483648 (2GB)
  - CPU Quota: 200000 (2.0 CPUs)

---

### Phase 4: Start Container and Verify Initialization

**Objective**: Start the Stage 2 container (fresh evaluation) and verify it runs correctly.

```bash
# Start the container
docker start db-optimization-database-test

# Wait a few seconds for PostgreSQL to initialize
sleep 5

# Check container status
docker ps | grep db-optimization-database-test

# Check container logs
docker logs db-optimization-database-test

# Verify PostgreSQL is ready
docker exec db-optimization-database-test pg_isready -U judge -d hackathon_db
```

**Expected Results**:

- Container status is `Up`
- Logs show PostgreSQL initialization messages
- `pg_isready` returns: `hackathon_db:5432 - accepting connections`

---

### Phase 5: Verify Hook and Data File Accessibility

**Objective**: Verify that hooks and data files are properly mounted and accessible inside the container.

```bash
# List hooks directory structure
docker exec db-optimization-database-test ls -laR /workspace/hooks

# List data directory
docker exec db-optimization-database-test ls -la /workspace/data

# Verify hook scripts are executable
docker exec db-optimization-database-test test -x /workspace/hooks/pre/01_initialize.sh && echo "01_initialize.sh is executable"
docker exec db-optimization-database-test test -x /workspace/hooks/pre/02_migration.sh && echo "02_migration.sh is executable"
docker exec db-optimization-database-test test -x /workspace/hooks/periodic/01_healthcheck.sh && echo "01_healthcheck.sh is executable"

# Verify data files exist
docker exec db-optimization-database-test test -f /workspace/data/baseline_Q1.sql && echo "baseline_Q1.sql exists"
docker exec db-optimization-database-test test -f /workspace/data/baseline_Q2.sql && echo "baseline_Q2.sql exists"
docker exec db-optimization-database-test test -f /workspace/data/baseline_Q3.sql && echo "baseline_Q3.sql exists"

# Try to read first few lines of a data file
docker exec db-optimization-database-test head -n 10 /workspace/data/baseline_Q1.sql
```

**Expected Results**:

- All directories and files are visible
- Hook scripts have execute permissions
- All three baseline SQL files exist
- Can read content from SQL files

---

### Phase 6: Execute Pre-hooks Manually

**Objective**: Run the pre-hooks to initialize the database schema and data.

```bash
# Execute pre-hook 01: Initialize schema
docker exec db-optimization-database-test /bin/sh /workspace/hooks/pre/01_initialize.sh

# Check exit code
echo "Exit code: $?"

# Execute pre-hook 02: Run migrations (if any)
docker exec db-optimization-database-test /bin/sh /workspace/hooks/pre/02_migration.sh

# Check exit code
echo "Exit code: $?"

# View logs after hooks
docker logs db-optimization-database-test --tail 50
```

**Expected Results**:

- Both hooks execute successfully (exit code 0)
- Logs show schema creation and data population
- No error messages in logs

---

### Phase 7: Verify Database Initialization

**Objective**: Connect to PostgreSQL and verify the database is properly initialized with expected tables and data.

```bash
# List all databases
docker exec db-optimization-database-test psql -U judge -d hackathon_db -c "\l"

# List all tables in the database
docker exec db-optimization-database-test psql -U judge -d hackathon_db -c "\dt"

# Get row counts for each table
docker exec db-optimization-database-test psql -U judge -d hackathon_db -c "
SELECT
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public';
"

# Check if there's data in tables (assuming common table names)
# You may need to adjust based on actual schema
docker exec db-optimization-database-test psql -U judge -d hackathon_db -c "
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"

# Test that baseline queries can execute
docker exec db-optimization-database-test psql -U judge -d hackathon_db -f /workspace/data/baseline_Q1.sql
docker exec db-optimization-database-test psql -U judge -d hackathon_db -f /workspace/data/baseline_Q2.sql
docker exec db-optimization-database-test psql -U judge -d hackathon_db -f /workspace/data/baseline_Q3.sql
```

**Expected Results**:

- Database `hackathon_db` exists
- Multiple tables are present in the `public` schema
- Tables contain data (row counts > 0)
- Baseline queries execute without errors

---

### Phase 8: Test Periodic Health Check

**Objective**: Verify the health check hook works correctly.

```bash
# Execute periodic health check
docker exec db-optimization-database-test /bin/sh /workspace/hooks/periodic/01_healthcheck.sh

# Check exit code
echo "Health check exit code: $?"

# Verify health check using pg_isready
docker exec db-optimization-database-test pg_isready -U judge -d hackathon_db
```

**Expected Results**:

- Health check script exits with code 0
- `pg_isready` reports database is accepting connections

---

### Phase 9: Test Network Connectivity (Stage 2 Config)

**Objective**: Test the container with Stage 2 configuration including network setup.

```bash
# Stop and remove the test container
docker stop db-optimization-database-test
docker rm db-optimization-database-test

# Create a custom network (simulating the judgehost network creation)
docker network create --internal sql-optimization-test-network

# Create and start container with network (Stage 2)
PACKAGE_DIR=$(pwd)
DATABASE_DIR="$PACKAGE_DIR/database"

docker create \
  --name db-optimization-database-test \
  --network sql-optimization-test-network \
  --network-alias database \
  --hostname database \
  --mount type=bind,source="$DATABASE_DIR/hooks",target=/workspace/hooks,readonly \
  --mount type=bind,source="$DATABASE_DIR/data",target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  -e POSTGRES_USER=judge \
  -e POSTGRES_PASSWORD=judgepass \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  --cpu-quota=200000 \
  --memory=2g \
  --health-cmd='pg_isready -U judge -d hackathon_db' \
  --health-interval=3s \
  --health-timeout=2s \
  --health-retries=10 \
  --health-start-period=10s \
  db-optimization-database:test

# Start the container
docker start db-optimization-database-test

# Wait for health check
echo "Waiting for container to become healthy..."
for i in {1..30}; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' db-optimization-database-test 2>/dev/null)
    echo "Health status: $HEALTH"
    if [ "$HEALTH" = "healthy" ]; then
        echo "Container is healthy!"
        break
    fi
    sleep 2
done

# Create a test container in the same network to verify connectivity
docker run --rm \
  --network sql-optimization-test-network \
  postgres:14-alpine \
  psql -h database -U judge -d hackathon_db -c "SELECT 1 as test;" \
  2>&1 || echo "Connection test completed"
```

**Expected Results**:

- Network created successfully
- Container joins the network
- Health check transitions from `starting` → `healthy`
- Test container can connect to database via hostname `database`

---

### Phase 10: Resource Limit Verification

**Objective**: Verify resource limits are properly enforced.

```bash
# Check actual resource usage
docker stats --no-stream db-optimization-database-test

# Verify memory limit
docker inspect db-optimization-database-test --format='Memory Limit: {{.HostConfig.Memory}} bytes ({{div .HostConfig.Memory 1073741824}} GB)'

# Verify CPU limit
docker inspect db-optimization-database-test --format='CPU Quota: {{.HostConfig.CpuQuota}} ({{div .HostConfig.CpuQuota 100000}} CPUs)'
```

**Expected Results**:

- Memory usage is capped at 2GB
- CPU usage respects 2.0 CPU limit
- Stats show reasonable resource consumption

---

### Phase 11: Test Cleanup

**Objective**: Verify proper cleanup procedures.

```bash
# Stop container
docker stop db-optimization-database-test

# Remove container
docker rm db-optimization-database-test

# Remove network
docker network rm sql-optimization-test-network

# Remove image (optional)
docker rmi db-optimization-database:test

# Verify cleanup
docker ps -a | grep db-optimization-database-test || echo "Container removed successfully"
docker network ls | grep sql-optimization-test-network || echo "Network removed successfully"
docker images | grep db-optimization-database || echo "Image removed successfully"
```

**Expected Results**:

- All resources cleaned up successfully
- No orphaned containers, networks, or volumes

---

## Automated Test Script

Create a test script to automate the above phases:

```bash
#!/bin/bash
# Save as: test-database-container.sh

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR"
DATABASE_DIR="$PACKAGE_DIR/database"

CONTAINER_NAME="db-optimization-database-test"
IMAGE_NAME="db-optimization-database:test"
NETWORK_NAME="sql-optimization-test-network"

echo "=== Phase 1: Build Docker Image ==="
cd "$DATABASE_DIR"
docker build -t "$IMAGE_NAME" .
echo "✓ Image built successfully"

echo ""
echo "=== Phase 2: Create Container (Stage 1) ==="
docker create \
  --name "$CONTAINER_NAME" \
  --mount type=bind,source="$DATABASE_DIR/hooks",target=/workspace/hooks,readonly \
  --mount type=bind,source="$DATABASE_DIR/data",target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  -e POSTGRES_USER=judge \
  -e POSTGRES_PASSWORD=judgepass \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  --cpu-quota=200000 \
  --memory=2g \
  "$IMAGE_NAME"
echo "✓ Container created"

echo ""
echo "=== Phase 3: Verify Mounts ==="
docker inspect "$CONTAINER_NAME" --format='{{json .Mounts}}' | python3 -m json.tool
echo "✓ Mounts verified"

echo ""
echo "=== Phase 4: Start Container ==="
docker start "$CONTAINER_NAME"
sleep 5
docker ps | grep "$CONTAINER_NAME"
echo "✓ Container started"

echo ""
echo "=== Phase 5: Verify File Accessibility ==="
docker exec "$CONTAINER_NAME" ls -laR /workspace/hooks
docker exec "$CONTAINER_NAME" ls -la /workspace/data
echo "✓ Files accessible"

echo ""
echo "=== Phase 6: Execute Pre-hooks ==="
docker exec "$CONTAINER_NAME" /bin/sh /workspace/hooks/pre/01_initialize.sh
docker exec "$CONTAINER_NAME" /bin/sh /workspace/hooks/pre/02_migration.sh
echo "✓ Pre-hooks executed"

echo ""
echo "=== Phase 7: Verify Database ==="
docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -c "\dt"
docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -c "
SELECT schemaname, tablename, n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
echo "✓ Database initialized"

echo ""
echo "=== Phase 8: Test Health Check ==="
docker exec "$CONTAINER_NAME" /bin/sh /workspace/hooks/periodic/01_healthcheck.sh
echo "✓ Health check passed"

echo ""
echo "=== Cleanup ==="
docker stop "$CONTAINER_NAME"
docker rm "$CONTAINER_NAME"
echo "✓ Cleanup complete"

echo ""
echo "=== All Tests Passed! ==="
```

---

## Common Issues and Fixes

### Issue 1: Permission Denied on Hook Scripts

**Symptom**: `Permission denied` when executing hooks

**Fix**:

```bash
# Make hook scripts executable on host
chmod +x database/hooks/pre/*.sh
chmod +x database/hooks/periodic/*.sh
```

### Issue 2: PostgreSQL Not Ready

**Symptom**: `pg_isready` returns "no response" or "rejecting connections"

**Fix**:

- Wait longer (PostgreSQL needs 10-15 seconds to initialize)
- Check logs: `docker logs db-optimization-database-test`
- Verify PGDATA directory permissions

### Issue 3: Mount Points Not Working

**Symptom**: `/workspace/hooks` or `/workspace/data` is empty

**Fix**:

```bash
# Use absolute paths for bind mounts
PACKAGE_DIR=$(realpath /path/to/db-optimization)
docker create \
  --mount type=bind,source="$PACKAGE_DIR/database/hooks",target=/workspace/hooks,readonly \
  ...
```

### Issue 4: Health Check Fails

**Symptom**: Container stuck in "starting" state

**Fix**:

```bash
# Check health check command manually
docker exec db-optimization-database-test pg_isready -U judge -d hackathon_db

# Verify database name and user match environment variables
docker inspect db-optimization-database-test --format='{{json .Config.Env}}'
```

### Issue 5: Cannot Execute Baseline Queries

**Symptom**: SQL files not found or syntax errors

**Fix**:

```bash
# Verify SQL files exist and are readable
docker exec db-optimization-database-test cat /workspace/data/baseline_Q1.sql

# Check PostgreSQL logs for detailed errors
docker logs db-optimization-database-test | grep ERROR
```

---

## Success Criteria

The database container is considered fully functional when:

1. ✅ Image builds without errors
2. ✅ Container creates with proper mounts
3. ✅ Container starts and reaches healthy state
4. ✅ All hooks and data files are accessible
5. ✅ Pre-hooks execute successfully
6. ✅ Database contains expected tables with data
7. ✅ Baseline queries execute without errors
8. ✅ Health check returns success
9. ✅ Resource limits are enforced
10. ✅ Network connectivity works (for stage 2)

---

## Next Steps

After verifying the database container works correctly:

1. Test the submission container in isolation
2. Test both containers together with dependency management
3. Test with actual submission files
4. Integrate with the judgehost API
5. Run full end-to-end tests

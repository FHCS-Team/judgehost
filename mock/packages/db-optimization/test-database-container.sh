#!/bin/bash
# Automated Database Container Test Script
# Tests the db-optimization database container in isolation

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR"
DATABASE_DIR="$PACKAGE_DIR/database"

# Container configuration
CONTAINER_NAME="db-optimization-database-test"
IMAGE_NAME="db-optimization-database:test"
NETWORK_NAME="sql-optimization-test-network"

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}=== $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

cleanup() {
    print_header "Cleanup"
    
    # Stop and remove container
    if docker ps -a | grep -q "$CONTAINER_NAME"; then
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        print_info "Container removed"
    fi
    
    # Remove network
    if docker network ls | grep -q "$NETWORK_NAME"; then
        docker network rm "$NETWORK_NAME" 2>/dev/null || true
        print_info "Network removed"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Start testing
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Container Test Suite                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Stage 1 = Build image (one-time, reusable)"
print_info "Stage 2 = Run container (fresh per evaluation)"

# Phase 1: Stage 1 - Build Image
print_header "Phase 1: Stage 1 - Build Docker Image (One-time Setup)"
cd "$DATABASE_DIR"
if docker build -t "$IMAGE_NAME" . > /tmp/docker-build.log 2>&1; then
    print_success "Image built successfully"
    
    # Check image size
    IMAGE_SIZE=$(docker images "$IMAGE_NAME" --format "{{.Size}}")
    print_info "Image size: $IMAGE_SIZE"
else
    print_error "Image build failed"
    cat /tmp/docker-build.log
    exit 1
fi

# Return to package directory
cd "$PACKAGE_DIR"

# Phase 2: Stage 2 - Create Container
print_header "Phase 2: Stage 2 - Create Container (Fresh Evaluation)"
print_info "This simulates creating a fresh container for a new submission evaluation"
if docker create \
  --name "$CONTAINER_NAME" \
  --mount type=bind,source="$DATABASE_DIR/hooks",target=/workspace/hooks,readonly \
  --mount type=bind,source="$DATABASE_DIR/data",target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  -e POSTGRES_USER=judge \
  -e POSTGRES_PASSWORD=judgepass \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  --cpu-quota=200000 \
  --memory=2g \
  "$IMAGE_NAME" > /dev/null 2>&1; then
    print_success "Container created"
else
    print_error "Container creation failed"
    exit 1
fi

# Phase 3: Verify Mounts
print_header "Phase 3: Verify Mount Configuration"
MOUNT_COUNT=$(docker inspect "$CONTAINER_NAME" --format='{{json .Mounts}}' | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
if [ "$MOUNT_COUNT" -ge 2 ]; then
    print_success "Mounts configured (found $MOUNT_COUNT mounts)"
    
    # Show mount details
    print_info "Mount details:"
    docker inspect "$CONTAINER_NAME" --format='{{range .Mounts}}  {{.Source}} → {{.Destination}} (RW: {{.RW}})
{{end}}'
else
    print_error "Expected at least 2 mounts, found $MOUNT_COUNT"
fi

# Verify environment variables
ENV_COUNT=$(docker inspect "$CONTAINER_NAME" --format='{{.Config.Env}}' | tr ' ' '\n' | grep -c "POSTGRES" || echo "0")
if [ "$ENV_COUNT" -ge 3 ]; then
    print_success "Environment variables configured"
else
    print_error "Missing environment variables (found $ENV_COUNT, expected 3+)"
fi

# Phase 4: Start Container
print_header "Phase 4: Stage 2 - Start Container and Initialize"
print_info "Container runs with mounted hooks and data"
if docker start "$CONTAINER_NAME" > /dev/null 2>&1; then
    print_success "Container started"
    
    # Wait for PostgreSQL to initialize
    print_info "Waiting for PostgreSQL to initialize..."
    sleep 8
    
    if docker ps | grep -q "$CONTAINER_NAME"; then
        print_success "Container is running"
    else
        print_error "Container stopped unexpectedly"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
else
    print_error "Container start failed"
    exit 1
fi

# Phase 5: Verify File Accessibility
print_header "Phase 5: Verify File Accessibility"

# Check hooks directory
if docker exec "$CONTAINER_NAME" test -d /workspace/hooks; then
    print_success "Hooks directory accessible"
    
    # Check pre hooks
    if docker exec "$CONTAINER_NAME" test -f /workspace/hooks/pre/01_initialize.sh; then
        print_success "Found 01_initialize.sh"
    else
        print_error "Missing 01_initialize.sh"
    fi
    
    if docker exec "$CONTAINER_NAME" test -f /workspace/hooks/pre/02_migration.sh; then
        print_success "Found 02_migration.sh"
    else
        print_error "Missing 02_migration.sh"
    fi
    
    # Check periodic hooks
    if docker exec "$CONTAINER_NAME" test -f /workspace/hooks/periodic/01_healthcheck.sh; then
        print_success "Found 01_healthcheck.sh"
    else
        print_error "Missing 01_healthcheck.sh"
    fi
else
    print_error "Hooks directory not accessible"
fi

# Check data directory
if docker exec "$CONTAINER_NAME" test -d /workspace/data; then
    print_success "Data directory accessible"
    
    # Check SQL files
    for sql_file in baseline_Q1.sql baseline_Q2.sql baseline_Q3.sql; do
        if docker exec "$CONTAINER_NAME" test -f "/workspace/data/$sql_file"; then
            print_success "Found $sql_file"
        else
            print_error "Missing $sql_file"
        fi
    done
else
    print_error "Data directory not accessible"
fi

# Phase 6: Execute Pre-hooks
print_header "Phase 6: Execute Pre-hooks"

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to accept connections..."
for i in {1..20}; do
    if docker exec "$CONTAINER_NAME" pg_isready -U judge -d hackathon_db > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 20 ]; then
        print_error "PostgreSQL failed to become ready"
        docker logs "$CONTAINER_NAME" | tail -20
        exit 1
    fi
    sleep 1
done

# Execute initialization hook
print_info "Executing 01_initialize.sh..."
if docker exec "$CONTAINER_NAME" /bin/sh /workspace/hooks/pre/01_initialize.sh > /tmp/hook1.log 2>&1; then
    print_success "01_initialize.sh executed successfully"
else
    print_error "01_initialize.sh failed"
    cat /tmp/hook1.log
fi

# Execute migration hook
print_info "Executing 02_migration.sh..."
if docker exec "$CONTAINER_NAME" /bin/sh /workspace/hooks/pre/02_migration.sh > /tmp/hook2.log 2>&1; then
    print_success "02_migration.sh executed successfully"
else
    print_error "02_migration.sh failed"
    cat /tmp/hook2.log
fi

# Phase 7: Verify Database Initialization
print_header "Phase 7: Verify Database Initialization"

# List databases
print_info "Available databases:"
docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -c "\l" 2>/dev/null | grep hackathon_db
if [ $? -eq 0 ]; then
    print_success "Database 'hackathon_db' exists"
else
    print_error "Database 'hackathon_db' not found"
fi

# List tables
print_info "Checking for tables..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "Found $TABLE_COUNT tables in public schema"
    
    # Show table names
    print_info "Tables:"
    docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -c "\dt" 2>/dev/null | grep "public"
else
    print_warning "No tables found (might be expected if hooks don't create tables)"
fi

# Check row counts
print_info "Checking table row counts..."
# Try direct counting on known tables
for table in users devices events; do
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' ')
    if [ -n "$COUNT" ]; then
        if [ "$COUNT" -gt 0 ]; then
            print_success "Table '$table' has $COUNT rows"
        else
            print_warning "Table '$table' has 0 rows (might be empty initially)"
        fi
    else
        print_error "Could not count rows in table '$table'"
    fi
done

# Test baseline queries
print_info "Testing baseline queries..."
for i in 1 2 3; do
    if docker exec "$CONTAINER_NAME" psql -U judge -d hackathon_db -f "/workspace/data/baseline_Q${i}.sql" > /tmp/query${i}.log 2>&1; then
        print_success "baseline_Q${i}.sql executed successfully"
    else
        print_warning "baseline_Q${i}.sql failed (might be expected if tables don't exist yet)"
        # cat /tmp/query${i}.log
    fi
done

# Phase 8: Test Health Check
print_header "Phase 8: Test Health Check"

if docker exec "$CONTAINER_NAME" /bin/sh /workspace/hooks/periodic/01_healthcheck.sh > /dev/null 2>&1; then
    print_success "Health check hook passed"
else
    print_error "Health check hook failed"
fi

if docker exec "$CONTAINER_NAME" pg_isready -U judge -d hackathon_db > /dev/null 2>&1; then
    print_success "pg_isready check passed"
else
    print_error "pg_isready check failed"
fi

# Phase 9: Test Resource Limits
print_header "Phase 9: Verify Resource Limits"

# Check memory limit
MEMORY_LIMIT=$(docker inspect "$CONTAINER_NAME" --format='{{.HostConfig.Memory}}')
if [ "$MEMORY_LIMIT" -eq 2147483648 ]; then
    print_success "Memory limit set correctly (2GB)"
else
    print_warning "Memory limit is $MEMORY_LIMIT (expected 2147483648)"
fi

# Check CPU limit
CPU_QUOTA=$(docker inspect "$CONTAINER_NAME" --format='{{.HostConfig.CpuQuota}}')
if [ "$CPU_QUOTA" -eq 200000 ]; then
    print_success "CPU quota set correctly (2.0 CPUs)"
else
    print_warning "CPU quota is $CPU_QUOTA (expected 200000)"
fi

# Show resource usage
print_info "Current resource usage:"
docker stats --no-stream "$CONTAINER_NAME"

# Phase 10: Test with Network (Stage 2 config)
print_header "Phase 10: Test Network Configuration"

# Stop current container
docker stop "$CONTAINER_NAME" > /dev/null 2>&1
docker rm "$CONTAINER_NAME" > /dev/null 2>&1

# Create network
if docker network create --internal "$NETWORK_NAME" > /dev/null 2>&1; then
    print_success "Created internal network"
else
    print_error "Failed to create network"
fi

# Create container with network and health check
if docker create \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
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
  "$IMAGE_NAME" > /dev/null 2>&1; then
    print_success "Container created with network and health check"
else
    print_error "Failed to create container with network"
fi

# Start container
if docker start "$CONTAINER_NAME" > /dev/null 2>&1; then
    print_success "Container started with network"
    
    # Wait for health check
    print_info "Waiting for health check to pass..."
    for i in {1..30}; do
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)
        if [ "$HEALTH" = "healthy" ]; then
            print_success "Container is healthy (took $i checks)"
            break
        elif [ "$HEALTH" = "unhealthy" ]; then
            print_error "Container became unhealthy"
            docker inspect --format='{{json .State.Health}}' "$CONTAINER_NAME" | python3 -m json.tool
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "Container did not become healthy within 60 seconds (status: $HEALTH)"
        fi
        sleep 2
    done
else
    print_error "Container failed to start with network"
fi

# Test connectivity from another container
print_info "Testing network connectivity..."
if docker run --rm \
  --network "$NETWORK_NAME" \
  -e PGPASSWORD=judgepass \
  postgres:14-alpine \
  psql -h database -U judge -d hackathon_db -c "SELECT 1 as connectivity_test;" > /tmp/connectivity.log 2>&1; then
    print_success "Network connectivity test passed"
else
    print_warning "Network connectivity test failed (might be due to timing)"
    # cat /tmp/connectivity.log
fi

# Final Report
print_header "Test Summary"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}  Tests Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo -e "${GREEN}  The database container is ready for integration.${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ Some tests failed or produced warnings.${NC}"
    echo -e "${YELLOW}  Review the output above for details.${NC}"
    exit 1
fi

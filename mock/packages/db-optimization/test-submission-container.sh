#!/bin/bash
# Automated Submission Container Test Script
# Tests the db-optimization submission container with sample submission

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
SUBMISSION_DIR="$PACKAGE_DIR/submission"
SAMPLE_SUBMISSION_DIR="$SCRIPT_DIR/../db-optimization-submission-sample"

# Container configuration
DB_CONTAINER_NAME="db-opt-test-database"
SUB_CONTAINER_NAME="db-opt-test-submission"
DB_IMAGE_NAME="db-optimization-database:test"
SUB_IMAGE_NAME="db-optimization-submission:test"
NETWORK_NAME="db-opt-test-network"

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
    
    # Stop and remove submission container
    if docker ps -a | grep -q "$SUB_CONTAINER_NAME"; then
        docker stop "$SUB_CONTAINER_NAME" 2>/dev/null || true
        docker rm "$SUB_CONTAINER_NAME" 2>/dev/null || true
        print_info "Submission container removed"
    fi
    
    # Stop and remove database container
    if docker ps -a | grep -q "$DB_CONTAINER_NAME"; then
        docker stop "$DB_CONTAINER_NAME" 2>/dev/null || true
        docker rm "$DB_CONTAINER_NAME" 2>/dev/null || true
        print_info "Database container removed"
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
echo -e "${BLUE}║   Submission Container Test Suite                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Testing submission container with sample submission"
print_info "Stage 1 = Build images (one-time, reusable)"
print_info "Stage 2 = Run containers (fresh per evaluation)"

# Verify sample submission exists
print_header "Phase 0: Verify Sample Submission"
if [ ! -d "$SAMPLE_SUBMISSION_DIR" ]; then
    print_error "Sample submission directory not found: $SAMPLE_SUBMISSION_DIR"
    exit 1
fi

REQUIRED_FILES=("migration.sql" "Q1.sql" "Q2.sql" "Q3.sql")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$SAMPLE_SUBMISSION_DIR/$file" ]; then
        print_success "Found $file"
    else
        print_error "Missing required file: $file"
        exit 1
    fi
done

# Phase 1: Build Database Image
print_header "Phase 1: Stage 1 - Build Database Image"
cd "$DATABASE_DIR"
if docker build -t "$DB_IMAGE_NAME" . > /tmp/docker-build-db.log 2>&1; then
    print_success "Database image built successfully"
    DB_IMAGE_SIZE=$(docker images "$DB_IMAGE_NAME" --format "{{.Size}}")
    print_info "Database image size: $DB_IMAGE_SIZE"
else
    print_error "Database image build failed"
    cat /tmp/docker-build-db.log
    exit 1
fi

cd "$PACKAGE_DIR"

# Phase 2: Build Submission Image
print_header "Phase 2: Stage 1 - Build Submission Image"
cd "$SUBMISSION_DIR"
if docker build -t "$SUB_IMAGE_NAME" . > /tmp/docker-build-sub.log 2>&1; then
    print_success "Submission image built successfully"
    SUB_IMAGE_SIZE=$(docker images "$SUB_IMAGE_NAME" --format "{{.Size}}")
    print_info "Submission image size: $SUB_IMAGE_SIZE"
else
    print_error "Submission image build failed"
    cat /tmp/docker-build-sub.log
    exit 1
fi

cd "$PACKAGE_DIR"

# Phase 3: Create Network
print_header "Phase 3: Create Docker Network"
# Remove network if it exists from previous run
docker network rm "$NETWORK_NAME" 2>/dev/null || true
if docker network create "$NETWORK_NAME" > /dev/null 2>&1; then
    print_success "Network created"
else
    print_error "Network creation failed"
    exit 1
fi

# Phase 4: Create and Start Database Container
print_header "Phase 4: Stage 2 - Start Database Container"
print_info "Creating fresh database container for evaluation"

# Create shared directory for inter-container communication
SHARED_DIR="/tmp/db-opt-shared-$$"
mkdir -p "$SHARED_DIR"

if docker create \
  --name "$DB_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --network-alias database \
  --mount type=bind,source="$DATABASE_DIR/hooks",target=/workspace/hooks,readonly \
  --mount type=bind,source="$DATABASE_DIR/data",target=/workspace/data,readonly \
  --mount type=bind,source="$SHARED_DIR",target=/shared \
  -e POSTGRES_DB=hackathon_db \
  -e POSTGRES_USER=judge \
  -e POSTGRES_PASSWORD=judgepass \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  --cpu-quota=200000 \
  --memory=2g \
  "$DB_IMAGE_NAME" > /dev/null 2>&1; then
    print_success "Database container created"
else
    print_error "Database container creation failed"
    exit 1
fi

if docker start "$DB_CONTAINER_NAME" > /dev/null 2>&1; then
    print_success "Database container started"
else
    print_error "Database container start failed"
    exit 1
fi

# Wait for PostgreSQL to initialize
print_info "Waiting for PostgreSQL to initialize..."
sleep 8

# Execute database pre-hooks
print_info "Executing database pre-hooks..."
docker exec "$DB_CONTAINER_NAME" /bin/sh /workspace/hooks/pre/01_initialize.sh > /tmp/db-hook1.log 2>&1
if [ $? -eq 0 ]; then
    print_success "Database initialization hook executed"
else
    print_error "Database initialization failed"
    cat /tmp/db-hook1.log
    exit 1
fi

docker exec "$DB_CONTAINER_NAME" /bin/sh /workspace/hooks/pre/02_migration.sh > /tmp/db-hook2.log 2>&1
if [ $? -eq 0 ]; then
    print_success "Database migration hook executed"
else
    print_error "Database migration failed"
    cat /tmp/db-hook2.log
    exit 1
fi

# Verify database is ready
print_info "Verifying database is ready..."
if docker exec "$DB_CONTAINER_NAME" pg_isready -U judge -d hackathon_db > /dev/null 2>&1; then
    print_success "Database is ready"
else
    print_error "Database is not ready"
    exit 1
fi

# Verify baseline data is loaded
print_info "Verifying baseline data..."
USER_COUNT=$(docker exec "$DB_CONTAINER_NAME" psql -U judge -d hackathon_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
if [ -n "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
    print_success "Baseline data loaded ($USER_COUNT users)"
else
    print_error "Baseline data not loaded"
    exit 1
fi

# Phase 5: Create and Start Submission Container
print_header "Phase 5: Stage 2 - Start Submission Container"
print_info "Creating fresh submission container with sample submission"

# Create output directory for results (shared directory already created in Phase 4)
OUTPUT_DIR="/tmp/db-opt-output-$$"
mkdir -p "$OUTPUT_DIR"

if docker create \
  --name "$SUB_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --mount type=bind,source="$SUBMISSION_DIR/hooks",target=/workspace/hooks,readonly \
  --mount type=bind,source="$SUBMISSION_DIR/data",target=/workspace/data,readonly \
  --mount type=bind,source="$SAMPLE_SUBMISSION_DIR",target=/submission,readonly \
  --mount type=bind,source="$OUTPUT_DIR",target=/out \
  --mount type=bind,source="$SHARED_DIR",target=/shared \
  -e DATABASE_HOST=database \
  -e DATABASE_NAME=hackathon_db \
  -e DATABASE_USER=judge \
  -e DATABASE_PASSWORD=judgepass \
  --cpu-quota=100000 \
  --memory=1g \
  "$SUB_IMAGE_NAME" \
  sleep infinity > /dev/null 2>&1; then
    print_success "Submission container created"
else
    print_error "Submission container creation failed"
    exit 1
fi

if docker start "$SUB_CONTAINER_NAME" > /dev/null 2>&1; then
    print_success "Submission container started"
else
    print_error "Submission container start failed"
    exit 1
fi

# Wait for container to be ready
sleep 2

# Phase 6: Verify Mounts in Submission Container
print_header "Phase 6: Verify Submission Container Mounts"

if docker exec "$SUB_CONTAINER_NAME" test -d /workspace/hooks; then
    print_success "Hooks directory mounted"
else
    print_error "Hooks directory not mounted"
fi

if docker exec "$SUB_CONTAINER_NAME" test -d /submission; then
    print_success "Submission directory mounted"
else
    print_error "Submission directory not mounted"
fi

if docker exec "$SUB_CONTAINER_NAME" test -d /out; then
    print_success "Output directory mounted"
else
    print_error "Output directory not mounted"
fi

# Verify submission files
for file in "${REQUIRED_FILES[@]}"; do
    if docker exec "$SUB_CONTAINER_NAME" test -f "/submission/$file"; then
        print_success "Submission file accessible: $file"
    else
        print_error "Submission file not accessible: $file"
    fi
done

# Phase 7: Execute Pre-hooks
print_header "Phase 7: Execute Submission Pre-hooks"

print_info "Executing 01_setup.sh..."
docker exec "$SUB_CONTAINER_NAME" /bin/sh /workspace/hooks/pre/01_setup.sh > /tmp/sub-hook1.log 2>&1
if [ $? -eq 0 ]; then
    print_success "Setup hook executed successfully"
else
    print_error "Setup hook failed"
    cat /tmp/sub-hook1.log
fi

print_info "Executing 02_migration.sh..."
docker exec "$SUB_CONTAINER_NAME" /bin/sh /workspace/hooks/pre/02_migration.sh > /tmp/sub-hook2.log 2>&1
if [ $? -eq 0 ]; then
    print_success "Migration hook executed successfully"
else
    print_error "Migration hook failed"
    cat /tmp/sub-hook2.log
fi

# Phase 8: Verify Database Connectivity from Submission
print_header "Phase 8: Verify Database Connectivity"

print_info "Testing connection from submission container to database..."
CONN_TEST=$(docker exec "$SUB_CONTAINER_NAME" psql -h database -U judge -d hackathon_db -t -c "SELECT 1;" 2>&1 | tr -d ' ')
if [ "$CONN_TEST" = "1" ]; then
    print_success "Database connectivity verified"
else
    print_error "Cannot connect to database from submission container"
    echo "Connection test output: $CONN_TEST"
fi

# Phase 9: Execute Post-hooks (Query Testing)
print_header "Phase 9: Execute Post-hooks (Query Testing)"

print_info "Executing 01_test_queries.sh..."
docker exec "$SUB_CONTAINER_NAME" /bin/sh /workspace/hooks/post/01_test_queries.sh > /tmp/sub-post1.log 2>&1
if [ $? -eq 0 ]; then
    print_success "Query testing hook executed successfully"
    # Show last 20 lines of output
    print_info "Query test results:"
    tail -20 /tmp/sub-post1.log | sed 's/^/  /'
else
    print_warning "Query testing hook completed with warnings"
    tail -20 /tmp/sub-post1.log | sed 's/^/  /'
fi

print_info "Executing 02_test_concurrency.sh..."
docker exec "$SUB_CONTAINER_NAME" /bin/sh /workspace/hooks/post/02_test_concurrency.sh > /tmp/sub-post2.log 2>&1
if [ $? -eq 0 ]; then
    print_success "Concurrency testing hook executed successfully"
else
    print_warning "Concurrency testing hook completed with warnings"
fi

print_info "Executing 03_evaluate_storage.sh..."
docker exec "$SUB_CONTAINER_NAME" /bin/sh /workspace/hooks/post/03_evaluate_storage.sh > /tmp/sub-post3.log 2>&1
STORAGE_EXIT=$?
if [ $STORAGE_EXIT -eq 0 ]; then
    print_success "Storage evaluation hook executed successfully"
else
    print_warning "Storage evaluation hook completed with exit code $STORAGE_EXIT"
    print_info "Last 10 lines of storage hook output:"
    tail -10 /tmp/sub-post3.log | sed 's/^/  /'
fi

# Phase 10: Verify Output Files and Evaluation Results
print_header "Phase 10: Verify Output Files and Evaluation Results"

# Check if output files exist
EXPECTED_OUTPUTS=("rubric_correctness.json" "rubric_query_latency.json" "rubric_concurrency.json" "rubric_resource_efficiency.json")
OPTIONAL_OUTPUTS=()

echo ""
print_info "═══ Evaluation Results ═══"
echo ""

TOTAL_SCORE=0
MAX_SCORE=0

for output in "${EXPECTED_OUTPUTS[@]}"; do
    if [ -f "$OUTPUT_DIR/$output" ]; then
        print_success "Output file created: $output"
        
        # Extract and display key information
        if command -v python3 > /dev/null 2>&1; then
            RUBRIC_NAME=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('rubric_id','unknown'))" 2>/dev/null || echo "unknown")
            SCORE=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('score',0))" 2>/dev/null || echo "0")
            MAX=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('max_score',0))" 2>/dev/null || echo "0")
            STATUS=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('status','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
            MESSAGE=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('message',''))" 2>/dev/null || echo "")
            
            print_info "  Rubric: $RUBRIC_NAME"
            print_info "  Score: $SCORE / $MAX"
            print_info "  Status: $STATUS"
            if [ -n "$MESSAGE" ]; then
                print_info "  Message: $MESSAGE"
            fi
            
            # Add to totals
            TOTAL_SCORE=$(awk "BEGIN {printf \"%.2f\", $TOTAL_SCORE + $SCORE}")
            MAX_SCORE=$(awk "BEGIN {printf \"%.0f\", $MAX_SCORE + $MAX}")
        else
            # Fallback: just show the file
            cat "$OUTPUT_DIR/$output" | sed 's/^/  /'
        fi
        echo ""
    else
        print_error "Output file missing: $output"
    fi
done

# Check optional outputs
for output in "${OPTIONAL_OUTPUTS[@]}"; do
    if [ -f "$OUTPUT_DIR/$output" ]; then
        print_success "Optional output file created: $output"
        
        if command -v python3 > /dev/null 2>&1; then
            RUBRIC_NAME=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('rubric_id','unknown'))" 2>/dev/null || echo "unknown")
            SCORE=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('score',0))" 2>/dev/null || echo "0")
            MAX=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('max_score',0))" 2>/dev/null || echo "0")
            STATUS=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('status','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
            MESSAGE=$(python3 -c "import json; data=json.load(open('$OUTPUT_DIR/$output')); print(data.get('message',''))" 2>/dev/null || echo "")
            
            print_info "  Rubric: $RUBRIC_NAME"
            print_info "  Score: $SCORE / $MAX"
            print_info "  Status: $STATUS"
            if [ -n "$MESSAGE" ]; then
                print_info "  Message: $MESSAGE"
            fi
            
            # Add to totals
            TOTAL_SCORE=$(awk "BEGIN {printf \"%.2f\", $TOTAL_SCORE + $SCORE}")
            MAX_SCORE=$(awk "BEGIN {printf \"%.0f\", $MAX_SCORE + $MAX}")
        fi
        echo ""
    else
        print_warning "Optional output file not created: $output"
    fi
done

# Display total score
echo ""
print_info "═══ Total Evaluation Score ═══"
print_info "Score: $TOTAL_SCORE / $MAX_SCORE"
if [ "$MAX_SCORE" -gt 0 ]; then
    PERCENTAGE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_SCORE * 100 / $MAX_SCORE)}")
    print_info "Percentage: ${PERCENTAGE}%"
fi
echo ""

# Phase 11: Verify Resource Limits
print_header "Phase 11: Verify Resource Limits"

# Check submission container limits
SUB_MEM=$(docker inspect "$SUB_CONTAINER_NAME" --format='{{.HostConfig.Memory}}')
if [ "$SUB_MEM" = "1073741824" ]; then
    print_success "Submission memory limit set correctly (1GB)"
else
    print_error "Submission memory limit incorrect (expected 1GB, got $SUB_MEM bytes)"
fi

SUB_CPU=$(docker inspect "$SUB_CONTAINER_NAME" --format='{{.HostConfig.CpuQuota}}')
if [ "$SUB_CPU" = "100000" ]; then
    print_success "Submission CPU quota set correctly (1.0 CPUs)"
else
    print_error "Submission CPU quota incorrect (expected 100000, got $SUB_CPU)"
fi

# Show current resource usage
print_info "Current resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" "$DB_CONTAINER_NAME" "$SUB_CONTAINER_NAME" | sed 's/^/  /'

# Phase 12: Verify Network Isolation
print_header "Phase 12: Verify Network Isolation"

print_info "Testing network isolation..."
# Containers should only communicate via the custom network
NETWORKS=$(docker inspect "$SUB_CONTAINER_NAME" --format='{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}')
if [ -n "$NETWORKS" ]; then
    print_success "Submission container on isolated network"
else
    print_warning "Network configuration unclear"
fi

# Test that submission can reach database
PING_TEST=$(docker exec "$SUB_CONTAINER_NAME" sh -c "getent hosts database" 2>&1)
if echo "$PING_TEST" | grep -q "database"; then
    print_success "DNS resolution working (database hostname resolves)"
else
    print_error "Cannot resolve database hostname"
fi

# Test Summary
print_header "Test Summary"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo -e "  The submission container is ready for integration."
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed or produced warnings.${NC}"
    echo -e "  Review the output above for details."
    exit 1
fi

#!/bin/sh
# universal_entrypoint.sh: Main orchestrator for container execution
# This script runs inside evaluation containers and orchestrates the entire evaluation workflow
#
# Expected directory structure:
#   /workspace/problem/    - Problem files (from problem image)
#   /workspace/submission/ - Submission code (mounted)
#   /workspace/out/        - Output directory for results
#   /workspace/tools/      - This script and helper tools
#
# Execution flow:
#   1. Set up environment and directories
#   2. Run pre-deployment hooks (problem setup, dependency installation)
#   3. Start the submission application
#   4. Run post-deployment hooks (tests, evaluation)
#   5. Collect results and write to /workspace/out/

set -e

# ============================================================================
# Environment Setup
# ============================================================================

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
PROBLEM_DIR="${PROBLEM_DIR:-$WORKSPACE_DIR/problem}"
SUBMISSION_DIR="${SUBMISSION_DIR:-$WORKSPACE_DIR/submission}"
OUT_DIR="${OUT_DIR:-$WORKSPACE_DIR/out}"
TOOLS_DIR="${TOOLS_DIR:-$WORKSPACE_DIR/tools}"

# Hook directories in problem package
PRE_HOOKS="$PROBLEM_DIR/hooks/pre"
POST_HOOKS="$PROBLEM_DIR/hooks/post"
PERIODIC_HOOKS="$PROBLEM_DIR/hooks/periodic"

# Temporary directories for runtime data
TMP_DIR="/tmp/judgehost"
LOGS_DIR="$TMP_DIR/logs"
CACHE_DIR="$TMP_DIR/cache"
STATUS_DIR="$TMP_DIR/status"

# Create required directories
mkdir -p "$OUT_DIR" "$LOGS_DIR" "$CACHE_DIR" "$STATUS_DIR"
chmod -R 0755 "$TMP_DIR" 2>/dev/null || true

# Export environment variables for hooks
export WORKSPACE_DIR
export PROBLEM_DIR
export SUBMISSION_DIR
export OUT_DIR
export LOGS_DIR
export CACHE_DIR
export STATUS_DIR

# ============================================================================
# Utility Functions
# ============================================================================

log() {
    echo "[ENTRYPOINT] $*" | tee -a "$LOGS_DIR/entrypoint.log"
}

error() {
    echo "[ENTRYPOINT ERROR] $*" | tee -a "$LOGS_DIR/entrypoint.log" >&2
}

set_status() {
    echo "$2" > "$STATUS_DIR/$1"
    log "Status: $1 = $2"
}

get_status() {
    [ -f "$STATUS_DIR/$1" ] && cat "$STATUS_DIR/$1"
}

# ============================================================================
# Hook Execution
# ============================================================================

SCRIPT_RUNNER="$TOOLS_DIR/script_runner.sh"

# Make all scripts executable (helps with mounted volumes)
ensure_executable() {
    local dir="$1"
    if [ -d "$dir" ]; then
        find "$dir" -type f -exec chmod +x {} + 2>/dev/null || true
    fi
}

ensure_executable "$TOOLS_DIR"
ensure_executable "$PROBLEM_DIR/hooks"

# Ensure script runner is executable
if [ -f "$SCRIPT_RUNNER" ] && [ ! -x "$SCRIPT_RUNNER" ]; then
    chmod +x "$SCRIPT_RUNNER" 2>/dev/null || true
fi

run_hooks() {
    local hook_dir="$1"
    local hook_type="$2"
    
    if [ ! -d "$hook_dir" ]; then
        log "No $hook_type hooks found in $hook_dir"
        return 0
    fi
    
    log "Running $hook_type hooks..."
    set_status "current_stage" "$hook_type"
    
    if [ -f "$SCRIPT_RUNNER" ]; then
        "$SCRIPT_RUNNER" "$hook_dir" 2>&1 | tee -a "$LOGS_DIR/${hook_type}_hooks.log"
    else
        error "Script runner not found: $SCRIPT_RUNNER"
        # Fallback: run hooks directly
        for script in "$hook_dir"/*; do
            if [ -x "$script" ]; then
                log "Running: $(basename "$script")"
                "$script" 2>&1 | tee -a "$LOGS_DIR/${hook_type}_hooks.log"
            fi
        done
    fi
    
    log "$hook_type hooks completed"
}

# ============================================================================
# Main Execution Flow
# ============================================================================

main() {
    log "Starting evaluation..."
    log "Problem: $PROBLEM_DIR"
    log "Submission: $SUBMISSION_DIR"
    log "Output: $OUT_DIR"
    
    set_status "started_at" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    set_status "current_stage" "initializing"
    
    # Stage 1: Run pre-deployment hooks
    if [ -d "$PRE_HOOKS" ]; then
        run_hooks "$PRE_HOOKS" "pre"
    fi
    
    # Stage 2: Start periodic monitoring in background
    if [ -d "$PERIODIC_HOOKS" ]; then
        log "Starting periodic hooks..."
        if [ -f "$SCRIPT_RUNNER" ]; then
            "$SCRIPT_RUNNER" "$PERIODIC_HOOKS" periodic &
            PERIODIC_PID=$!
            log "Periodic hooks started (PID: $PERIODIC_PID)"
        fi
    fi
    
    # Stage 3: Run the submission application (if arguments provided)
    if [ $# -gt 0 ]; then
        log "Starting submission: $*"
        set_status "current_stage" "running_submission"
        
        # Run submission and capture exit code
        set +e
        "$@" 2>&1 | tee -a "$LOGS_DIR/submission.log"
        EXIT_CODE=$?
        set -e
        
        log "Submission exited with code: $EXIT_CODE"
        set_status "submission_exit_code" "$EXIT_CODE"
        
        # Give submission time to finish cleanup
        sleep 2
    else
        log "No submission command provided, running hooks only"
        EXIT_CODE=0
    fi
    
    # Stage 4: Run post-deployment hooks (evaluation)
    if [ -d "$POST_HOOKS" ]; then
        run_hooks "$POST_HOOKS" "post"
    fi
    
    # Stage 5: Stop periodic hooks
    if [ -n "${PERIODIC_PID:-}" ]; then
        log "Stopping periodic hooks..."
        kill "$PERIODIC_PID" 2>/dev/null || true
        wait "$PERIODIC_PID" 2>/dev/null || true
    fi
    
    # Stage 6: Collect results
    set_status "current_stage" "collecting_results"
    log "Collecting results..."
    
    # Copy all rubric JSON files to output
    if [ -d "$TMP_DIR" ]; then
        find "$TMP_DIR" -name "rubric_*.json" -exec cp {} "$OUT_DIR/" \; 2>/dev/null || true
    fi
    
    # Copy logs to output
    if [ -d "$LOGS_DIR" ]; then
        cp -r "$LOGS_DIR" "$OUT_DIR/logs" 2>/dev/null || true
    fi
    
    # Copy status to output
    if [ -d "$STATUS_DIR" ]; then
        cp -r "$STATUS_DIR" "$OUT_DIR/status" 2>/dev/null || true
    fi
    
    # Create summary file
    cat > "$OUT_DIR/summary.json" <<EOF
{
  "started_at": "$(get_status started_at)",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "submission_exit_code": ${EXIT_CODE},
  "status": "completed"
}
EOF
    
    set_status "current_stage" "completed"
    set_status "completed_at" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    log "Evaluation completed successfully"
    
    # Display logs if requested
    if [ "${SHOW_LOGS:-0}" = "1" ]; then
        echo ""
        echo "===== Execution Logs ====="
        [ -f "$LOGS_DIR/entrypoint.log" ] && cat "$LOGS_DIR/entrypoint.log"
        [ -f "$LOGS_DIR/submission.log" ] && echo "" && echo "=== Submission ===" && tail -n 100 "$LOGS_DIR/submission.log"
        [ -f "$LOGS_DIR/pre_hooks.log" ] && echo "" && echo "=== Pre Hooks ===" && tail -n 100 "$LOGS_DIR/pre_hooks.log"
        [ -f "$LOGS_DIR/post_hooks.log" ] && echo "" && echo "=== Post Hooks ===" && tail -n 100 "$LOGS_DIR/post_hooks.log"
        echo "===== End Logs ====="
    fi
    
    return $EXIT_CODE
}

# ============================================================================
# Error Handling
# ============================================================================

cleanup() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        error "Execution failed with code: $exit_code"
        set_status "current_stage" "failed"
        set_status "error_code" "$exit_code"
        
        # Create error summary
        cat > "$OUT_DIR/summary.json" <<EOF
{
  "started_at": "$(get_status started_at)",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "submission_exit_code": ${exit_code},
  "status": "failed",
  "error": "Execution failed"
}
EOF
        
        # Copy logs even on failure
        [ -d "$LOGS_DIR" ] && cp -r "$LOGS_DIR" "$OUT_DIR/logs" 2>/dev/null || true
        [ -d "$STATUS_DIR" ] && cp -r "$STATUS_DIR" "$OUT_DIR/status" 2>/dev/null || true
    fi
    
    # Kill any background processes
    if [ -n "${PERIODIC_PID:-}" ]; then
        kill "$PERIODIC_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT

# ============================================================================
# Entry Point
# ============================================================================

main "$@"

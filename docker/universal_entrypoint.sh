#!/bin/sh
set -e

# Universal Entrypoint: runs hooks and tools for any project type
# Assumes /tools is mounted from docker/tools (or copied to $PWD/tools)

WORKDIR="$(pwd)"
TOOLS_DIR="$WORKDIR/tools"
HOOKS_DIR="$WORKDIR/hooks"
PRE_HOOKS="$HOOKS_DIR/pre"
POST_HOOKS="$HOOKS_DIR/post"
PERIODIC_HOOKS="$HOOKS_DIR/periodic"

# Ensure runtime temporary directories exist for hooks/tools
JUDGE_TMP_DIR="/tmp/judgehost"
JUDGE_LOGS_DIR="$JUDGE_TMP_DIR/logs"
JUDGE_CACHE_DIR="$JUDGE_TMP_DIR/cache"
JUDGE_TEMP_DIR="$JUDGE_TMP_DIR/temp"
mkdir -p "$JUDGE_LOGS_DIR" "$JUDGE_CACHE_DIR" "$JUDGE_TEMP_DIR"
chmod 0755 "$JUDGE_TMP_DIR" || true

# Export JUDGE_LOGS_DIR for hooks/tools so they can write to the tmp logs location
export JUDGE_LOGS_DIR

# Create status directory for programmatic markers
STATUS_DIR="/tmp/judgehost-status"
mkdir -p "$STATUS_DIR"

get_status() {
    [ -f "$STATUS_DIR/$1" ] && cat "$STATUS_DIR/$1"
}

# Use script_runner.sh for hook execution
SCRIPT_RUNNER="$TOOLS_DIR/script_runner.sh"

# Ensure script_runner and any hooks are executable. This helps when files are copied into the image
# without executable bit (common with some CI or Windows hosts).
if [ -f "$SCRIPT_RUNNER" ] && [ ! -x "$SCRIPT_RUNNER" ]; then
	chmod +x "$SCRIPT_RUNNER" || true
fi
if [ -d "$HOOKS_DIR" ]; then
	find "$HOOKS_DIR" -type f -exec chmod a+x {} + 2>/dev/null || true
fi


# Run all executable scripts in tools directory (flat), excluding script_runner.sh
run_tools() {
	if [ -d "$TOOLS_DIR" ]; then
		for script in "$TOOLS_DIR"/*; do
			# Skip the script_runner.sh utility
			[ "$(basename "$script")" = "script_runner.sh" ] && continue
			[ -x "$script" ] && "$script"
		done
	fi
}

# Run pre-execution hooks
if [ -d "$PRE_HOOKS" ]; then
	"$SCRIPT_RUNNER" "$PRE_HOOKS"
fi

# Start periodic hooks in background, supporting custom timer
if [ -d "$PERIODIC_HOOKS" ]; then
	"$SCRIPT_RUNNER" "$PERIODIC_HOOKS" periodic
fi

# Run all tools in tools directory
run_tools

# Run main application (pass all args to this script)
if [ $# -gt 0 ]; then
	"$@"
	exit_code=$?
	
	# Run post-execution hooks
	if [ -d "$POST_HOOKS" ]; then
		"$SCRIPT_RUNNER" "$POST_HOOKS"
	fi

	# If requested, display the monitor log (useful for CI/test runs). Non-fatal if file missing.
	if [ "${SHOW_LOGS:-}" = "1" ] || [ "${SHOW_LOGS:-}" = "true" ]; then
		# Look for standard monitor log and fallback to tmp logs directory used in tests
		LOG_PATH="/var/log/judgehost/monitor.log"
		TMP_LOG_DIR="$JUDGE_LOGS_DIR"
		printed=0
		if [ -f "$LOG_PATH" ]; then
			echo
			echo "===== monitor log (tail 200) $LOG_PATH ====="
			tail -n 200 "$LOG_PATH" || true
			echo "===== end monitor log ====="
			printed=1
		fi

		# If tmp logs directory exists, show recent files
		if [ -d "$TMP_LOG_DIR" ]; then
			# show newest log files (up to 5), non-fatal
			for f in $(ls -1t "$TMP_LOG_DIR" 2>/dev/null | head -n 5); do
				fp="$TMP_LOG_DIR/$f"
				if [ -f "$fp" ]; then
					echo
					echo "===== tmp log: $fp (tail 200) ====="
					tail -n 200 "$fp" || true
					echo "===== end tmp log ====="
					printed=1
				fi
			done
		fi

		if [ "$printed" -eq 0 ]; then
			echo "(SHOW_LOGS enabled but no logs found in $LOG_PATH or $TMP_LOG_DIR)"
		fi
	fi

	exit $exit_code
else
	exit 1
fi

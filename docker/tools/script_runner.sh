#!/bin/sh
# script_runner.sh: Run a set of hook scripts with support for priority, dependencies, wait_before/after, and timer (for periodic)
# Usage: script_runner.sh <dir> [periodic]

set -e

HOOK_DIR="$1"
MODE="$2" # if 'periodic', handle timer

# Status tracking
STATUS_DIR="/tmp/judgehost-status"
mkdir -p "$STATUS_DIR"

parse_hook_metadata() {
	script="$1"
	key="$2"
	grep -E "^# *$key:" "$script" | head -n1 | sed -E "s/^# *$key: *//"
}

run_scripts() {
	# Create temporary files to store script lists
	scripts_list=$(mktemp)
	sorted_list=$(mktemp)
	
	# Find all executable scripts and sort by priority
	for script in "$HOOK_DIR"/*; do
		if [ -x "$script" ]; then
			priority=$(parse_hook_metadata "$script" "priority" 2>/dev/null || echo 100)
			echo "$priority:$script" >> "$scripts_list"
		fi
	done
	
	# Sort by priority
	sort -n "$scripts_list" | cut -d: -f2 > "$sorted_list"
	
	# Execute scripts in order
	while IFS= read -r script; do
		script_name=$(basename "$script")
		
		wait_before=$(parse_hook_metadata "$script" "wait_before")
		wait_after=$(parse_hook_metadata "$script" "wait_after")
		
		[ -n "$wait_before" ] && sleep "$wait_before"
		echo "[HOOK] Running: $script"
		"$script"
		[ -n "$wait_after" ] && sleep "$wait_after"
	done < "$sorted_list"
	
	# Clean up
	rm -f "$scripts_list" "$sorted_list"
}

run_periodic() {
	for script in "$HOOK_DIR"/*; do
		if [ -x "$script" ]; then
			script_name=$(basename "$script")
			timer=$(parse_hook_metadata "$script" "timer")
			[ -z "$timer" ] && timer=60
			(
				while true; do
					"$script"
					sleep "$timer"
				done
			) &
		fi
	done
}

if [ "$MODE" = "periodic" ]; then
	run_periodic
else
	run_scripts
fi

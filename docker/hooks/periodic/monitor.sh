#!/bin/sh
# priority: 5
# timer: 3

# Minimal periodic monitor using common built-in OS tools only.
# Collects: timestamp, uptime/load, cpu/mem top processes (ps), mem summary, disk usage, process count, basic network socket summary.
# Writes to /var/log/judgehost/monitor.log. Performs simple daily rotation (monitor.log.YYYYmmdd) and keeps last 7 days.

# Prefer runtime-provided logs dir (set by universal_entrypoint.sh) so tests/CI can read logs from tmp.
# Fallback order: $JUDGE_LOGS_DIR -> /tmp/judgehost/logs -> /var/log/judgehost
if [ -n "$JUDGE_LOGS_DIR" ]; then
	LOG_DIR="$JUDGE_LOGS_DIR"
elif [ -d "/tmp/judgehost/logs" ]; then
	LOG_DIR="/tmp/judgehost/logs"
else
	LOG_DIR="/var/log/judgehost"
fi

LOG_FILE="$LOG_DIR/monitor.log"
DATE_STAMP=$(date +%Y%m%d)
ROTATED="$LOG_FILE.$DATE_STAMP"

ensure_log_dir() {
	if [ ! -d "$LOG_DIR" ]; then
		mkdir -p "$LOG_DIR" || exit 1
		chmod 0755 "$LOG_DIR"
	fi
}

rotate_log_if_needed() {
	# If today's rotated file doesn't exist, rotate current log into it
	if [ ! -f "$ROTATED" ]; then
		if [ -f "$LOG_FILE" ]; then
			mv "$LOG_FILE" "$ROTATED" 2>/dev/null || cat "$LOG_FILE" >> "$ROTATED" 2>/dev/null
		else
			touch "$ROTATED"
		fi
		# remove logs older than 7 days
		find "$LOG_DIR" -name 'monitor.log.*' -type f -mtime +7 -exec rm -f {} \; 2>/dev/null || true
	fi
}

log() {
	printf "%s %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_FILE"
}

collect() {
	log "==== monitor start ===="

	# Uptime and load
	if command -v uptime >/dev/null 2>&1; then
		log "UPTIME: $(uptime | sed -e 's/  */, /g')"
	elif [ -r /proc/uptime ]; then
		log "UPTIME_RAW: $(cat /proc/uptime)"
	fi

	# Load via /proc
	if [ -r /proc/loadavg ]; then
		log "LOADAVG: $(awk '{print $1,$2,$3}' /proc/loadavg)"
	fi

	# Top CPU processes (ps)
		if command -v ps >/dev/null 2>&1; then
			# Prefer GNU ps with --sort; otherwise produce a sortable listing and sort via awk/sort
				log "TOP CPU PROCS (proxy by TIME):"
				if ps --help 2>&1 | grep -q -- '--sort'; then
					ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -n 6 | awk '{print "  "$0}' >> "$LOG_FILE"
				else
					# BusyBox: pcpu not available. Use cumulative TIME as a CPU proxy and sort lexicographically (best-effort).
					if ps -e -o pid,time,comm 2>/dev/null | awk 'NR>1{print $0}' >/dev/null 2>&1; then
						ps -e -o pid,time,comm | awk 'NR>1{print $0}' | sort -k2 -r | head -n 5 | awk '{print "  "$0}' >> "$LOG_FILE"
					else
						ps -e | head -n 6 | awk '{print "  "$0}' >> "$LOG_FILE"
					fi
				fi

				log "TOP MEM PROCS (rss):"
				if ps --help 2>&1 | grep -q -- '--sort'; then
					ps -eo pid,pmem,pcpu,comm --sort=-pmem | head -n 6 | awk '{print "  "$0}' >> "$LOG_FILE"
				else
					# BusyBox: pmem may not be available. Use RSS (resident set size) and sort numerically.
					if ps -e -o pid,rss,comm 2>/dev/null | awk 'NR>1{print $0}' >/dev/null 2>&1; then
						ps -e -o pid,rss,comm | awk 'NR>1{print $0}' | sort -k2 -nr | head -n 5 | awk '{print "  "$0}' >> "$LOG_FILE"
					else
						ps -e | head -n 6 | awk '{print "  "$0}' >> "$LOG_FILE"
					fi
				fi
		fi

	# Memory summary
	if [ -r /proc/meminfo ]; then
		awk '/MemTotal|MemFree|MemAvailable/ {print $0}' /proc/meminfo >> "$LOG_FILE"
		elif command -v free >/dev/null 2>&1; then
			# Avoid nested double quotes in command substitution
			MEM_OUT=$(free -h | tr '\n' ' | ')
			log "MEM: $MEM_OUT"
	fi

	# Disk usage
	if command -v df >/dev/null 2>&1; then
		log "DISK USAGE:"
		df -h / /var 2>/dev/null | awk 'NR==1{print $0} NR>1{print "  "$0}' >> "$LOG_FILE" || df -h / | awk 'NR==1{print $0} NR>1{print "  "$0}' >> "$LOG_FILE"
	fi

		# Process count
		if command -v ps >/dev/null 2>&1; then
			# ps --no-headers isn't portable in BusyBox; fallback to removing header
			if ps --help 2>&1 | grep -q -- '--no-headers'; then
				PROC_COUNT=$(ps -e --no-headers | wc -l | tr -d ' ')
			else
				PROC_COUNT=$(ps -e | awk 'NR>1{c++}END{print c+0}')
			fi
			log "PROCESS_COUNT: $PROC_COUNT"
		fi

	# Network socket summary using ss if present, otherwise netstat
		if command -v ss >/dev/null 2>&1; then
			log "SOCKET SUMMARY:"
			ss -s | awk '{print "  "$0}' >> "$LOG_FILE"
		elif command -v netstat >/dev/null 2>&1; then
			log "SOCKET SUMMARY:"
			# netstat -s may not be available on BusyBox; fall back to a simple socket snapshot
			if netstat -s 2>/dev/null | grep -q .; then
				netstat -s | awk '{print "  "$0}' >> "$LOG_FILE"
			else
				# Provide a basic listing/count by state for TCP sockets (best-effort)
				netstat -an 2>/dev/null | awk '/^tcp/ {counts[$6]++} END{for (s in counts) print "  " s " " counts[s]}' >> "$LOG_FILE" || netstat -an 2>/dev/null | head -n 20 | awk '{print "  "$0}' >> "$LOG_FILE"
			fi
		fi

	log "==== monitor end ===="
}

main() {
	ensure_log_dir
	rotate_log_if_needed
	collect
}

main "$@"


# Environment Variables Reference

This document lists all environment variables used to configure the judgehost system.

---

## Core Configuration

### `NODE_ENV`

- **Description**: Node environment
- **Default**: `development`
- **Values**: `development`, `production`, `test`

---

## Docker Configuration

### `DOCKER_HOST`

- **Description**: Docker daemon socket location
- **Default**: `unix:///var/run/docker.sock`
- **Example**: `tcp://docker-host:2375`

### `DOCKER_API_VERSION`

- **Description**: Docker API version to use
- **Default**: Auto-detected from Docker daemon
- **Example**: `1.41`

### `JUDGEHOST_CONTAINER_MAX_MEMORY_MB`

- **Description**: Maximum memory limit for a single container (MB)
- **Default**: `4096`

### `JUDGEHOST_CONTAINER_MAX_CPU_CORES`

- **Description**: Maximum CPU cores for a single container
- **Default**: `4.0`

### `JUDGEHOST_CONTAINER_MAX_DISK_MB`

- **Description**: Maximum disk space for a single container (MB)
- **Default**: `10240`

### `JUDGEHOST_DEFAULT_TIMEOUT_SECONDS`

- **Description**: Default timeout for evaluations (seconds)
- **Default**: `600`

### `NETWORK_BRIDGE_NAME`

- **Description**: Docker bridge network name for evaluation
- **Default**: `judgehost-eval-network`

### `NETWORK_SUBNET`

- **Description**: Subnet for evaluation network
- **Default**: `172.20.0.0/16`

### `CLEANUP_CONTAINERS_AFTER_EVAL`

- **Description**: Cleanup containers after evaluation
- **Default**: `true`
- **Values**: `true`, `false`

### `CLEANUP_IMAGES_OLDER_THAN_DAYS`

- **Description**: Clean up images older than specified days
- **Default**: `7`

### `CACHE_DOCKER_IMAGES`

- **Description**: Cache Docker images between evaluations
- **Default**: `true`
- **Values**: `true`, `false`

---

## Resource Limits

### `JUDGEHOST_MAX_WORKERS`

- **Description**: Maximum concurrent container evaluations
- **Default**: `3`
- **Min**: `1`

### `JUDGEHOST_MAX_MEMORY_MB`

- **Description**: Maximum total memory across all containers (MB)
- **Default**: `8192`

### `JUDGEHOST_MAX_CPU_CORES`

- **Description**: Maximum total CPU cores across all containers
- **Default**: `8.0`

---

## Queue Configuration

### `JUDGEHOST_MAX_QUEUE_SIZE`

- **Description**: Maximum number of submissions in queue
- **Default**: `100`
- **Min**: `1`

### `JUDGEHOST_QUEUE_PERSISTENCE`

- **Description**: Enable persistent queue (survives restarts)
- **Default**: `false`
- **Values**: `true`, `false`

### `JUDGEHOST_QUEUE_DB_PATH`

- **Description**: Path to queue database file (if persistence enabled)
- **Default**: `/var/lib/judgehost/queue.db`

### `JUDGEHOST_RATE_LIMIT_ENABLED`

- **Description**: Enable per-team rate limiting
- **Default**: `false`
- **Values**: `true`, `false`

### `JUDGEHOST_RATE_LIMIT_PER_TEAM`

- **Description**: Max submissions per team per time window
- **Default**: `10`

---

## File System Paths

### `JUDGEHOST_WORK_DIR`

- **Description**: Temporary working directory
- **Default**: `/tmp/judgehost`

### `JUDGEHOST_PROBLEMS_DIR`

- **Description**: Problem packages storage directory
- **Default**: `/var/lib/judgehost/problems`

### `JUDGEHOST_SUBMISSIONS_DIR`

- **Description**: Submissions storage directory
- **Default**: `/var/lib/judgehost/submissions`

### `JUDGEHOST_RESULTS_DIR`

- **Description**: Evaluation results storage directory
- **Default**: `/var/lib/judgehost/results`

### `JUDGEHOST_LOGS_DIR`

- **Description**: Logs directory
- **Default**: `/var/log/judgehost`

---

## API Server Configuration

### `API_PORT`

- **Description**: API server port
- **Default**: `3000`

### `API_HOST`

- **Description**: API server host to bind to
- **Default**: `0.0.0.0`

### `API_BASE_PATH`

- **Description**: Base path for API endpoints
- **Default**: `/api`

### `API_MAX_UPLOAD_SIZE_MB`

- **Description**: Maximum upload file size (MB)
- **Default**: `500`

### `API_CORS_ENABLED`

- **Description**: Enable CORS
- **Default**: `false`
- **Values**: `true`, `false`

### `API_CORS_ORIGIN`

- **Description**: CORS allowed origin
- **Default**: `*`

### `API_AUTH_ENABLED`

- **Description**: Enable API authentication
- **Default**: `true`
- **Values**: `true`, `false`

### `API_AUTH_TYPE`

- **Description**: Authentication type
- **Default**: `basic`
- **Values**: `basic`, `token`

### `API_AUTH_USERNAME`

- **Description**: Basic auth username
- **Required**: When `API_AUTH_TYPE=basic`

### `API_AUTH_PASSWORD`

- **Description**: Basic auth password
- **Required**: When `API_AUTH_TYPE=basic`

### `API_AUTH_TOKEN`

- **Description**: Token auth bearer token
- **Required**: When `API_AUTH_TYPE=token`

---

## Security

### `CONTAINER_SECURITY_PROFILE`

- **Description**: Container security profile
- **Default**: `restricted`

---

## Logging

### `LOG_LEVEL`

- **Description**: Logging level
- **Default**: `info`
- **Values**: `debug`, `info`, `warn`, `error`

### `LOG_FORMAT`

- **Description**: Log output format
- **Default**: `json`
- **Values**: `json`, `text`

### `LOG_CONSOLE_ENABLED`

- **Description**: Enable console logging
- **Default**: `true`
- **Values**: `true`, `false`

### `LOG_FILE_ENABLED`

- **Description**: Enable file logging
- **Default**: `true`
- **Values**: `true`, `false`

### `LOG_FILE_MAX_SIZE_MB`

- **Description**: Maximum log file size (MB)
- **Default**: `100`

### `LOG_FILE_MAX_FILES`

- **Description**: Maximum number of log files to keep
- **Default**: `10`

---

## Git Integration

### `GIT_DEFAULT_TIMEOUT_SECONDS`

- **Description**: Timeout for Git operations (seconds)
- **Default**: `300`

### `GIT_MAX_REPO_SIZE_MB`

- **Description**: Maximum repository size (MB)
- **Default**: `100`

### `GIT_SHALLOW_CLONE`

- **Description**: Use shallow clone for Git repositories
- **Default**: `true`
- **Values**: `true`, `false`

---

## Monitoring

### `METRICS_ENABLED`

- **Description**: Enable metrics endpoint
- **Default**: `true`
- **Values**: `true`, `false`

### `METRICS_PORT`

- **Description**: Metrics server port
- **Default**: `9090`

### `METRICS_PATH`

- **Description**: Metrics endpoint path
- **Default**: `/metrics`

### `HEALTHCHECK_ENABLED`

- **Description**: Enable health check endpoint
- **Default**: `true`
- **Values**: `true`, `false`

### `HEALTHCHECK_PORT`

- **Description**: Health check server port
- **Default**: `3001`

---

## Development/Debugging

### `DEBUG_MODE`

- **Description**: Enable debug mode (verbose logging)
- **Default**: `false`
- **Values**: `true`, `false`

### `MOCK_DOCKER`

- **Description**: Mock Docker for testing (no actual containers)
- **Default**: `false`
- **Values**: `true`, `false`

### `JUDGEHOST_RATE_LIMIT_PER_TEAM`

- **Description**: Maximum submissions per team per minute
- **Default**: `10`
- **Min**: `1`
- **Max**: `1000`
- **Required**: Only if `JUDGEHOST_RATE_LIMIT_ENABLED=true`

---

## File System Paths

### `JUDGEHOST_WORK_DIR`

- **Description**: Working directory for temporary files
- **Default**: `/tmp/judgehost`
- **Example**: `/var/tmp/judgehost`
- **Required**: No
- **Notes**: Must be writable

### `JUDGEHOST_PROBLEMS_DIR`

- **Description**: Directory to store problem packages and images
- **Default**: `/var/lib/judgehost/problems`
- **Example**: `/data/judgehost/problems`
- **Required**: No
- **Notes**: Must be writable, persists between restarts

### `JUDGEHOST_SUBMISSIONS_DIR`

- **Description**: Directory to store submission files
- **Default**: `/var/lib/judgehost/submissions`
- **Example**: `/data/judgehost/submissions`
- **Required**: No
- **Notes**: Can be cleared periodically

### `JUDGEHOST_RESULTS_DIR`

- **Description**: Directory to store evaluation results
- **Default**: `/var/lib/judgehost/results`
- **Example**: `/data/judgehost/results`
- **Required**: No
- **Notes**: Persistent storage for results

### `JUDGEHOST_LOGS_DIR`

- **Description**: Directory for log files
- **Default**: `/var/log/judgehost`
- **Example**: `/var/logs/judgehost`
- **Required**: No

---

## API Configuration

### `API_PORT`

- **Description**: Port for the judgehost API server
- **Default**: `3000`
- **Example**: `8080`
- **Required**: No

### `API_HOST`

- **Description**: Host address to bind the API server
- **Default**: `0.0.0.0`
- **Example**: `localhost`
- **Required**: No

### `API_CORS_ENABLED`

- **Description**: Enable CORS support
- **Default**: `false`
- **Values**: `true`, `false`
- **Required**: No

### `API_CORS_ORIGIN`

- **Description**: Allowed CORS origins (comma-separated)
- **Default**: `*`
- **Example**: `https://example.com,https://app.example.com`
- **Required**: Only if CORS enabled

### `API_AUTH_ENABLED`

- **Description**: Enable API authentication
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

### `API_AUTH_TYPE`

- **Description**: Authentication type
- **Default**: `basic`
- **Values**: `basic`, `token`, `none`
- **Required**: No

### `API_AUTH_USERNAME`

- **Description**: Username for basic authentication
- **Default**: None
- **Required**: If `API_AUTH_TYPE=basic`

### `API_AUTH_PASSWORD`

- **Description**: Password for basic authentication
- **Default**: None
- **Required**: If `API_AUTH_TYPE=basic`

### `API_AUTH_TOKEN`

- **Description**: Bearer token for token authentication
- **Default**: None
- **Required**: If `API_AUTH_TYPE=token`

---

## Security Configuration

### `CONTAINER_SECURITY_PROFILE`

- **Description**: Security profile for containers
- **Default**: `restricted`
- **Values**: `restricted`, `baseline`, `privileged`

---

## Logging Configuration

### `LOG_LEVEL`

- **Description**: Logging level
- **Default**: `info`
- **Values**: `error`, `warn`, `info`, `debug`, `trace`

### `LOG_FORMAT`

- **Description**: Log output format
- **Default**: `json`
- **Values**: `json`, `text`, `pretty`

### `LOG_CONSOLE_ENABLED`

- **Description**: Enable console logging
- **Default**: `true`
- **Values**: `true`, `false`

### `LOG_FILE_ENABLED`

- **Description**: Enable file logging
- **Default**: `false`
- **Values**: `true`, `false`

### `LOG_FILE_MAX_SIZE_MB`

- **Description**: Max log file size before rotation (MB)
- **Default**: `10`
- **Example**: `50`

### `LOG_FILE_MAX_FILES`

- **Description**: Number of rotated log files to keep
- **Default**: `3`
- **Example**: `10`

---

## Git Integration

### `GIT_DEFAULT_TIMEOUT_SECONDS`

- **Description**: Timeout for git operations (seconds)
- **Default**: `300`
- **Example**: `600`

### `GIT_MAX_REPO_SIZE_MB`

- **Description**: Maximum git repository size (MB)
- **Default**: `500`
- **Example**: `1024`

### `GIT_SHALLOW_CLONE`

- **Description**: Use shallow git clones
- **Default**: `true`
- **Values**: `true`, `false`

---

## Monitoring Configuration

### `METRICS_ENABLED`

- **Description**: Enable metrics collection
- **Default**: `true`
- **Values**: `true`, `false`

### `HEALTHCHECK_ENABLED`

- **Description**: Enable health check endpoint
- **Default**: `true`
- **Values**: `true`, `false`

---

## Development Configuration

### `DEBUG_MODE`

- **Description**: Enable debug mode
- **Default**: `false`
- **Values**: `true`, `false`

### `MOCK_DOCKER`

- **Description**: Use mock Docker client (for testing)
- **Default**: `false`
- **Values**: `true`, `false`

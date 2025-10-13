# Environment Variables Reference

This document lists all environment variables used to configure the judgehost system.

---

## Docker Configuration

### `DOCKER_HOST`

- **Description**: Docker daemon socket location
- **Default**: `unix:///var/run/docker.sock`
- **Example**: `tcp://docker-host:2375` (for remote Docker daemon)
- **Required**: No

### `DOCKER_API_VERSION`

- **Description**: Docker API version to use
- **Default**: Auto-detected from Docker daemon
- **Example**: `1.41`
- **Required**: No

---

## Resource Limits

### `JUDGEHOST_MAX_WORKERS`

- **Description**: Maximum number of concurrent container evaluations
- **Default**: `3`
- **Min**: `1`
- **Max**: Limited by system resources
- **Required**: No

### `JUDGEHOST_MAX_MEMORY_MB`

- **Description**: Maximum total memory allocation across all containers (in MB)
- **Default**: `8192` (8GB)
- **Example**: `16384` (16GB)
- **Required**: No

### `JUDGEHOST_MAX_CPU_CORES`

- **Description**: Maximum total CPU cores allocation across all containers
- **Default**: `8.0`
- **Example**: `16.0`
- **Required**: No

### `JUDGEHOST_CONTAINER_MAX_MEMORY_MB`

- **Description**: Maximum memory limit for a single container (in MB)
- **Default**: `4096` (4GB)
- **Example**: `8192` (8GB)
- **Required**: No

### `JUDGEHOST_CONTAINER_MAX_CPU_CORES`

- **Description**: Maximum CPU cores for a single container
- **Default**: `4.0`
- **Example**: `8.0`
- **Required**: No

### `JUDGEHOST_CONTAINER_MAX_DISK_MB`

- **Description**: Maximum disk space for a single container (in MB)
- **Default**: `10240` (10GB)
- **Example**: `20480` (20GB)
- **Required**: No

---

## Queue Configuration

### `JUDGEHOST_MAX_QUEUE_SIZE`

- **Description**: Maximum number of submissions in queue
- **Default**: `100`
- **Min**: `1`
- **Max**: `10000`
- **Required**: No

### `JUDGEHOST_QUEUE_PERSISTENCE`

- **Description**: Enable persistent queue (survives restarts)
- **Default**: `false`
- **Values**: `true`, `false`
- **Required**: No

### `JUDGEHOST_QUEUE_DB_PATH`

- **Description**: Path to queue database file (if persistence enabled)
- **Default**: `/var/lib/judgehost/queue.db`
- **Required**: Only if `JUDGEHOST_QUEUE_PERSISTENCE=true`

### `JUDGEHOST_RATE_LIMIT_ENABLED`

- **Description**: Enable per-team rate limiting
- **Default**: `false`
- **Values**: `true`, `false`
- **Required**: No

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
- **Default**: `0.0.0.0` (all interfaces)
- **Example**: `127.0.0.1` (localhost only)
- **Required**: No

### `API_BASE_PATH`

- **Description**: Base path for API endpoints
- **Default**: `/api`
- **Example**: `/judgehost/api`
- **Required**: No

### `API_CORS_ENABLED`

- **Description**: Enable CORS for API
- **Default**: `false`
- **Values**: `true`, `false`
- **Required**: No

### `API_CORS_ORIGIN`

- **Description**: Allowed CORS origins (comma-separated)
- **Default**: `*`
- **Example**: `https://example.com,https://app.example.com`
- **Required**: Only if `API_CORS_ENABLED=true`

### `API_MAX_UPLOAD_SIZE_MB`

- **Description**: Maximum file upload size (in MB)
- **Default**: `500`
- **Example**: `1024`
- **Required**: No

---

## Authentication & Security

### `API_AUTH_ENABLED`

- **Description**: Enable API authentication
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No
- **Warning**: Only disable for testing/development

### `API_AUTH_TYPE`

- **Description**: Authentication method
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

### `CONTAINER_SECURITY_PROFILE`

- **Description**: Security profile for containers
- **Default**: `restricted`
- **Values**: `restricted`, `baseline`, `privileged`
- **Required**: No
- **Notes**: `restricted` is recommended for production

---

## Logging

### `LOG_LEVEL`

- **Description**: Logging level
- **Default**: `info`
- **Values**: `error`, `warn`, `info`, `debug`, `trace`
- **Required**: No

### `LOG_FORMAT`

- **Description**: Log output format
- **Default**: `json`
- **Values**: `json`, `text`, `pretty`
- **Required**: No

### `LOG_CONSOLE_ENABLED`

- **Description**: Enable console logging
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

### `LOG_FILE_ENABLED`

- **Description**: Enable file logging
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

### `LOG_FILE_MAX_SIZE_MB`

- **Description**: Maximum log file size before rotation (in MB)
- **Default**: `100`
- **Example**: `50`
- **Required**: No

### `LOG_FILE_MAX_FILES`

- **Description**: Maximum number of rotated log files to keep
- **Default**: `10`
- **Example**: `5`
- **Required**: No

---

## DOMserver Integration

### `DOMSERVER_API_URL`

- **Description**: URL of the DOMserver API
- **Default**: None
- **Example**: `https://domserver.example.com/api`
- **Required**: For DOMserver integration

### `DOMSERVER_API_USERNAME`

- **Description**: Username for DOMserver API
- **Default**: None
- **Required**: For DOMserver integration

### `DOMSERVER_API_PASSWORD`

- **Description**: Password for DOMserver API
- **Default**: None
- **Required**: For DOMserver integration

### `DOMSERVER_JUDGEHOST_NAME`

- **Description**: Name to register this judgehost with
- **Default**: Hostname of the machine
- **Example**: `judge-01`
- **Required**: No

### `DOMSERVER_POLL_INTERVAL_SECONDS`

- **Description**: How often to poll DOMserver for work (in seconds)
- **Default**: `5`
- **Min**: `1`
- **Max**: `60`
- **Required**: No

---

## Networking

### `NETWORK_BRIDGE_NAME`

- **Description**: Name of Docker bridge network for evaluations
- **Default**: `judgehost-eval-network`
- **Example**: `eval-net`
- **Required**: No

### `NETWORK_SUBNET`

- **Description**: Subnet for evaluation network
- **Default**: `172.20.0.0/16`
- **Example**: `172.30.0.0/16`
- **Required**: No

### `PROXY_HTTP`

- **Description**: HTTP proxy for container internet access
- **Default**: None
- **Example**: `http://proxy.example.com:8080`
- **Required**: No

### `PROXY_HTTPS`

- **Description**: HTTPS proxy for container internet access
- **Default**: None
- **Example**: `http://proxy.example.com:8080`
- **Required**: No

### `NO_PROXY`

- **Description**: Comma-separated list of hosts to bypass proxy
- **Default**: None
- **Example**: `localhost,127.0.0.1,.local`
- **Required**: No

---

## Git Integration

### `GIT_DEFAULT_TIMEOUT_SECONDS`

- **Description**: Timeout for Git clone operations (in seconds)
- **Default**: `300`
- **Example**: `600`
- **Required**: No

### `GIT_MAX_REPO_SIZE_MB`

- **Description**: Maximum Git repository size (in MB)
- **Default**: `100`
- **Example**: `500`
- **Required**: No

### `GIT_SHALLOW_CLONE`

- **Description**: Use shallow clone (--depth=1) for submissions
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

---

## Performance & Optimization

### `CACHE_DOCKER_IMAGES`

- **Description**: Cache Docker images between evaluations
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

### `CLEANUP_CONTAINERS_AFTER_EVAL`

- **Description**: Remove containers after evaluation completes
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No
- **Notes**: Set to `false` for debugging

### `CLEANUP_IMAGES_OLDER_THAN_DAYS`

- **Description**: Remove evaluation images older than N days
- **Default**: `7`
- **Example**: `1` (more aggressive), `30` (keep longer)
- **Required**: No

### `PRUNE_UNUSED_IMAGES_INTERVAL_HOURS`

- **Description**: How often to prune unused Docker images (in hours)
- **Default**: `24`
- **Example**: `6`
- **Required**: No

---

## Monitoring & Metrics

### `METRICS_ENABLED`

- **Description**: Enable metrics collection
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

### `METRICS_PORT`

- **Description**: Port for Prometheus metrics endpoint
- **Default**: `9090`
- **Example**: `9100`
- **Required**: No

### `METRICS_PATH`

- **Description**: Path for metrics endpoint
- **Default**: `/metrics`
- **Example**: `/prometheus`
- **Required**: No

### `HEALTHCHECK_ENABLED`

- **Description**: Enable health check endpoint
- **Default**: `true`
- **Values**: `true`, `false`
- **Required**: No

### `HEALTHCHECK_PORT`

- **Description**: Port for health check endpoint
- **Default**: `3001`
- **Example**: `8080`
- **Required**: No

---

## Development & Debugging

### `NODE_ENV`

- **Description**: Node.js environment
- **Default**: `production`
- **Values**: `development`, `production`, `test`
- **Required**: No

### `DEBUG_MODE`

- **Description**: Enable debug mode (verbose logging, keep containers)
- **Default**: `false`
- **Values**: `true`, `false`
- **Required**: No

### `MOCK_DOCKER`

- **Description**: Use mock Docker client (for testing without Docker)
- **Default**: `false`
- **Values**: `true`, `false`
- **Required**: No

---

## Example Configuration Files

### Development (.env.development)

```bash
# Development configuration
NODE_ENV=development
DEBUG_MODE=true

# API
API_PORT=3000
API_HOST=localhost
API_CORS_ENABLED=true
API_AUTH_ENABLED=false

# Resources (lower limits for dev)
JUDGEHOST_MAX_WORKERS=2
JUDGEHOST_MAX_MEMORY_MB=4096
JUDGEHOST_MAX_CPU_CORES=4.0

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_CONSOLE_ENABLED=true

# Paths
JUDGEHOST_WORK_DIR=./tmp/judgehost
JUDGEHOST_PROBLEMS_DIR=./data/problems
JUDGEHOST_SUBMISSIONS_DIR=./data/submissions

# Docker
CLEANUP_CONTAINERS_AFTER_EVAL=false
```

### Production (.env.production)

```bash
# Production configuration
NODE_ENV=production
DEBUG_MODE=false

# API
API_PORT=3000
API_HOST=0.0.0.0
API_CORS_ENABLED=true
API_CORS_ORIGIN=https://example.com
API_AUTH_ENABLED=true
API_AUTH_TYPE=token
API_AUTH_TOKEN=your-secret-token-here

# Resources
JUDGEHOST_MAX_WORKERS=5
JUDGEHOST_MAX_MEMORY_MB=16384
JUDGEHOST_MAX_CPU_CORES=16.0
JUDGEHOST_CONTAINER_MAX_MEMORY_MB=8192
JUDGEHOST_CONTAINER_MAX_CPU_CORES=8.0

# Queue
JUDGEHOST_MAX_QUEUE_SIZE=500
JUDGEHOST_QUEUE_PERSISTENCE=true
JUDGEHOST_QUEUE_DB_PATH=/var/lib/judgehost/queue.db
JUDGEHOST_RATE_LIMIT_ENABLED=true
JUDGEHOST_RATE_LIMIT_PER_TEAM=20

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=true
LOG_FILE_MAX_SIZE_MB=100
LOG_FILE_MAX_FILES=10

# Paths
JUDGEHOST_WORK_DIR=/var/lib/judgehost/work
JUDGEHOST_PROBLEMS_DIR=/var/lib/judgehost/problems
JUDGEHOST_SUBMISSIONS_DIR=/var/lib/judgehost/submissions
JUDGEHOST_RESULTS_DIR=/var/lib/judgehost/results
JUDGEHOST_LOGS_DIR=/var/log/judgehost

# Security
CONTAINER_SECURITY_PROFILE=restricted

# Docker
DOCKER_HOST=unix:///var/run/docker.sock
CLEANUP_CONTAINERS_AFTER_EVAL=true
CLEANUP_IMAGES_OLDER_THAN_DAYS=7
CACHE_DOCKER_IMAGES=true

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
HEALTHCHECK_ENABLED=true
HEALTHCHECK_PORT=3001

# DOMserver (if integrated)
# DOMSERVER_API_URL=https://domserver.example.com/api
# DOMSERVER_API_USERNAME=judgehost
# DOMSERVER_API_PASSWORD=secret
# DOMSERVER_JUDGEHOST_NAME=judge-01
```

### Docker Compose (.env)

```bash
# For docker-compose.yml
COMPOSE_PROJECT_NAME=judgehost

# Image
JUDGEHOST_IMAGE=judgehost:latest

# Volumes
JUDGEHOST_DATA_PATH=./data
JUDGEHOST_LOGS_PATH=./logs

# Network
JUDGEHOST_NETWORK=judgehost-network
```

---

## Validation

To validate your environment configuration:

```bash
npm run validate-config
```

Or manually check with:

```bash
node -e "require('dotenv').config(); console.log(process.env)"
```

---

## See Also

- [DOCUMENTATION.md](../DOCUMENTATION.md) - Main documentation
- [API Documentation](../docs/) - API endpoint documentation
- [Container Architecture](./[SPEC]%20CONTAINER_ARCHITECTURE.md) - Container configuration

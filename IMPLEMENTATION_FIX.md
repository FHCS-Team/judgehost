# Container Execution Implementation Fix

**Date:** October 15, 2025

## Problem Statement

Based on the documentation, containers created by judgehost don't actually do their work autonomously. Instead, they execute commands passed from the build function via `docker exec`. However, the implementation had several issues preventing this architecture from working correctly:

### Issues Found

1. **Containers exiting immediately**: Submission containers with CMD `["bash"]` would exit immediately, making it impossible to execute hooks via `docker exec`
2. **Incorrect hook paths**: Hooks were being searched at `/workspace/{containerId}/hooks` instead of `/hooks`
3. **Read-only workspace**: Workspace was mounted as read-only, preventing hooks from creating temporary files
4. **Missing hook mounts**: Container-specific hooks weren't being mounted into containers
5. **No service startup delay**: Database containers weren't given time to initialize before hooks tried to connect
6. **Data access issues**: Container-specific data files weren't accessible to hooks

## Solution Implemented

### 1. Smart CMD Override Strategy

**File:** `src/core/docker/group.js`

Implemented intelligent CMD override based on container type:

```javascript
// Service containers (databases, etc.) - use default CMD/ENTRYPOINT
if (!acceptsSubmission) {
  cmdOverride = undefined; // Let container run its service (postgres, redis, etc.)
  logger.info(
    `Container ${containerId} will use default CMD/ENTRYPOINT (service mode)`
  );
}
// Submission/testing containers - idle and wait for orchestrator
else {
  cmdOverride = ["sh", "-c", "tail -f /dev/null"];
  logger.info(`Container ${containerId} will idle and wait for hook execution`);
}
```

**Why this works:**

- Database containers run their services (postgres, mysql, etc.) and stay alive
- Submission containers idle indefinitely, waiting for judgehost to execute hooks
- All containers remain running so `docker exec` commands can be executed

### 2. Proper Hook Mounting

**File:** `src/core/docker/group.js`

Added mounting of container-specific hooks directory:

```javascript
// Mount hooks directory from problem package
const containerHooksPath = path.join(problemPath, containerId, "hooks");
try {
  await fs.access(containerHooksPath);
  binds.push(`${containerHooksPath}:/hooks:ro`);
  logger.info(`Mounted hooks for container ${containerId}`);
} catch (error) {
  logger.warn(`No hooks directory found for container ${containerId}`);
}
```

### 3. Fixed Hook Path

**File:** `src/core/docker/group.js`

Corrected the hook search path:

```javascript
// OLD: const hooksDir = `/workspace/${containerId}/hooks`;
const hooksDir = "/hooks"; // Hooks are mounted at /hooks
```

### 4. Writable Workspace with Data

**File:** `src/core/docker/group.js`

Created container-specific writable workspace with data files:

```javascript
// Create a writable workspace directory for each container
const containerWorkspacePath = path.join(resultsPath, "workspace", containerId);
await fs.mkdir(containerWorkspacePath, { recursive: true });

// Copy container-specific data to workspace if it exists
const containerDataPath = path.join(problemPath, containerId, "data");
try {
  await fs.access(containerDataPath);
  const dataFiles = await fs.readdir(containerDataPath);
  for (const file of dataFiles) {
    const srcPath = path.join(containerDataPath, file);
    const destPath = path.join(containerWorkspacePath, file);
    const stats = await fs.stat(srcPath);
    if (stats.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
} catch (error) {
  logger.debug(`No data files to copy for container ${containerId}`);
}

binds.push(`${containerWorkspacePath}:/workspace:rw`);
```

**Benefits:**

- Each container gets its own isolated writable workspace
- Problem data files are pre-copied for easy access
- Hooks can create temporary files and scripts
- Multiple containers don't interfere with each other

### 5. Service Startup Delay

**File:** `src/core/docker/group.js`

Added initialization delay for service containers:

```javascript
if (!info.State.Running) {
  await container.start();
  logger.info(`Container ${containerId} started for stage ${stageNum}`);

  // If this is a service container (database, etc.), give it time to initialize
  if (!acceptsSubmission) {
    logger.info(
      `Waiting 5 seconds for service container ${containerId} to initialize...`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
```

**Why 5 seconds:**

- PostgreSQL, MySQL, and Redis typically start within 2-3 seconds
- 5 seconds provides adequate buffer for slower systems
- Prevents "connection refused" errors when hooks try to connect

### 6. Data Directory Mounting

**File:** `src/core/docker/group.js`

Added separate read-only mount for data directory:

```javascript
// Mount container-specific data directory as read-only at /data
const containerDataPath = path.join(problemPath, containerId, "data");
try {
  await fs.access(containerDataPath);
  binds.push(`${containerDataPath}:/data:ro`);
  logger.info(`Mounted data directory for container ${containerId}`);
} catch (error) {
  logger.debug(`No data directory found for container ${containerId}`);
}
```

## Architecture Flow

### Before Fix

```
┌─────────────────────────────────────────┐
│ Judgehost                               │
├─────────────────────────────────────────┤
│ 1. Create containers                    │
│ 2. Start containers                     │
│    - Submission: bash → exits ✗         │
│    - Database: postgres → runs ✓        │
│ 3. Try to exec hooks → FAIL ✗          │
│    (submission container already exited)│
└─────────────────────────────────────────┘
```

### After Fix

```
┌─────────────────────────────────────────┐
│ Judgehost Orchestrator                  │
├─────────────────────────────────────────┤
│ 1. Create containers with hooks mounted │
│ 2. Start containers                     │
│    - Database: postgres → runs ✓        │
│    - Submission: idle → stays alive ✓   │
│ 3. Wait for service initialization      │
│ 4. Execute pre-hooks via docker exec ✓  │
│ 5. Execute post-hooks via docker exec ✓ │
│ 6. Collect results from /out            │
│ 7. Stop and cleanup containers          │
└─────────────────────────────────────────┘
```

## Container Mount Structure

### After Fix

```
Container Filesystem:
/
├── hooks/                   # Container-specific hooks (from problem package)
│   ├── pre_01_setup.sh
│   ├── pre_02_migration.sh
│   ├── post_01_test.sh
│   └── post_02_evaluate.sh
├── data/                    # Container-specific data (read-only)
│   ├── baseline_Q1.sql
│   ├── baseline_Q2.sql
│   └── generate_sample_data.py
├── workspace/               # Writable workspace (isolated per container)
│   ├── [copied data files]
│   └── [temporary files created by hooks]
├── submission/              # Submission code (if acceptsSubmission: true)
│   ├── migration.sql
│   └── Q1.sql
├── out/                     # Output directory (writable, shared with host)
│   ├── rubric_*.json
│   └── logs/
└── shared/                  # Shared between containers (writable)
    └── [inter-container data]
```

## Testing

### Manual Test

To test the implementation:

1. Start the judgehost server:

   ```bash
   npm run dev
   ```

2. Register a problem (e.g., sql-optimization):

   ```bash
   curl -X POST http://localhost:3000/api/problems \
     -F "problem_id=sql-optimization" \
     -F "package_type=file" \
     -F "problem_package=@data/problems/sql-optimization.tar.gz"
   ```

3. Submit a solution:

   ```bash
   curl -X POST http://localhost:3000/api/submissions \
     -F "problem_id=sql-optimization" \
     -F "package_type=file" \
     -F "submission_package=@mock/packages/db-optimization-submission-sample.tar.gz"
   ```

4. Check results:
   ```bash
   curl http://localhost:3000/api/results/{submission_id}
   ```

### Expected Behavior

- Database container starts postgres and stays running ✓
- Submission container idles and waits for commands ✓
- Pre-hooks execute successfully via `docker exec` ✓
- Database hooks can connect to localhost postgres ✓
- Post-hooks execute successfully ✓
- Rubric results are written to `/out` ✓
- Containers are properly cleaned up ✓

## Key Takeaways

1. **Containers are environments, not workers**: They provide the runtime context but don't execute logic autonomously
2. **Orchestrator controls execution**: The judgehost determines what runs, when, and how
3. **Hooks are external commands**: Executed by judgehost via `docker exec`, not by containers themselves
4. **Service vs submission distinction**: Service containers run services, submission containers idle
5. **Proper mounting is critical**: Hooks, data, and workspace must all be accessible at the right paths

## Related Documentation

- `/docs/data-models/containers/CONFIGURATION_GUIDE.md` - Container execution model
- `/docs/data-models/containers/resources.md` - Hook vs tool execution
- `/docs/README.md` - Key concepts and architecture

## Future Improvements

1. **Health checks**: Instead of fixed 5-second delay, implement proper health checks for services
2. **Configurable delays**: Allow problems to specify initialization delay per container
3. **Hook timeouts**: Add configurable timeouts per hook
4. **Better error handling**: Capture and report hook execution failures more clearly
5. **Resource limits**: Apply CPU/memory limits from stage configurations

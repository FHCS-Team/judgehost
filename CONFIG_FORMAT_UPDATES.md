# Configuration Format Updates - October 14, 2025

## Overview

This document summarizes the configuration format changes made to address ambiguities and inconsistencies in problem package configurations.

---

## Issues Resolved

### 1. ✅ Resource Limits Must Be Per-Container

**Issue:** Resource limits were incorrectly specified at the problem level, causing ambiguity about which container gets what resources.

**Old Format (Incorrect):**

```json
{
  "problem_id": "rest-api-users",
  "containers": [...],
  "resource_limits": {
    "cpu": "2.0",
    "memory": "1G",
    "timeout": 300
  }
}
```

**New Format (Correct):**

Resource limits are now specified in each container's stage configuration files.

**Example: submission/stage2.config.json**

```json
{
  "container_id": "submission",
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  }
}
```

**Example: database/stage2.config.json**

```json
{
  "container_id": "database",
  "resource_limits": {
    "cpu": "0.5",
    "memory": "256M",
    "timeout": 300
  }
}
```

**Rationale:**

- Each container can have different resource requirements
- Enables fine-grained resource control
- Total resources = sum of all container limits
- Problem-level limits removed from both `config.json` and deprecated `memory_limit` field

---

### 2. ✅ Removed Duplicate Memory Limit Field

**Issue:** `memory_limit` was duplicated in problem config.json

**Old Format:**

```json
{
  "problem_id": "two-sum",
  "time_limit": 60,
  "memory_limit": "512M",
  "resource_limits": {
    "memory": "512M"
  }
}
```

**New Format:**

```json
{
  "problem_id": "two-sum",
  "time_limit": 60
}
```

**Changes:**

- Removed `memory_limit` field from problem config
- Removed `resource_limits` object from problem config
- Memory limits now only in container stage configs

---

### 3. ✅ Clarified Stage Configuration Fallback Logic

**Issue:** Ambiguous behavior when stage2.config.json is missing.

**New Behavior (Documented):**

**Stage Configuration Fallback:**

```
Stage 2 (Evaluation):
├─ Try: stage2.config.json
│  └─ If not found ↓
├─ Fallback: stage1.config.json
│  └─ If not found ↓
└─ Fallback: Default values
```

**Default Values:**

```json
{
  "network": {
    "enabled": false,
    "internal_only": false,
    "allowed_containers": []
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  }
}
```

**Documentation:** See `docs/data-models/containers/CONFIGURATION_GUIDE.md` section "Stage Configuration Fallback Behavior"

**Benefits:**

- Simple single-stage containers only need one config file
- Multi-stage containers can have different configs per stage
- Missing configs don't cause failures
- Behavior is now explicitly documented

---

### 4. ✅ Explicit Docker Internal Network Names

**Issue:** Network names were implicit, causing potential conflicts and unclear naming.

**Old Format:**

```json
{
  "network": {
    "enabled": false,
    "internal_only": true
  }
}
```

**New Format:**

```json
{
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["database"]
  }
}
```

**Network Name Template:**

```
eval-network-{{submission_id}}
```

**Example:**

```
eval-network-sub_abc123xyz
```

**Rationale:**

- Prevents network conflicts between concurrent evaluations
- Enables proper cleanup after evaluation
- Allows monitoring and debugging
- Enforces network isolation
- Makes network topology explicit

**Updated Files:**

- `rest-api-users/database/stage1.config.json`
- `rest-api-users/database/stage2.config.json`
- `rest-api-users/submission/stage2.config.json`
- `rest-api-users/api-tester/stage2.config.json`

---

### 5. ✅ Renamed Container Dependency Fields

**Issue:** Inconsistent naming between documentation and configuration files.

#### 5a. `dependencies` → `depends_on`

**Old Format:**

```json
{
  "container_id": "submission",
  "dependencies": [
    {
      "container_id": "database",
      "condition": "healthy"
    }
  ]
}
```

**New Format:**

```json
{
  "container_id": "submission",
  "depends_on": [
    {
      "container_id": "database",
      "condition": "healthy",
      "timeout": 30,
      "retry": 5,
      "retry_interval": 2
    }
  ]
}
```

**Changes:**

- Renamed `dependencies` → `depends_on`
- Added `retry_interval` field for explicit retry timing
- All dependency objects now use consistent naming

#### 5b. `terminates` → `terminate_on_finish`

**Old Format:**

```json
{
  "container_id": "api-tester",
  "terminates": ["submission"]
}
```

**New Format:**

```json
{
  "container_id": "api-tester",
  "terminate_on_finish": ["submission", "database"]
}
```

**Changes:**

- Renamed `terminates` → `terminate_on_finish`
- More descriptive field name
- Clearer intent: "when I finish, terminate these containers"

**Rationale:**

- Consistent naming across documentation
- Aligns with Docker Compose `depends_on` convention
- More descriptive and intuitive
- Clearer semantic meaning

---

## Updated Package Configurations

### rest-api-users Package

**config.json Changes:**

```diff
- "memory_limit": "1G",
- "dependencies": []
+ "depends_on": []

- "dependencies": [
+ "depends_on": [
    {
      "container_id": "database",
      "condition": "healthy",
      "timeout": 30,
-     "retry": 5
+     "retry": 5,
+     "retry_interval": 2
    }
  ]

- "terminates": ["submission"]
+ "terminate_on_finish": ["submission", "database"]

- "resource_limits": {
-   "cpu": "2.0",
-   "memory": "1G",
-   "timeout": 300
- }
```

**database/stage1.config.json Changes:**

```diff
  "network": {
-   "enabled": false
+   "enabled": false,
+   "internal_only": true,
+   "network_name": "eval-network-{{submission_id}}",
+   "allowed_containers": []
  }
```

**database/stage2.config.json Changes:**

```diff
  "network": {
    "enabled": false,
-   "internal_only": true
+   "internal_only": true,
+   "network_name": "eval-network-{{submission_id}}",
+   "allowed_containers": []
  },
+ "environment": {
+   "POSTGRES_USER": "testuser",
+   "POSTGRES_PASSWORD": "testpass",
+   "POSTGRES_DB": "usersdb"
+ },
  "health_check": {
-   "command": "pg_isready -U testuser -d usersdb || exit 1",
+   "command": "pg_isready -U testuser || exit 1",
    "interval": 5,
    "timeout": 3,
-   "retries": 5
+   "retries": 5,
+   "start_period": 10
  }
```

**submission/stage2.config.json Changes:**

```diff
  "network": {
    "enabled": false,
    "internal_only": true,
+   "network_name": "eval-network-{{submission_id}}",
-   "allowed_containers": ["database", "api-tester"]
+   "allowed_containers": ["database"]
  }
```

**api-tester/stage2.config.json Changes:**

```diff
  "network": {
    "enabled": false,
    "internal_only": true,
+   "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["submission"]
  }
```

### two-sum Package

**config.json Changes:**

```diff
- "memory_limit": "512M",
- "dependencies": []
+ "depends_on": []

- "resource_limits": {
-   "cpu": "1.0",
-   "memory": "512M",
-   "timeout": 60
- }
```

---

## Migration Impact

### Breaking Changes

1. **Field Renames:**
   - `dependencies` → `depends_on`
   - `terminates` → `terminate_on_finish`
2. **Removed Fields:**

   - `memory_limit` (from problem config)
   - `resource_limits` (from problem config)

3. **Required Fields:**
   - `network_name` when using `internal_only: true`

### Non-Breaking Changes

1. **New Optional Fields:**

   - `retry_interval` in dependency configuration
   - `environment` in database stage2 config
   - `start_period` in health checks

2. **Enhanced Fields:**
   - `allowed_containers` now more explicit
   - `terminate_on_finish` can list multiple containers

---

## Documentation Updates

### New Documentation

**Created:** `docs/data-models/containers/CONFIGURATION_GUIDE.md`

**Contents:**

- Problem-level configuration reference
- Container-level configuration reference
- Stage configuration and fallback logic
- Resource limits per-container specification
- Network configuration with explicit naming
- Container dependencies (depends_on, terminate_on_finish)
- Health check configuration
- Complete multi-container examples
- Migration guide
- Best practices
- Troubleshooting guide

**Sections:**

1. Problem-Level Configuration
2. Container-Level Configuration
3. Stage Configuration (with fallback behavior)
4. Resource Limits (per-container)
5. Network Configuration (with explicit network_name)
6. Container Dependencies (renamed fields)
7. Health Checks
8. Complete Examples
9. Migration Guide
10. Best Practices
11. Troubleshooting

---

## Validation

### Package Integrity

All packages have been recreated with updated configurations:

```
✅ two-sum.tar.gz (5.1 KB) - Updated Oct 14 16:49
✅ rest-api-users.tar.gz (8.3 KB) - Updated Oct 14 16:49
✅ Submission packages unchanged (compatible)
```

### Configuration Validation Checklist

- [x] Removed problem-level resource_limits
- [x] Removed duplicate memory_limit field
- [x] Renamed dependencies → depends_on
- [x] Renamed terminates → terminate_on_finish
- [x] Added retry_interval to dependencies
- [x] Added explicit network_name to all internal networks
- [x] Added environment variables to database config
- [x] Added start_period to health checks
- [x] Updated terminate_on_finish to include database
- [x] Verified all stage configs have resource_limits
- [x] Documented stage fallback behavior
- [x] Created comprehensive configuration guide

---

## Testing Required

Before deploying these changes to production:

### 1. Package Validation

- [ ] Extract both updated packages
- [ ] Verify JSON syntax is valid
- [ ] Check all referenced files exist
- [ ] Validate Dockerfiles build successfully

### 2. Configuration Parsing

- [ ] Update parser to handle `depends_on` (not `dependencies`)
- [ ] Update parser to handle `terminate_on_finish` (not `terminates`)
- [ ] Implement network_name template substitution ({{submission_id}})
- [ ] Implement stage fallback logic (stage2 → stage1 → defaults)
- [ ] Read resource_limits from container stage configs

### 3. Container Orchestration

- [ ] Test explicit network creation with submission ID
- [ ] Test dependency resolution with depends_on
- [ ] Test container termination with terminate_on_finish
- [ ] Test health checks with start_period
- [ ] Test resource limits per container

### 4. Multi-Container Execution

- [ ] Test database → submission → tester flow
- [ ] Verify network isolation (eval-network-{id})
- [ ] Verify allowed_containers restrictions
- [ ] Verify terminate_on_finish stops all listed containers
- [ ] Verify resource limits enforced per container

### 5. Stage Fallback

- [ ] Test with only stage1.config.json (should work in stage2)
- [ ] Test with both stage1 and stage2 configs
- [ ] Test with missing configs (should use defaults)
- [ ] Verify correct config selected per stage

---

## Implementation Checklist

### Code Updates Required

#### 1. Configuration Parser (src/models/Problem.js or similar)

```javascript
// Update field names
-problem.containers[i].dependencies +
  problem.containers[i].depends_on -
  container.terminates +
  container.terminate_on_finish -
  // Remove problem-level resource limits
  problem.resource_limits -
  problem.memory_limit;

// Add network name template substitution
network_name = network_name.replace("{{submission_id}}", submissionId);
```

#### 2. Container Orchestration (src/core/docker.js, processor.js)

```javascript
// Implement stage fallback
function getStageConfig(container, stage) {
  const stageConfig = tryLoad(`${container}/stage${stage}.config.json`);
  if (stageConfig) return stageConfig;

  if (stage === 2) {
    const stage1Config = tryLoad(`${container}/stage1.config.json`);
    if (stage1Config) return stage1Config;
  }

  return getDefaultConfig();
}

// Create explicit networks
const networkName = `eval-network-${submissionId}`;
await docker.createNetwork({
  Name: networkName,
  Internal: true,
});

// Implement terminate_on_finish
if (container.terminate_on_finish) {
  for (const containerId of container.terminate_on_finish) {
    await docker.stopContainer(containerId);
  }
}
```

#### 3. Dependency Resolution (src/core/processor.js)

```javascript
// Update to use depends_on
for (const dep of container.depends_on) {
  await waitForContainer(dep.container_id, {
    condition: dep.condition,
    timeout: dep.timeout || 30,
    retry: dep.retry || 5,
    retryInterval: dep.retry_interval || 2,
  });
}
```

#### 4. Resource Limits (src/core/docker.js)

```javascript
// Read from stage config, not problem config
const stageConfig = getStageConfig(container, stage);
const limits = stageConfig.resource_limits || getDefaultLimits();

await docker.createContainer({
  HostConfig: {
    Memory: parseMemory(limits.memory),
    NanoCpus: parseCpu(limits.cpu),
    // ... other configs
  },
});
```

---

## Rollback Plan

If issues are discovered after deployment:

### Option 1: Support Both Formats (Recommended)

```javascript
// Parser supports both old and new field names
const depends = container.depends_on || container.dependencies || [];
const terminate = container.terminate_on_finish || container.terminates || [];
```

### Option 2: Revert Packages

```bash
# Restore old tarballs from backup
cd /home/vtvinh24/Desktop/Workspace/Capstone/judgehost/mock/packages
cp backup/*.tar.gz .
```

---

## References

- **Configuration Guide:** `docs/data-models/containers/CONFIGURATION_GUIDE.md`
- **Resources Documentation:** `docs/data-models/containers/resources.md`
- **Problem Package Structure:** `docs/data-models/samples/problem_package_name.md`
- **Two-Sum Package Documentation:** `mock/packages/TWO_SUM_PACKAGE.md`
- **REST API Package Documentation:** `mock/packages/REST_API_USERS_PACKAGE.md`

---

## Summary

All identified issues have been resolved:

| Issue                            | Status        | Solution                                          |
| -------------------------------- | ------------- | ------------------------------------------------- |
| Resource limits at problem level | ✅ Fixed      | Moved to per-container stage configs              |
| Duplicate memory_limit field     | ✅ Fixed      | Removed from problem config                       |
| Ambiguous stage logic            | ✅ Documented | Added fallback behavior documentation             |
| Implicit network names           | ✅ Fixed      | Added explicit `eval-network-{{submission_id}}`   |
| Inconsistent dependency naming   | ✅ Fixed      | Renamed to `depends_on` and `terminate_on_finish` |

**Next Steps:**

1. Update code parsers to handle new field names
2. Implement network name template substitution
3. Implement stage fallback logic
4. Test with updated packages
5. Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** October 14, 2025  
**Updated Packages:** two-sum.tar.gz, rest-api-users.tar.gz

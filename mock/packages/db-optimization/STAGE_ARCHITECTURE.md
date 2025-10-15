# Stage Architecture: Stage 1 vs Stage 2

## Quick Reference

### Stage 1: Image Building

- **Purpose**: Build the Docker image
- **Frequency**: **Once** (reusable)
- **Command**: `docker build`
- **Output**: Docker image
- **Contains**: Base OS, dependencies, installed packages
- **Does NOT**: Run the application, mount volumes, execute hooks

### Stage 2: Container Execution

- **Purpose**: Run containers for evaluation
- **Frequency**: **Every evaluation** (fresh container each time)
- **Command**: `docker create` + `docker start`
- **Input**: Uses the Stage 1 image
- **Mounts**: Hooks and data directories
- **Executes**: Pre/periodic hooks, runs the application
- **State**: Fresh, clean state for each evaluation

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGE 1: BUILD IMAGE                     │
│                    (ONE TIME SETUP)                         │
│                                                             │
│  Dockerfile                                                 │
│      │                                                      │
│      ├─ FROM postgres:14-alpine                            │
│      ├─ RUN apt-get install ...                            │
│      ├─ COPY scripts /usr/local/bin                        │
│      └─ EXPOSE 5432                                        │
│      │                                                      │
│      ▼                                                      │
│  [docker build]                                            │
│      │                                                      │
│      ▼                                                      │
│  Docker Image: db-optimization-database:latest             │
│  - Contains: PostgreSQL, tools, base configuration         │
│  - Size: ~200-500MB                                        │
│  - Reusable: ✓ (used for ALL evaluations)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ (image is reused)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 STAGE 2: RUN CONTAINERS                     │
│                 (FRESH PER EVALUATION)                      │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │ Evaluation #1 (Student Submission A)         │          │
│  │                                               │          │
│  │  Image + Mounts → [docker create/start] →   │          │
│  │  - /workspace/hooks  (from host)             │          │
│  │  - /workspace/data   (from host)             │          │
│  │                                               │          │
│  │  → Run pre hooks                             │          │
│  │  → Start PostgreSQL                          │          │
│  │  → Process submission                        │          │
│  │  → Return results                            │          │
│  │  → [Container destroyed]                     │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │ Evaluation #2 (Student Submission B)         │          │
│  │                                               │          │
│  │  Image + Mounts → [docker create/start] →   │          │
│  │  - /workspace/hooks  (from host)             │          │
│  │  - /workspace/data   (from host)             │          │
│  │                                               │          │
│  │  → Run pre hooks (fresh start)               │          │
│  │  → Start PostgreSQL (clean DB)               │          │
│  │  → Process submission                        │          │
│  │  → Return results                            │          │
│  │  → [Container destroyed]                     │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  Each evaluation gets a FRESH container!                   │
│  No state leakage between submissions!                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

### Efficiency

- **Stage 1**: Build heavy image once (saves time on repeated builds)
- **Stage 2**: Quick container creation from pre-built image

### Isolation

- **Fresh containers** ensure no state leakage between submissions
- Each student submission starts with a clean database

### Consistency

- All submissions evaluated against the **same base image**
- Reproducible results across evaluations

### Flexibility

- **Hooks and data mounted at runtime** (Stage 2)
- Easy to update test data without rebuilding image
- Different hook configurations per evaluation if needed

## Example Commands

### Stage 1: Build Image (One Time)

```bash
cd database/
docker build -t db-optimization-database:latest .
# This takes time but only runs ONCE
```

### Stage 2: Run Container (Per Evaluation)

```bash
# Evaluation for Submission #1
docker create \
  --name eval-submission-1 \
  --mount type=bind,source=./hooks,target=/workspace/hooks,readonly \
  --mount type=bind,source=./data,target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  db-optimization-database:latest

docker start eval-submission-1
# ... process submission ...
docker stop eval-submission-1
docker rm eval-submission-1

# Evaluation for Submission #2 (fresh start!)
docker create \
  --name eval-submission-2 \
  --mount type=bind,source=./hooks,target=/workspace/hooks,readonly \
  --mount type=bind,source=./data,target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  db-optimization-database:latest

docker start eval-submission-2
# ... process submission ...
docker stop eval-submission-2
docker rm eval-submission-2
```

## Configuration Files

### `stage1.config.json` (Database Container)

```json
{
  "image": "postgres:14-alpine",
  "dockerfile": "Dockerfile",
  "resources": {
    "cpu_quota": 200000,
    "memory": "2g"
  }
}
```

- Defines how to **build** the image
- Used in Stage 1 only

### `stage2.config.json` (Database Container)

```json
{
  "mounts": {
    "/workspace/hooks": {
      "source": "hooks",
      "readonly": true
    },
    "/workspace/data": {
      "source": "data",
      "readonly": true
    }
  },
  "environment": {
    "POSTGRES_DB": "hackathon_db",
    "POSTGRES_USER": "judge",
    "POSTGRES_PASSWORD": "judgepass"
  }
}
```

- Defines how to **run** the container
- Used in Stage 2 for every evaluation

## Key Takeaways

1. ✅ **Stage 1 = Build** (once, slow, reusable)
2. ✅ **Stage 2 = Run** (per evaluation, fast, fresh)
3. ✅ Stage 1 creates the **foundation**
4. ✅ Stage 2 uses that foundation **repeatedly**
5. ✅ Mounts happen in **Stage 2**, not Stage 1
6. ✅ Hooks execute in **Stage 2** when container runs
7. ✅ Each Stage 2 container is **independent and isolated**

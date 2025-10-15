# Quick Reference: Testing the Database Container

## TL;DR

```bash
# Stage 1: Build image (once)
cd database/
docker build -t db-opt-db:latest .

# Stage 2: Run container (per evaluation)
docker create --name test-db \
  --mount type=bind,source=./hooks,target=/workspace/hooks,readonly \
  --mount type=bind,source=./data,target=/workspace/data,readonly \
  -e POSTGRES_DB=hackathon_db \
  db-opt-db:latest

docker start test-db
docker exec test-db psql -U judge -d hackathon_db -c "SELECT COUNT(*) FROM users;"
docker stop test-db && docker rm test-db
```

## Automated Testing

```bash
# Run the full test suite
./test-database-container.sh
```

## Documentation Files

| File                         | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `STAGE_ARCHITECTURE.md`      | Visual explanation of Stage 1 vs Stage 2  |
| `DATABASE_TESTING_PLAN.md`   | Comprehensive testing plan with all steps |
| `test-database-container.sh` | Automated test script                     |
| `TESTING_PLAN_UPDATES.md`    | Summary of recent changes                 |
| `README.md`                  | Problem package overview                  |

## Testing Phases

1. **Stage 1**: Build database image _(reusable)_
2. **Stage 2**: Create container with mounts _(fresh)_
3. **Verify**: Check mounts are configured
4. **Start**: Launch container and initialize DB
5. **Test**: Verify hooks, data, queries
6. **Cleanup**: Remove container

## Common Commands

```bash
# Check if image exists
docker images | grep db-optimization-database

# Inspect container mounts
docker inspect <container> --format='{{json .Mounts}}' | python3 -m json.tool

# Check container logs
docker logs <container>

# Execute query in container
docker exec <container> psql -U judge -d hackathon_db -c "SELECT version();"

# List files in container
docker exec <container> ls -la /workspace/hooks
docker exec <container> ls -la /workspace/data

# Check PostgreSQL status
docker exec <container> pg_isready -U judge -d hackathon_db
```

## Expected Results

✅ Image builds successfully (~200-500MB)  
✅ Container created with 2+ mounts  
✅ Container starts and stays running  
✅ Hooks directory accessible at `/workspace/hooks`  
✅ Data directory accessible at `/workspace/data`  
✅ Database initializes with baseline data  
✅ Queries execute successfully  
✅ Healthcheck hook runs properly

## Troubleshooting

| Issue                       | Solution                                         |
| --------------------------- | ------------------------------------------------ |
| Image build fails           | Check Dockerfile syntax, base image availability |
| Container exits immediately | Check logs: `docker logs <container>`            |
| Mounts not visible          | Verify absolute paths, check file permissions    |
| Database not ready          | Increase wait time, check PostgreSQL logs        |
| Hook not executable         | `chmod +x hooks/**/*.sh`                         |
| Query fails                 | Check database initialization, verify schema     |

## File Structure

```
db-optimization/
├── config.json                      # Problem package config
├── database/
│   ├── Dockerfile                   # Stage 1: Image definition
│   ├── stage1.config.json           # Stage 1: Build config
│   ├── stage2.config.json           # Stage 2: Runtime config
│   ├── hooks/
│   │   ├── pre/                     # Pre-execution hooks
│   │   │   ├── 01_initialize.sh     # Initialize database
│   │   │   └── 02_migration.sh      # Load baseline data
│   │   └── periodic/                # Periodic checks
│   │       └── 01_healthcheck.sh    # Health monitoring
│   └── data/
│       ├── baseline_Q1.sql          # Baseline query 1
│       ├── baseline_Q2.sql          # Baseline query 2
│       └── baseline_Q3.sql          # Baseline query 3
└── submission/
    └── (submission container files)
```

## Need Help?

- 📖 Read: `STAGE_ARCHITECTURE.md` for concepts
- 📋 Read: `DATABASE_TESTING_PLAN.md` for detailed steps
- 🚀 Run: `./test-database-container.sh` for automated testing
- 📝 Check: `TESTING_PLAN_UPDATES.md` for recent changes

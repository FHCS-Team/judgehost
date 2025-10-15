# Testing Plan Updates Summary

## Changes Made

### 1. Updated `DATABASE_TESTING_PLAN.md`

**Purpose**: Clarified the distinction between Stage 1 (image building) and Stage 2 (container execution)

**Key Updates**:

- Added **Stage Architecture** section explaining:
  - Stage 1 = Build image once (reusable across all evaluations)
  - Stage 2 = Run fresh container per evaluation (clean state)
- Added visual **Workflow Diagram** showing the relationship
- Updated phase headers:
  - "Phase 1: Stage 1 - Build the Docker Image"
  - "Phase 2: Stage 2 - Create Container with Mounts"
  - "Phase 4: Start Container and Verify Initialization"
- Clarified that Stage 1 builds the image, Stage 2 uses it

### 2. Updated `test-database-container.sh`

**Purpose**: Reflect the Stage 1/Stage 2 terminology in the automated test script

**Key Updates**:

- Added informational message at start explaining stage purposes
- Updated phase headers:
  - "Phase 1: Stage 1 - Build Docker Image (One-time Setup)"
  - "Phase 2: Stage 2 - Create Container (Fresh Evaluation)"
  - "Phase 4: Stage 2 - Start Container and Initialize"
- Added contextual comments about what each stage does

### 3. Created `STAGE_ARCHITECTURE.md`

**Purpose**: Provide a comprehensive visual reference for understanding Stage 1 vs Stage 2

**Contents**:

- Quick reference comparison table
- Detailed visual flow diagram
- Explanation of why this architecture exists
- Example commands for both stages
- Configuration file explanations
- Key takeaways

## Why These Changes Matter

### Before (Unclear)

- Documentation implied containers were created in "Stage 1"
- No clear explanation of reusability
- Mixed terminology confused the workflow

### After (Clear)

- **Stage 1** = Build once, reuse forever
- **Stage 2** = Fresh container per submission evaluation
- Clear separation of concerns
- Visual diagrams reinforce understanding

## Testing Implications

### For Database Container Testing

**Stage 1 Testing** (one-time):

```bash
# Build the image
docker build -t db-optimization-database:latest ./database/

# Verify image exists and is correct size
docker images | grep db-optimization-database
```

**Stage 2 Testing** (per evaluation):

```bash
# Create fresh container
docker create --name test-db \
  --mount type=bind,source=./hooks,target=/workspace/hooks,readonly \
  --mount type=bind,source=./data,target=/workspace/data,readonly \
  db-optimization-database:latest

# Start and test
docker start test-db
docker exec test-db <run tests>

# Clean up
docker stop test-db
docker rm test-db
```

### For Full Problem Package Testing

1. **Build Phase** (Stage 1 for both containers):
   - Build database image
   - Build submission image
2. **Evaluation Phase** (Stage 2 for both containers):

   - Create database container (mounts: hooks, data)
   - Start database container
   - Wait for initialization
   - Create submission container (mounts: hooks, data, submission)
   - Start submission container
   - Execute tests
   - Collect results
   - Clean up both containers

3. **Repeat Evaluation** for next submission:
   - Reuse same images from Step 1
   - Fresh containers in Step 2

## Files Changed

- ✅ `DATABASE_TESTING_PLAN.md` - Updated with stage clarifications
- ✅ `test-database-container.sh` - Updated terminology
- ✅ `STAGE_ARCHITECTURE.md` - **New** comprehensive reference

## Next Steps

To run the updated test:

```bash
cd /home/vtvinh24/Desktop/Workspace/Capstone/judgehost/mock/packages/db-optimization
./test-database-container.sh
```

The test script now clearly shows:

1. Stage 1: Building the image (one-time)
2. Stage 2: Creating and running container (simulating an evaluation)
3. All verification steps with proper context

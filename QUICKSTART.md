# Judgehost Quick Start Guide

Get up and running with Judgehost in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Docker installed and running
- Git installed (optional, for Git-based submissions)

## Installation

1. **Clone the repository** (if not already done):

```bash
git clone <repository-url>
cd judgehost
```

2. **Install dependencies**:

```bash
npm install
```

3. **Verify Docker is running**:

```bash
docker ps
```

## Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

You should see:

```
{"level":"INFO","message":"Judgehost server running on http://0.0.0.0:3000"}
{"level":"INFO","message":"API base path: /api"}
```

## Quick Test

Open another terminal and run:

```bash
# Check health
curl http://localhost:3000/api/health

# List problems
curl http://localhost:3000/api/problems

# Check queue status
curl http://localhost:3000/api/queue
```

## Your First Problem & Submission

### Step 1: Register a Problem

Using the included test problem:

```bash
cd mock
./zip-and-add-problem.sh
cd ..
```

Or manually:

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=test-problem" \
  -F "problem_name=Test Problem" \
  -F "package_type=file" \
  -F "problem_package=@mock/packages/test-problem.zip"
```

**Expected Output**:

```json
{
  "success": true,
  "message": "Problem test-problem registered successfully",
  "data": {
    "problem_id": "test-problem",
    "problem_name": "Test Problem",
    "image_name": "problem-test-problem:latest",
    "registered_at": "2025-10-14T10:30:00.000Z"
  }
}
```

### Step 2: Submit a Solution

Using the mock script:

```bash
cd mock
./zip-and-submit.sh
cd ..
```

Or manually:

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=test-problem" \
  -F "package_type=file" \
  -F "submission_file=@mock/packages/test-submission.zip" \
  -F "team_id=my-team" \
  -F "priority=5"
```

**Expected Output**:

```json
{
  "success": true,
  "message": "Submission enqueued successfully",
  "data": {
    "job_id": "1",
    "submission_id": "sub_1234567890abc",
    "problem_id": "test-problem",
    "status": "queued",
    "priority": 5,
    "enqueued_at": "2025-10-14T10:31:00.000Z",
    "estimated_start_time": "2025-10-14T10:31:05.000Z"
  }
}
```

**Save the submission_id** for the next step!

### Step 3: Check Submission Status

```bash
# Replace with your submission_id
curl http://localhost:3000/api/submissions/sub_1234567890abc
```

**Possible Responses**:

**Queued**:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abc",
    "status": "queued",
    "priority": 5,
    "enqueued_at": "2025-10-14T10:31:00.000Z"
  }
}
```

**Running**:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abc",
    "status": "running",
    "started_at": "2025-10-14T10:31:05.000Z"
  }
}
```

**Completed**:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abc",
    "status": "completed",
    "started_at": "2025-10-14T10:31:05.000Z",
    "completed_at": "2025-10-14T10:31:45.000Z",
    "result": {
      "total_score": 85.0,
      "max_score": 100.0,
      "percentage": 85.0
    }
  }
}
```

### Step 4: Get Results

```bash
# Get full results
curl http://localhost:3000/api/results/sub_1234567890abc

# Get results with logs
curl "http://localhost:3000/api/results/sub_1234567890abc?include_logs=true"
```

**Expected Output**:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abc",
    "problem_id": "test-problem",
    "status": "completed",
    "total_score": 85.0,
    "max_score": 100.0,
    "percentage": 85.0,
    "rubric_scores": [
      {
        "rubric_id": "correctness",
        "rubric_name": "Correctness",
        "score": 50.0,
        "max_score": 60.0,
        "percentage": 83.3,
        "status": "DONE"
      },
      {
        "rubric_id": "code_quality",
        "rubric_name": "Code Quality",
        "score": 35.0,
        "max_score": 40.0,
        "percentage": 87.5,
        "status": "DONE"
      }
    ]
  }
}
```

## Common Commands

### List All Problems

```bash
curl http://localhost:3000/api/problems
```

### Get Specific Problem

```bash
curl http://localhost:3000/api/problems/test-problem
```

### Delete Problem

```bash
curl -X DELETE http://localhost:3000/api/problems/test-problem
```

### Cancel Submission

```bash
curl -X DELETE http://localhost:3000/api/submissions/sub_1234567890abc
```

### Get Logs

```bash
curl http://localhost:3000/api/results/sub_1234567890abc/logs
```

### List Artifacts

```bash
curl http://localhost:3000/api/results/sub_1234567890abc/artifacts
```

## Configuration

Edit `.env` or `src/config/index.js` to customize:

```javascript
// API Settings
port: 3000,
host: "0.0.0.0",
basePath: "/api",

// Resource Limits
maxWorkers: 3,
maxUploadSizeMB: 100,

// Queue Settings
queueMaxSize: 100,

// Docker Settings
buildTimeout: 600000, // 10 minutes
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm start
```

### Docker Connection Error

```bash
# Check Docker is running
docker ps

# Check Docker socket permissions
ls -la /var/run/docker.sock

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

### Problem Registration Fails

```bash
# Check Docker disk space
docker system df

# Clean up unused images
docker image prune -a

# Check logs
tail -f logs/judgehost.log
```

### Submission Hangs

```bash
# Check queue status
curl http://localhost:3000/api/queue

# Check running containers
docker ps

# Check server logs
tail -f logs/judgehost.log
```

## Directory Structure

```
judgehost/
├── data/
│   ├── problems/          # Registered problems
│   ├── submissions/       # Submission code
│   ├── results/          # Evaluation results
│   └── uploads/          # Temporary uploads
├── src/
│   ├── server/           # API routes
│   ├── core/            # Core logic
│   ├── models/          # Data models
│   └── utils/           # Utilities
├── docs/                # API documentation
├── mock/                # Test data
└── scripts/            # Helper scripts
```

## Next Steps

1. **Read the Documentation**:

   - [API Documentation](docs/README.md)
   - [Architecture Guide](ARCHITECTURE.md)
   - [Testing Guide](TESTING_GUIDE.md)
   - [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

2. **Create Your Own Problem**:

   - Study `mock/test-package/` structure
   - Write `config.json` with rubrics
   - Create Dockerfile for evaluation environment
   - Add hooks for testing

3. **Test Multi-Container Problems**:

   - Frontend + Backend + Database
   - Multiple evaluation containers
   - Complex dependency chains

4. **Integrate with Your System**:
   - Connect to LMS via API
   - Set up webhooks for notifications
   - Implement authentication
   - Configure resource limits

## Support

- **Documentation**: See `/docs` folder
- **Examples**: See `/mock` folder
- **Test Scripts**: See `/scripts` folder
- **Logs**: Check `logs/judgehost.log`

## API Reference Card

| Endpoint                | Method | Description      |
| ----------------------- | ------ | ---------------- |
| `/api/problems`         | GET    | List problems    |
| `/api/problems`         | POST   | Register problem |
| `/api/problems/:id`     | GET    | Get problem      |
| `/api/problems/:id`     | DELETE | Delete problem   |
| `/api/submissions`      | POST   | Submit solution  |
| `/api/submissions/:id`  | GET    | Check status     |
| `/api/submissions/:id`  | DELETE | Cancel           |
| `/api/results/:id`      | GET    | Get results      |
| `/api/results/:id/logs` | GET    | Get logs         |
| `/api/queue`            | GET    | Queue status     |
| `/api/health`           | GET    | Health check     |

## Example Workflow

```bash
# 1. Start server
npm start

# 2. Register problem (in new terminal)
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=hello-world" \
  -F "problem_name=Hello World" \
  -F "package_type=file" \
  -F "problem_package=@problem.zip"

# 3. Submit solution
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=hello-world" \
  -F "package_type=file" \
  -F "submission_file=@solution.zip" \
  -F "team_id=team1"

# Output: {"data":{"submission_id":"sub_xyz123"}}

# 4. Wait a few seconds, then check results
curl http://localhost:3000/api/results/sub_xyz123

# 5. View logs if needed
curl http://localhost:3000/api/results/sub_xyz123/logs
```

## Success! 🎉

You now have Judgehost running and can:

- ✅ Register problems
- ✅ Submit solutions
- ✅ Retrieve results
- ✅ Monitor the queue

Ready to build something amazing!

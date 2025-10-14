# Testing the Judgehost API

This guide demonstrates how to test the implemented API endpoints.

## Prerequisites

1. Ensure Docker is running
2. Start the Judgehost server:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:3000` by default.

## Testing Problem Management

### 1. List All Problems

```bash
curl -X GET http://localhost:3000/api/problems
```

Expected response:

```json
{
  "success": true,
  "data": {
    "problems": [...],
    "total": 1
  }
}
```

### 2. Get Specific Problem

```bash
curl -X GET http://localhost:3000/api/problems/reverse-string
```

### 3. Register a New Problem (File Upload)

```bash
# First, create a problem package zip file
cd mock/test-package
zip -r ../problem-test.zip *
cd ../..

# Upload the problem
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=test-problem" \
  -F "problem_name=Test Problem" \
  -F "package_type=file" \
  -F "problem_package=@mock/problem-test.zip" \
  -F "project_type=algorithm"
```

### 4. Register Problem from Git Repository

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=git-problem" \
  -F "problem_name=Git-based Problem" \
  -F "package_type=git" \
  -F "git_url=https://github.com/your-org/problem-package.git" \
  -F "git_branch=main"
```

### 5. Delete a Problem

```bash
curl -X DELETE http://localhost:3000/api/problems/test-problem
```

## Testing Submissions

### 1. Submit Solution (File Upload)

```bash
# Create submission package
cd mock/test-submission
zip -r ../submission-test.zip *
cd ../..

# Submit the solution
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=reverse-string" \
  -F "package_type=file" \
  -F "submission_file=@mock/submission-test.zip" \
  -F "team_id=team-42" \
  -F "priority=7"
```

Expected response:

```json
{
  "success": true,
  "message": "Submission enqueued successfully",
  "data": {
    "job_id": "12345",
    "submission_id": "sub_1234567890abcdef",
    "problem_id": "reverse-string",
    "status": "queued",
    "priority": 7,
    "enqueued_at": "2025-10-14T10:30:15.789Z",
    "estimated_start_time": "2025-10-14T10:35:00.000Z"
  }
}
```

### 2. Submit from Git Repository

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=reverse-string" \
  -F "package_type=git" \
  -F "git_url=https://github.com/team42/solution.git" \
  -F "git_branch=main" \
  -F "team_id=team-42"
```

### 3. Submit from URL

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=reverse-string" \
  -F "package_type=url" \
  -F "package_url=https://example.com/submissions/solution.zip" \
  -F "team_id=team-42"
```

### 4. Check Submission Status

```bash
# Replace with actual submission_id from previous response
curl -X GET http://localhost:3000/api/submissions/sub_1234567890abcdef
```

### 5. Cancel Submission

```bash
curl -X DELETE http://localhost:3000/api/submissions/sub_1234567890abcdef
```

## Testing Results

### 1. Get Complete Results

```bash
# Replace with actual submission_id
curl -X GET http://localhost:3000/api/results/sub_1234567890abcdef
```

### 2. Get Results with Logs

```bash
curl -X GET "http://localhost:3000/api/results/sub_1234567890abcdef?include_logs=true"
```

### 3. Get Execution Logs (Text Format)

```bash
curl -X GET http://localhost:3000/api/results/sub_1234567890abcdef/logs
```

### 4. Get Execution Logs (JSON Format)

```bash
curl -X GET "http://localhost:3000/api/results/sub_1234567890abcdef/logs?format=json"
```

### 5. List Artifacts

```bash
curl -X GET http://localhost:3000/api/results/sub_1234567890abcdef/artifacts
```

### 6. Download Specific Artifact

```bash
curl -X GET http://localhost:3000/api/results/sub_1234567890abcdef/artifacts/output.txt \
  -o output.txt
```

### 7. Get Specific Rubric Details

```bash
curl -X GET http://localhost:3000/api/results/sub_1234567890abcdef/rubric/api_correctness
```

## Testing Queue Status

```bash
curl -X GET http://localhost:3000/api/queue
```

Expected response:

```json
{
  "success": true,
  "data": {
    "queue_size": 3,
    "running_jobs": 1,
    "completed_jobs": 45,
    "failed_jobs": 2,
    "total_processed": 47
  }
}
```

## Testing Health Check

```bash
curl -X GET http://localhost:3000/api/health
```

## Using the Test Scripts

The repository includes test scripts for automated testing:

### Test Problem API

```bash
./scripts/test-api-problems.sh
```

This script will:

1. List all problems
2. Register a new problem
3. Get problem details
4. Delete the problem

### Test Submission API

```bash
./scripts/test-api-submissions.sh
```

This script will:

1. Create a submission
2. Check submission status
3. Get results (when completed)
4. Cancel submission (if needed)

## Using Mock Scripts

### Register Problem from Mock Package

```bash
cd mock
./zip-and-add-problem.sh
```

This will:

1. Create a zip file from `test-package/`
2. Register it as a problem via the API
3. Display the response

### Submit Solution

```bash
cd mock
./zip-and-submit.sh
```

This will:

1. Create a zip file from `test-submission/`
2. Submit it via the API
3. Display the submission ID and status

## Testing Error Handling

### 1. Submit to Non-existent Problem

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=non-existent-problem" \
  -F "package_type=file" \
  -F "submission_file=@mock/submission-test.zip"
```

Expected: 404 error with helpful message

### 2. Missing Required Fields

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "package_type=file"
```

Expected: 400 error listing required fields

### 3. Invalid Package Type

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=test" \
  -F "problem_name=Test" \
  -F "package_type=invalid"
```

Expected: 400 error with valid types listed

## Testing with Postman/Insomnia

You can import the following collection for GUI testing:

### Base URL

```
http://localhost:3000/api
```

### Collections

Create requests for each endpoint documented above. The API supports:

- JSON responses for all endpoints
- multipart/form-data for file uploads
- Query parameters for filtering and options

## Monitoring Logs

Watch the server logs for detailed information:

```bash
# If running with npm run dev
tail -f logs/judgehost.log

# Or watch server output directly
npm run dev
```

The logs will show:

- Incoming requests
- Problem registration progress
- Submission processing
- Docker build output
- Evaluation status
- Errors and warnings

## Expected Behavior

### Problem Registration

1. Upload/download package
2. Validate structure (config.json, Dockerfile required)
3. Build Docker image
4. Register in problem registry
5. Return success with image name

### Submission Processing

1. Validate problem exists
2. Upload/download submission code
3. Enqueue job with priority
4. Return job ID and submission ID
5. Process in background
6. Save results when complete

### Results Retrieval

- Returns 202 (Accepted) if still processing
- Returns 200 with results when complete
- Returns 404 if submission not found

## Troubleshooting

### Server won't start

- Check if port 3000 is already in use
- Verify Docker is running
- Check logs for errors

### Problem registration fails

- Ensure package has config.json and Dockerfile
- Check Docker is accessible
- Verify disk space for images

### Submission fails

- Verify problem exists
- Check package format (zip/tar.gz)
- Ensure submission structure matches requirements

### Results not available

- Check submission status first
- Wait for evaluation to complete
- Check server logs for errors

## Next Steps

After verifying basic functionality:

1. Test multi-container problems
2. Test multi-package submissions
3. Verify webhook notifications
4. Load test with multiple submissions
5. Test resource limit enforcement

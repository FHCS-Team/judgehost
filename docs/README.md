# Judgehost Documentation

Welcome to the Judgehost documentation. This directory contains comprehensive guides for using and extending the judgehost system.

---

## Quick Links

### API Documentation

#### Problems

- [POST /problems](problems/POST_problems.md) - Register new problem packages
- [GET /problems](problems/GET_problems.md) - List and retrieve problems
- [DELETE /problems/:id](problems/DELETE_problems.md) - Delete problems

#### Submissions

- [POST /submissions](submissions/POST_submissions.md) - Submit solutions for evaluation
- [GET /submissions/:id](submissions/GET_submissions.md) - Check submission status
- [DELETE /submissions/:id](submissions/DELETE_submissions.md) - Cancel submissions

#### Results

- [GET /results/:id](results/GET_results.md) - Retrieve evaluation results
- [GET /results/:id/logs](results/GET_results_logs.md) - Retrieve execution logs
- Additional result endpoints documented in [results/](results/)

### Data Models

#### Project Types and Rubrics

- [Project Types](data-models/project_types.md) - Available project types and their recommended rubrics
- [Rubric Types](data-models/rubric_types.md) - Rubric evaluation types and test case formats

#### Rubrics

- [Rubric-to-Container Mapping](data-models/rubrics/mapping.md) - How rubrics are evaluated by different containers

#### Containers

- [Problem Resources and Container Mounting](data-models/containers/resources.md) - How hooks and data are made available to containers

#### Outputs

- [Log Format Specification](data-models/outputs/logs.md) - Log structure and format
- [Metrics Specification](data-models/outputs/metrics.md) - Resource usage metrics

#### Samples

- [Problem Package Structure](data-models/samples/problem_package_name.md) - Problem package file structure
- [Submission Package Structure](data-models/samples/submission_package_name.md) - Submission package file structure

---

## Key Concepts

### Container Execution Model

**IMPORTANT: Containers created by judgehost do not execute their work autonomously.**

The judgehost uses an **orchestrated execution model**:

1. **Containers are environments**: They provide the runtime context (Node.js, Python, databases, etc.)
2. **Judgehost is the orchestrator**: It controls what runs inside containers and when
3. **Hooks are commands**: Evaluation logic is executed via `docker exec` commands from judgehost
4. **Commands are passed from build functions**: The orchestrator determines which scripts to run

**What this means:**

- Containers don't "do work" on their own - they wait for commands
- Hooks don't run automatically - judgehost executes them at specific lifecycle points
- The CMD/ENTRYPOINT should start services or idle, not run evaluation logic
- All evaluation coordination happens externally via the judgehost orchestrator

### Multi-Container Architecture

Problems can define multiple containers for evaluation:

- **Submission container**: Runs submission code (accepts submissions)
- **Tester containers**: Run evaluation tests and checks (do not accept submissions)
- **Service containers**: Provide infrastructure like databases (do not accept submissions)

Containers are coordinated through dependencies, health checks, and lifecycle management.

### Container Dependencies and Lifecycle

Containers can depend on each other with sophisticated orchestration:

- **Health-based triggers**: Start container B when container A becomes healthy
- **Completion-based triggers**: Terminate container A when container B finishes
- **Timeouts and retries**: Configure health check timeouts and retry logic
- **Parallel and sequential execution**: Mix independent and dependent containers

### Rubric-to-Container Mapping

Different containers evaluate different rubrics:

- **Submission container**: Code quality, security scans, resource usage
- **Tester container**: API tests, UI tests, integration tests

See [Rubric Mapping](data-models/rubrics/mapping.md) for detailed strategies.

### Rubric Evaluation Status

Rubrics use specific status values to indicate evaluation progress:

- `DONE` - Evaluation completed successfully (all test cases/scripts executed)
- `SKIPPED` - Not evaluated (reserved for manual rubrics)
- `ERROR` - Evaluation failed due to system error

Note: The judgehost does not evaluate `manual` rubric types. These are automatically marked as `SKIPPED` and handled by DOMServer for instructor grading.

See [Rubric Types](data-models/rubric_types.md) for details.

### Problem Resources

Problem packages include:

- **Global config**: Multi-container setup and dependencies
- **Per-container configs**: Each container's Dockerfile and resources
- **Hooks**: Evaluation scripts executed by judgehost via `docker exec` (orchestrator-controlled)
- **Tools**: Helper scripts executed inside containers via entrypoint.sh (container-internal)
- **Data**: Test cases, fixtures, expected outputs
- **Resources**: Utilities, validators, configurations

**Critical distinction:**

- **Hooks**: Executed **BY** judgehost using `docker exec` - external orchestration
- **Tools**: Executed **INSIDE** containers - internal utilities
- **Entrypoints**: Run when container starts - services or idle processes

See [Problem Resources](data-models/containers/resources.md) for mounting details.

### Logs and Metrics

The judgehost collects:

- **Logs**: From all containers, tagged by source and container
- **Metrics**: CPU, memory, network, disk usage per container

See [Logs](data-models/outputs/logs.md) and [Metrics](data-models/outputs/metrics.md) for format specifications.

---

## Getting Started

### 1. Register a Problem

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=my-problem" \
  -F "problem_name=My Problem" \
  -F "package_type=file" \
  -F "problem_package=@problem.tar.gz"
```

See [POST /problems](problems/POST_problems.md) for details.

### 2. Submit a Solution

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=my-problem" \
  -F "package_type=file" \
  -F "submission_file=@solution.zip"
```

See [POST /submissions](submissions/POST_submissions.md) for details.

### 3. Check Results

```bash
curl http://localhost:3000/api/results/{submission_id}
```

See [GET /results](results/GET_results.md) for details.

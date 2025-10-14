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

## Documentation Structure

```
docs/
├── README.md                        # This file
├── problems/                        # Problem management API
│   ├── POST_problems.md
│   ├── GET_problems.md
│   └── DELETE_problems.md
├── submissions/                     # Submission management API
│   ├── POST_submissions.md
│   ├── GET_submissions.md
│   └── DELETE_submissions.md
├── results/                         # Result retrieval API
│   ├── GET_results.md
│   └── GET_results_logs.md
└── data-models/                     # Data structure specifications
    ├── project_types.md            # Project types and rubrics
    ├── rubric_types.md             # Rubric types and formats
    ├── rubrics/
    │   └── mapping.md              # Rubric-to-container mapping
    ├── containers/
    │   └── resources.md            # Problem resources mounting
    ├── outputs/
    │   ├── logs.md                 # Log format
    │   └── metrics.md              # Metrics format
    └── samples/
        ├── problem_package_name.md     # Problem package structure
        └── submission_package_name.md  # Submission package structure
```

---

## Key Concepts

### Multi-Container Architecture

Problems can define multiple containers for evaluation:

- **Submission container**: Runs student code (accepts submissions)
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

### Problem Resources

Problem packages include:

- **Global config**: Multi-container setup and dependencies
- **Per-container configs**: Each container's Dockerfile and resources
- **Hooks**: Evaluation scripts (executed outside containers via docker exec)
- **Tools**: Helper scripts (executed inside containers via entrypoint.sh)
- **Data**: Test cases, fixtures, expected outputs
- **Resources**: Utilities, validators, configurations

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

---

## Common Workflows

### Creating a Multi-Container Problem

1. Design container architecture (submission + tester + services)
2. Define which containers evaluate which rubrics
3. Configure container dependencies and health checks
4. Create per-container Dockerfiles and hooks
5. Configure resource mounting
6. Test locally

See:

- [Rubric Mapping](data-models/rubrics/mapping.md)
- [Problem Resources](data-models/containers/resources.md)
- [Problem Package Structure](data-models/samples/problem_package_name.md)

### Writing Evaluation Hooks

1. Choose appropriate hook phase (pre, post, periodic)
2. Understand hooks are executed outside containers via `docker exec`
3. Access problem resources at `/data/` and `/resources/`
4. Write rubric results to `/out/rubric_<id>.json`
5. Log progress to stderr

Note: Tools (not hooks) are executed inside containers via entrypoint.sh.

See [Problem Resources](data-models/containers/resources.md) for details.

### Analyzing Multi-Container Logs

1. Retrieve logs: `GET /results/:id/logs`
2. Filter by container: `?container_id=submission`
3. Filter by source: `?source=hook`
4. Parse structured JSON for analysis

See [Log Format](data-models/outputs/logs.md) for details.

---

## Contributing

When adding new documentation:

1. **API Endpoints**: Add to appropriate directory (`problems/`, `submissions/`, `results/`)
2. **Data Models**: Add to `data-models/` with appropriate subdirectory
3. **Update this README**: Add links to new documents

---

## Support

For questions or issues:

- Check existing documentation first
- Review examples in each document
- Consult the main [README](../README.md)

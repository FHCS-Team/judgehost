# Judgehost Documentation

## Overview

Judgehost is a custom evaluation system designed to orchestrate container-based testing of submissions for programming competitions and hackathons. Unlike traditional code execution sandboxes, this judgehost supports evaluating complete projects including web UIs, API servers, database queries, and other complex software components.

## Quick Links

### API Documentation

- **[Problem Management](docs/[API]%20PROBLEM.md)** - Register and manage problem packages
- **[Submission Management](docs/[API]%20SUBMISSION.md)** - Submit solutions and manage evaluations
- **[Result Retrieval](docs/[API]%20RESULT.md)** - Access evaluation results and logs

### Specifications

- **[Container Architecture](docs/[SPEC]%20CONTAINER_ARCHITECTURE.md)** - Two-stage architecture and multi-container support
- **[Project Types](docs/[SPEC]%20PROJECT_TYPES.md)** - Supported project types and configurations
- **[Queue System](docs/[SPEC]%20QUEUE_SYSTEM.md)** - Job queue behavior and prioritization
- **[Rubric Types](docs/[SPEC]%20RUBRIC_TYPES.md)** - Evaluation rubric types and scoring

### Guides

- **[Writing Evaluation Hooks](docs/[GUIDE]%20WRITING_HOOKS.md)** - How to create custom evaluation scripts
- **[Environment Variables](docs/ENVIRONMENT.md)** - Complete configuration reference

## Core Architecture

The judgehost follows a functional architecture with immutable data structures and pure functions where possible:

judgehost/
├── docker/ # Container definitions
├── src/
│ ├── server/ # API server (Express)
│ ├── core/ # Core judging logic
│ ├── models/ # Type definitions
│ └── utils/ # Pure utility functions
├── scripts/ # Automation scripts
├── config/ # Configuration files
└── tests/ # Test suite

## Problem Package Format

A problem package contains everything needed to evaluate submissions:

### Problem Components

- **Hooks**: Scripts executed during evaluation lifecycle (pre-execution, post-execution, periodic)
- **Resources**: Data files used by hooks during evaluation
- **Project Type**: Defines judgehost behavior (API, web UI, etc.)
- **Execution Config**: Resource limits (RAM, CPU, network, etc.)
- **Rubrics**: Evaluation criteria used for scoring

For detailed information on writing hooks, see the **[Writing Evaluation Hooks Guide](docs/[GUIDE]%20WRITING_HOOKS.md)**.

### Problem Structure

problem/
├── hooks/
│ ├── pre/ # Executed before deployment
│ ├── post/ # Executed after deployment
│ └── periodic/ # Executed periodically during evaluation
├── resources/ # Problem-specific resources
├── config.json # Problem configuration
└── Dockerfile # For building the problem image

## Submission Workflow

The complete evaluation lifecycle:

1. **Submission Retrieval**: Judgehost retrieves submission from DOMserver
2. **Problem Image Building**: (Performed once per problem) Creates evaluation container image
3. **Submission Loading**: Downloads and extracts submission source code
4. **Container Creation**: Spins up container using problem image
5. **Pre-Execution**: Runs pre-execution hooks & utilities
6. **Deployment**: Deploys the submission (e.g., starts web server)
7. **Evaluation**: Runs post-execution hooks & utilities to assess the solution
8. **Result Collection**: Retrieves evaluation outputs from container
9. **Container Teardown**: Cleans up container resources
10. **Scoring**: Processes evaluation data using problem-specific scoring logic
11. **Result Reporting**: Reports scores, metrics, and logs back to DOMserver

## Container Management

### Container Technology

The judgehost uses Docker to manage evaluation environments:

- **Base Images**: Pre-defined images for different project types
- **Problem Images**: Built once per problem from problem package
- **Evaluation Containers**: Ephemeral containers created for each submission

### Container Directory Structure

/
├── tmp/ # Temporary storage
├── problem/ # Problem resource files
├── submission/ # Downloaded submission files
├── hooks/ # Evaluation hooks
│ ├── pre/
│ ├── post/
│ └── periodic/
├── out/ # Execution output and logs
└── utils/ # Utility scripts

### Multi-Container Applications

For evaluating distributed applications:

- Uses Docker Compose for multi-container orchestration
- Service-specific hooks organized in subdirectories
- Network isolation between evaluation instances
- Service discovery through Docker's internal DNS

## Queue System

The judgehost implements a priority-based job queue:

- **Job Prioritization**: Configurable priority calculation
- **Concurrency Control**: Limits simultaneous evaluations
- **Job Recovery**: Supports partial evaluation and restart
- **Event-Driven**: Uses event emitters for status updates
- **Immutable State**: Queue maintains immutable state for reliability

## API Documentation

The judgehost provides a comprehensive REST API for managing problems, submissions, and results. For detailed API documentation, please refer to the dedicated API documentation files:

### API Endpoints

- **[Problem Management](docs/[API]%20PROBLEM.md)** - Register and manage problem packages

  - `POST /problems` - Register a new problem and build the problem image
  - `GET /problems/:problem_id` - Retrieve problem information
  - `DELETE /problems/:problem_id` - Remove a problem

- **[Submission Management](docs/[API]%20SUBMISSION.md)** - Submit and manage evaluation jobs

  - `POST /submissions` - Submit code for evaluation
  - `GET /submissions/:submission_id` - Get submission status
  - `PUT /submissions/:submission_id` - Update submission properties
  - `DELETE /submissions/:submission_id` - Cancel a submission

- **[Result Retrieval](docs/[API]%20RESULT.md)** - Access evaluation results and logs
  - `GET /results/:submission_id` - Get complete evaluation results
  - `GET /results/:submission_id/logs` - Retrieve execution logs
  - `GET /results/:submission_id/artifacts` - Download generated artifacts

### API Characteristics

- **Authentication**: HTTP Basic Authentication or API tokens
- **Content Types**: JSON for most endpoints, multipart/form-data for file uploads
- **File Handling**:
  - Small files (< 1MB): Base64-encoded inline content
  - Large files: URL-based retrieval with streaming support
  - Git repositories: Public repository URLs with optional commit/branch specification
- **Error Handling**: Structured error responses with detailed messages and suggestions
- **Rate Limiting**: Configurable per-client limits to prevent abuse

For complete API specifications, examples, and error codes, see the individual API documentation files in the `docs/` directory.

## System Specifications

Detailed specifications for the judgehost system are available in the following documents:

- **[Container Architecture](docs/[SPEC]%20CONTAINER_ARCHITECTURE.md)** - Two-stage container architecture and multi-container support
- **[Project Types](docs/[SPEC]%20PROJECT_TYPES.md)** - Supported project types and their characteristics
- **[Queue System](docs/[SPEC]%20QUEUE_SYSTEM.md)** - Job queue behavior and prioritization
- **[Rubric Types](docs/[SPEC]%20RUBRIC_TYPES.md)** - Evaluation rubric types and scoring methods

## Security Considerations

The judgehost implements several security measures:

- **Container Isolation**: Submissions run in isolated containers
- **Network Controls**: Configurable network access restrictions
- **Resource Limits**: Memory, CPU, and execution time constraints
- **Privilege Separation**: Containers run without privileged access
- **Sanitized Output**: Submission output is sanitized before processing

## Error Handling & Recovery

Robust error handling ensures reliability:

- **Timeouts**: Enforced at container and hook levels
- **Partial Evaluation**: Saves intermediate state for recovery
- **Retry Mechanism**: Configurable retry policies for failed jobs
- **Comprehensive Logging**: Detailed logs for troubleshooting

## Configuration

The system uses environment variables for configuration. Key configuration areas include:

- **Docker**: Container runtime settings
- **Resource Limits**: Memory, CPU, disk, and concurrency limits
- **Paths**: File system locations for work directories, problems, and results
- **Queue**: Job processing parameters and queue size limits
- **API**: Server configuration, authentication, and CORS settings
- **DOMserver**: Integration settings (if applicable)
- **Logging**: Log levels, formats, and destinations
- **Security**: Container security profiles and authentication methods

Configuration is environment-variable driven for easy deployment in different environments.

### Example Configuration

```bash
# Resource Limits
JUDGEHOST_MAX_WORKERS=5
JUDGEHOST_MAX_MEMORY_MB=16384
JUDGEHOST_MAX_CPU_CORES=16.0

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
API_AUTH_ENABLED=true

# Paths
JUDGEHOST_WORK_DIR=/var/lib/judgehost/work
JUDGEHOST_PROBLEMS_DIR=/var/lib/judgehost/problems
```

For a complete list of environment variables and configuration options, see **[Environment Variables Reference](docs/ENVIRONMENT.md)**.

## Multi-Container Support

For complex project evaluation:

- **Service Composition**: Docker Compose for multi-container applications
- **Network Topologies**: Configurable network settings between containers
- **Service-specific Hooks**: Specialized hooks for each service
- **Distributed Testing**: Support for evaluating distributed systems

## Extensibility

The judgehost is designed to be extensible:

- **Pluggable Hooks**: Custom hooks for specialized testing
- **Project Types**: Support for different project architectures
- **Scoring Modules**: Custom scoring logic per problem
- **Resource Monitors**: Pluggable performance monitoring

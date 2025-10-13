# Judgehost

A containerized evaluation system for programming competitions and hackathons that supports complex project evaluation including web applications, APIs, databases, and full-stack applications.

## Features

- 🐳 **Two-Stage Container Architecture** - Fast evaluation with reusable problem images
- 🚀 **Multi-Container Support** - Evaluate full-stack applications with multiple services
- 📊 **Flexible Rubric System** - Automated evaluation with customizable criteria
- ⚡ **Priority Queue System** - Fair resource allocation and job prioritization
- 🔒 **Secure Isolation** - Submissions run in isolated container environments
- 🔌 **Extensible Hooks** - Custom evaluation scripts for specialized testing
- 📦 **Multiple Submission Sources** - Support for Git repositories, archives, and direct uploads
- 🎯 **Project Type Support** - Algorithm problems, web APIs, full-stack apps, databases, CLI tools, and more

## Quick Start

### Prerequisites

- Docker 20.10+ (with Docker Compose)
- Node.js 18+ and npm
- 4GB+ RAM recommended
- Linux or macOS (Windows via WSL2)

### Installation

```bash
# Clone the repository
git clone https://github.com/FHCS-Team/judgehost.git
cd judgehost

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the judgehost
npm start
```

### Basic Usage

#### 1. Register a Problem

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=two-sum" \
  -F "problem_name=Two Sum Algorithm" \
  -F "project_type=algorithm" \
  -F "package_type=file" \
  -F "problem_package=@problem-two-sum.tar.gz"
```

#### 2. Submit a Solution

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=two-sum" \
  -F "package_type=git" \
  -F "git_url=https://github.com/team/solution.git"
```

#### 3. Check Results

```bash
curl http://localhost:3000/api/results/{submission_id}
```

## Architecture

The judgehost uses a **two-stage container architecture**:

1. **Problem Image** (Stage 1) - Built once per problem, contains evaluation hooks and resources
2. **Evaluation Image** (Stage 2) - Built per submission, extends problem image with submission code

This approach provides fast evaluation by reusing problem images across multiple submissions.

### Workflow

1. Problem package is uploaded and problem image is built
2. Submission is received and queued
3. Evaluation image is built with submission code
4. Container is created and pre-execution hooks run
5. Submission is deployed and tested
6. Post-execution hooks evaluate the submission
7. Results are collected and scored
8. Container is cleaned up

## Documentation

### Main Documentation

- **[DOCUMENTATION.md](DOCUMENTATION.md)** - Complete system documentation and architecture overview

### API Documentation

- **[Problem Management](docs/[API]%20PROBLEM.md)** - Register and manage problem packages
- **[Submission Management](docs/[API]%20SUBMISSION.md)** - Submit solutions and manage evaluation jobs
- **[Result Retrieval](docs/[API]%20RESULT.md)** - Access evaluation results, logs, and artifacts

### System Specifications

- **[Container Architecture](docs/[SPEC]%20CONTAINER_ARCHITECTURE.md)** - Two-stage architecture and multi-container support
- **[Project Types](docs/[SPEC]%20PROJECT_TYPES.md)** - Supported project types and configurations
- **[Queue System](docs/[SPEC]%20QUEUE_SYSTEM.md)** - Job queue behavior and prioritization
- **[Rubric Types](docs/[SPEC]%20RUBRIC_TYPES.md)** - Evaluation rubric types and scoring

## Supported Project Types

- **`algorithm`** - Traditional algorithmic problems with input/output testing
- **`web_api`** - REST APIs, GraphQL servers, and microservices
- **`full_stack_web`** - Complete web applications with frontend and backend
- **`database_design`** - Database schema design and query optimization
- **`cli_tool`** - Command-line applications and utilities
- **`data_processing`** - ETL pipelines, data analysis, and ML models

## Configuration

Key environment variables:

```bash
# Docker Configuration
DOCKER_HOST=unix:///var/run/docker.sock

# Resource Limits
JUDGEHOST_MAX_WORKERS=3
JUDGEHOST_MAX_MEMORY_MB=8192
JUDGEHOST_MAX_CPU_CORES=8.0

# Queue Configuration
JUDGEHOST_MAX_QUEUE_SIZE=100

# Paths
JUDGEHOST_WORK_DIR=/tmp/judgehost
JUDGEHOST_PROBLEMS_DIR=/var/lib/judgehost/problems

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
```

See [DOCUMENTATION.md](DOCUMENTATION.md) for complete configuration options.

## Development

### Running Tests

```bash
npm test
```

### Running in Development Mode

```bash
npm run dev
```

### Building Docker Image

```bash
docker build -t judgehost:latest .
```

## Project Structure

```
judgehost/
├── src/
│   ├── server/          # API server (Express)
│   ├── core/            # Core judging logic
│   │   ├── docker.js    # Docker container management
│   │   ├── processor.js # Submission processing
│   │   └── queue.js     # Job queue system
│   ├── models/          # Type definitions
│   └── utils/           # Utility functions
├── docker/              # Container definitions and tools
├── docs/                # Detailed documentation
├── scripts/             # Automation scripts
├── config/              # Configuration files
└── tests/               # Test suite
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by DOMjudge's judgehost architecture
- Built for hackathons and programming competitions
- Designed for extensibility and ease of use

## Support

For issues, questions, or contributions:

- **Issues**: [GitHub Issues](https://github.com/FHCS-Team/judgehost/issues)
- **Documentation**: See [docs/](docs/) directory
- **Project Repository**: [github.com/FHCS-Team/judgehost](https://github.com/FHCS-Team/judgehost)

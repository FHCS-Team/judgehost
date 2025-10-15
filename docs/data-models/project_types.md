# Project Types

This document describes the supported project types and their associated rubrics.

**Related Documentation**:

- [`rubric_types.md`](rubric_types.md) - Rubric type specifications
- [`../problems/POST_problems.md`](../problems/POST_problems.md) - Problem registration
- [`samples/problem_package_name.md`](samples/problem_package_name.md) - Problem package structure

---

## Overview

Project types define the category of problem and determine which rubrics are commonly used for evaluation. Each project type has a recommended set of rubrics, but problem authors can customize the rubric list.

---

## Available Project Types

### `algorithm`

**Description**: Algorithm and data structure problems

**Common Use Cases**:

- Two Sum, Longest Substring
- Binary Search, Depth-First Search
- Dynamic Programming problems
- Competitive programming challenges

**Recommended Rubrics**:

- `correctness` (test_cases) - Test case pass rate
- `time_complexity` (performance_benchmark) - Algorithm efficiency
- `space_complexity` (resource_usage) - Memory efficiency
- `code_quality` (code_quality) - Code style and readability
- `code_review` (manual) - Code design and approach (optional)

**Example**:

```json
{
  "problem_id": "two-sum",
  "project_type": "algorithm",
  "rubrics": [
    {
      "rubric_id": "correctness",
      "rubric_type": "test_cases",
      "max_score": 60
    },
    {
      "rubric_id": "time_complexity",
      "rubric_type": "performance_benchmark",
      "max_score": 20
    },
    {
      "rubric_id": "space_complexity",
      "rubric_type": "resource_usage",
      "max_score": 20
    }
  ]
}
```

---

### `web-api`

**Description**: RESTful API and web service development

**Common Use Cases**:

- REST API with CRUD operations
- GraphQL API
- Microservices
- API with authentication and authorization

**Recommended Rubrics**:

- `api_correctness` (api_endpoints) - Endpoint functionality
- `api_design` (manual) - RESTful design principles
- `authentication` (security_scan) - Security implementation
- `database_design` (custom) - Data model quality
- `error_handling` (custom) - Error responses
- `performance` (performance_benchmark) - Response time and throughput
- `code_quality` (code_quality) - Code organization and style

**Example**:

```json
{
  "problem_id": "rest-api-users",
  "project_type": "web-api",
  "rubrics": [
    {
      "rubric_id": "api_correctness",
      "rubric_type": "api_endpoints",
      "max_score": 40,
      "container": "api-tester"
    },
    {
      "rubric_id": "authentication",
      "rubric_type": "security_scan",
      "max_score": 20,
      "container": "api-tester"
    },
    {
      "rubric_id": "database_design",
      "rubric_type": "custom",
      "max_score": 20,
      "container": "submission"
    },
    {
      "rubric_id": "code_quality",
      "rubric_type": "code_quality",
      "max_score": 20,
      "container": "submission"
    }
  ]
}
```

---

### `database`

**Description**: Database design and SQL query problems

**Common Use Cases**:

- Schema design
- Query optimization
- Stored procedures and triggers
- Database migrations

**Recommended Rubrics**:

- `schema_design` (manual) - Database structure
- `query_correctness` (test_cases) - Query results accuracy
- `query_performance` (performance_benchmark) - Query efficiency
- `data_integrity` (custom) - Constraints and relationships
- `normalization` (manual) - Database normalization

**Example**:

```json
{
  "problem_id": "ecommerce-database",
  "project_type": "database",
  "rubrics": [
    {
      "rubric_id": "schema_design",
      "rubric_type": "custom",
      "max_score": 30
    },
    {
      "rubric_id": "query_correctness",
      "rubric_type": "test_cases",
      "max_score": 40
    },
    {
      "rubric_id": "query_performance",
      "rubric_type": "performance_benchmark",
      "max_score": 30
    }
  ]
}
```

---

### `frontend`

**Description**: Frontend web applications

**Common Use Cases**:

- React/Vue/Angular applications
- Single-page applications (SPA)
- UI component libraries
- Responsive web design

**Recommended Rubrics**:

- `ui_functionality` (ui_test) - Feature implementation
- `ui_design` (manual) - Visual design and UX
- `responsive_design` (ui_test) - Mobile and tablet support
- `accessibility` (ui_test) - WCAG compliance
- `performance` (performance_benchmark) - Page load time
- `code_quality` (code_quality) - Component structure

**Example**:

```json
{
  "problem_id": "todo-app-react",
  "project_type": "frontend",
  "rubrics": [
    {
      "rubric_id": "ui_functionality",
      "rubric_type": "ui_test",
      "max_score": 40,
      "container": "ui-tester"
    },
    {
      "rubric_id": "responsive_design",
      "rubric_type": "ui_test",
      "max_score": 20,
      "container": "ui-tester"
    },
    {
      "rubric_id": "code_quality",
      "rubric_type": "code_quality",
      "max_score": 20,
      "container": "submission"
    }
  ]
}
```

---

### `fullstack`

**Description**: Full-stack web applications

**Common Use Cases**:

- MERN/MEAN stack applications
- Django/Flask + React applications
- Full-stack e-commerce sites
- Social media platforms

**Recommended Rubrics**:

- `frontend_functionality` (ui_test) - Frontend features
- `backend_functionality` (api_endpoints) - Backend API
- `integration` (integration_test) - Frontend-backend integration
- `database_design` (manual) - Data model
- `authentication` (security_scan) - User authentication
- `deployment` (custom) - Production readiness
- `code_quality` (code_quality) - Overall code quality

**Example**:

```json
{
  "problem_id": "social-media-app",
  "project_type": "fullstack",
  "rubrics": [
    {
      "rubric_id": "frontend_functionality",
      "rubric_type": "ui_test",
      "max_score": 20,
      "container": "ui-tester"
    },
    {
      "rubric_id": "backend_functionality",
      "rubric_type": "api_endpoints",
      "max_score": 20,
      "container": "api-tester"
    },
    {
      "rubric_id": "integration",
      "rubric_type": "integration_test",
      "max_score": 30,
      "container": "e2e-tester"
    },
    {
      "rubric_id": "authentication",
      "rubric_type": "security_scan",
      "max_score": 15,
      "container": "api-tester"
    },
    {
      "rubric_id": "code_quality",
      "rubric_type": "code_quality",
      "max_score": 15,
      "container": "submission"
    }
  ]
}
```

---

### `machine-learning`

**Description**: Machine learning and data science problems

**Common Use Cases**:

- Classification models
- Regression models
- Neural networks
- Data preprocessing and feature engineering

**Recommended Rubrics**:

- `model_accuracy` (ml_metrics) - Prediction accuracy
- `model_performance` (performance_benchmark) - Training and inference time
- `data_preprocessing` (manual) - Data cleaning and feature engineering
- `model_architecture` (manual) - Model design
- `code_quality` (code_quality) - Code organization

**Example**:

```json
{
  "problem_id": "image-classification",
  "project_type": "machine-learning",
  "rubrics": [
    {
      "rubric_id": "model_accuracy",
      "rubric_type": "ml_metrics",
      "max_score": 50
    },
    {
      "rubric_id": "model_performance",
      "rubric_type": "performance_benchmark",
      "max_score": 20
    },
    {
      "rubric_id": "code_quality",
      "rubric_type": "code_quality",
      "max_score": 30
    }
  ]
}
```

---

### `devops`

**Description**: DevOps, CI/CD, and infrastructure problems

**Common Use Cases**:

- Docker containerization
- Kubernetes deployment
- CI/CD pipeline configuration
- Infrastructure as Code (Terraform, Ansible)

**Recommended Rubrics**:

- `deployment` (custom) - Deployment success
- `configuration` (manual) - Config quality
- `automation` (custom) - Pipeline automation
- `security` (security_scan) - Security best practices
- `monitoring` (custom) - Logging and monitoring setup

**Example**:

```json
{
  "problem_id": "kubernetes-deployment",
  "project_type": "devops",
  "rubrics": [
    {
      "rubric_id": "deployment",
      "rubric_type": "custom",
      "max_score": 40
    },
    {
      "rubric_id": "configuration",
      "rubric_type": "custom",
      "max_score": 30
    },
    {
      "rubric_id": "security",
      "rubric_type": "security_scan",
      "max_score": 30
    }
  ]
}
```

---

### `security`

**Description**: Security and penetration testing problems

**Common Use Cases**:

- Vulnerability assessment
- Secure coding practices
- Cryptography implementation
- Security audits

**Recommended Rubrics**:

- `vulnerability_detection` (security_scan) - Security issues found
- `secure_coding` (code_quality) - Code security
- `penetration_testing` (security_scan) - Attack simulation
- `report_quality` (manual) - Security report

**Example**:

```json
{
  "problem_id": "web-app-security-audit",
  "project_type": "security",
  "rubrics": [
    {
      "rubric_id": "vulnerability_detection",
      "rubric_type": "security_scan",
      "max_score": 50
    },
    {
      "rubric_id": "report_quality",
      "rubric_type": "custom",
      "max_score": 30
    },
    {
      "rubric_id": "remediation",
      "rubric_type": "custom",
      "max_score": 20
    }
  ]
}
```

---

### `custom`

**Description**: Custom project type not covered by predefined types

**Common Use Cases**:

- Unique problem domains
- Specialized applications
- Research projects
- Experimental problems

**Recommended Rubrics**: Define based on problem requirements

**Example**:

```json
{
  "problem_id": "blockchain-implementation",
  "project_type": "custom",
  "rubrics": [
    {
      "rubric_id": "consensus_algorithm",
      "rubric_type": "custom",
      "max_score": 40
    },
    {
      "rubric_id": "transaction_handling",
      "rubric_type": "test_cases",
      "max_score": 30
    },
    {
      "rubric_id": "performance",
      "rubric_type": "performance_benchmark",
      "max_score": 30
    }
  ]
}
```

---

## Usage

### Specifying Project Type

In your problem's global `config.json`:

```json
{
  "problem_id": "my-problem",
  "problem_name": "My Problem",
  "project_type": "web-api",
  "containers": [...],
  "rubrics": [...]
}
```

### Custom Rubrics

You can customize the rubric list even when using a predefined project type:

```json
{
  "problem_id": "advanced-api",
  "project_type": "web-api",
  "rubrics": [
    {
      "rubric_id": "api_correctness",
      "rubric_type": "api_endpoints",
      "max_score": 30
    },
    {
      "rubric_id": "graphql_support",
      "rubric_type": "custom",
      "max_score": 20
    },
    {
      "rubric_id": "websocket_implementation",
      "rubric_type": "custom",
      "max_score": 20
    },
    {
      "rubric_id": "code_quality",
      "rubric_type": "code_quality",
      "max_score": 30
    }
  ]
}
```

---

## See Also

- [Rubric Types](rubric_types.md) - Detailed rubric type specifications
- [Problem Registration](../problems/POST_problems.md) - How to register problems
- [Rubric Mapping](rubrics/mapping.md) - Mapping rubrics to containers

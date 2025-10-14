# Rubric Types

This document describes the available rubric types and their test case formats.

**Related Documentation**:

- [`project_types.md`](project_types.md) - Project type specifications
- [`../problems/POST_problems.md`](../problems/POST_problems.md) - Problem registration
- [`rubrics/mapping.md`](rubrics/mapping.md) - Rubric-to-container mapping

---

## Overview

Rubric types define how submissions are evaluated. Each type has a specific test case format and output format. Hooks use these formats to evaluate submissions and write results.

---

## Rubric Output Format

All rubrics must write results to `/out/rubric_<rubric_id>.json` with this structure:

```json
{
  "rubric_id": "string (required)",
  "rubric_type": "string (required)",
  "max_score": "number (required)",
  "score": "number (required, 0 to max_score)",
  "status": "string (required) - 'DONE', 'SKIPPED', 'ERROR'",
  "message": "string (optional)",
  "details": "object (optional) - rubric-specific details",
  "timestamp": "string (optional) - ISO 8601 format"
}
```

**Status Values**:

- `DONE`: Evaluation completed successfully, all tests executed (either passed or failed) or score determined
- `SKIPPED`: Evaluation not performed (reserved for manual rubrics)
- `ERROR`: Evaluation failed due to system error, timeout, or critical failure

---

## Available Rubric Types

- `test_cases` - Predefined test case evaluation
- `api_endpoints` - REST API endpoint testing
- `performance_benchmark` - Performance measurement
- `code_quality` - Code style and quality analysis
- `security_scan` - Security vulnerability scanning
- `ui_test` - User interface testing
- `resource_usage` - Resource consumption monitoring
- `integration_test` - Multi-component integration testing
- `ml_metrics` - Machine learning model evaluation
- `manual` - Human evaluation (judgehost marks as SKIPPED)
- `custom` - Custom evaluation logic

### `test_cases`

**Description**: Evaluates submission against predefined test cases

**Use Cases**:

- Algorithm correctness
- Function output verification
- SQL query results

**Test Case Format**:

```json
{
  "test_cases": [
    {
      "id": "test_1",
      "name": "Basic test",
      "input": {
        "args": [1, 2, 3],
        "stdin": "optional stdin input"
      },
      "expected_output": {
        "stdout": "6",
        "return_value": 6
      },
      "weight": 1.0,
      "timeout_ms": 1000
    },
    {
      "id": "test_2",
      "name": "Edge case: empty array",
      "input": {
        "args": []
      },
      "expected_output": {
        "stdout": "0"
      },
      "weight": 1.5,
      "timeout_ms": 1000
    }
  ]
}
```

**Output Format**:

```json
{
  "rubric_id": "correctness",
  "rubric_type": "test_cases",
  "score": 45,
  "max_score": 50,
  "status": "DONE",
  "details": {
    "total_tests": 10,
    "passed_tests": 9,
    "failed_tests": 1,
    "test_results": [
      {
        "id": "test_1",
        "name": "Basic test",
        "passed": true,
        "execution_time_ms": 15,
        "score": 5
      },
      {
        "id": "test_2",
        "name": "Edge case",
        "passed": false,
        "expected": "0",
        "actual": "null",
        "execution_time_ms": 10,
        "score": 0
      }
    ]
  }
}
```

---

### `api_endpoints`

**Description**: Tests REST API endpoints

**Use Cases**:

- API correctness
- HTTP method support
- Request/response validation

**Test Case Format**:

```json
{
  "base_url": "http://submission:3000",
  "test_cases": [
    {
      "id": "test_get_users",
      "name": "GET /api/users",
      "method": "GET",
      "path": "/api/users",
      "headers": {
        "Accept": "application/json"
      },
      "expected_status": 200,
      "expected_schema": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "name", "email"]
        }
      },
      "weight": 1.0
    },
    {
      "id": "test_create_user",
      "name": "POST /api/users",
      "method": "POST",
      "path": "/api/users",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "expected_status": 201,
      "expected_schema": {
        "type": "object",
        "required": ["id", "name", "email"]
      },
      "weight": 1.5
    }
  ]
}
```

**Output Format**:

```json
{
  "rubric_id": "api_correctness",
  "rubric_type": "api_endpoints",
  "score": 38,
  "max_score": 40,
  "status": "DONE",
  "details": {
    "total_endpoints": 5,
    "passed_endpoints": 4,
    "failed_endpoints": 1,
    "endpoint_results": [
      {
        "id": "test_get_users",
        "name": "GET /api/users",
        "passed": true,
        "response_time_ms": 45,
        "status_code": 200,
        "score": 8
      },
      {
        "id": "test_create_user",
        "name": "POST /api/users",
        "passed": false,
        "response_time_ms": 52,
        "status_code": 400,
        "expected_status": 201,
        "error": "Missing required field: email",
        "score": 0
      }
    ]
  }
}
```

---

### `performance_benchmark`

**Description**: Measures performance metrics

**Use Cases**:

- Algorithm time complexity
- API response time
- Query performance

**Test Case Format**:

```json
{
  "benchmarks": [
    {
      "id": "bench_small_input",
      "name": "Small input (n=100)",
      "input_size": 100,
      "max_time_ms": 100,
      "iterations": 10,
      "weight": 1.0
    },
    {
      "id": "bench_large_input",
      "name": "Large input (n=10000)",
      "input_size": 10000,
      "max_time_ms": 1000,
      "iterations": 5,
      "weight": 2.0
    }
  ],
  "scoring": {
    "type": "threshold",
    "thresholds": [
      { "time_ms": 50, "score_percent": 100 },
      { "time_ms": 100, "score_percent": 80 },
      { "time_ms": 200, "score_percent": 60 },
      { "time_ms": 500, "score_percent": 40 }
    ]
  }
}
```

**Output Format**:

```json
{
  "rubric_id": "performance",
  "rubric_type": "performance_benchmark",
  "score": 18,
  "max_score": 20,
  "status": "DONE",
  "details": {
    "total_benchmarks": 3,
    "passed_benchmarks": 3,
    "benchmark_results": [
      {
        "id": "bench_small_input",
        "name": "Small input",
        "avg_time_ms": 45,
        "max_time_ms": 100,
        "within_threshold": true,
        "score": 6.7
      },
      {
        "id": "bench_large_input",
        "name": "Large input",
        "avg_time_ms": 850,
        "max_time_ms": 1000,
        "within_threshold": true,
        "score": 11.3
      }
    ]
  }
}
```

---

### `code_quality`

**Description**: Analyzes code quality and style

**Use Cases**:

- Code style compliance
- Code complexity
- Best practices

**Test Case Format**:

```json
{
  "linters": [
    {
      "name": "eslint",
      "config": "/data/eslintrc.json",
      "weight": 1.0
    },
    {
      "name": "complexity",
      "max_complexity": 10,
      "weight": 1.0
    }
  ],
  "scoring": {
    "type": "deductions",
    "max_score": 20,
    "deductions": {
      "error": 2,
      "warning": 0.5,
      "info": 0
    }
  }
}
```

**Output Format**:

```json
{
  "rubric_id": "code_quality",
  "rubric_type": "code_quality",
  "score": 17,
  "max_score": 20,
  "status": "DONE",
  "details": {
    "total_files": 15,
    "total_issues": 6,
    "errors": 1,
    "warnings": 4,
    "info": 1,
    "issues": [
      {
        "file": "src/index.js",
        "line": 42,
        "severity": "error",
        "rule": "no-unused-vars",
        "message": "Variable 'result' is declared but never used",
        "deduction": 2
      },
      {
        "file": "src/utils.js",
        "line": 15,
        "severity": "warning",
        "rule": "complexity",
        "message": "Function has complexity of 12",
        "deduction": 0.5
      }
    ]
  }
}
```

---

### `security_scan`

**Description**: Scans for security vulnerabilities

**Use Cases**:

- SQL injection detection
- XSS vulnerabilities
- Dependency vulnerabilities
- Authentication flaws

**Test Case Format**:

```json
{
  "scans": [
    {
      "type": "dependency_scan",
      "tool": "npm audit",
      "severity_levels": ["critical", "high", "medium"],
      "weight": 1.5
    },
    {
      "type": "static_analysis",
      "tool": "bandit",
      "config": "/data/bandit.yaml",
      "weight": 1.0
    },
    {
      "type": "penetration_test",
      "tests": [
        {
          "id": "sql_injection",
          "name": "SQL Injection Test",
          "payloads": ["' OR '1'='1", "'; DROP TABLE users--"]
        },
        {
          "id": "xss",
          "name": "XSS Test",
          "payloads": ["<script>alert('xss')</script>"]
        }
      ],
      "weight": 1.5
    }
  ],
  "scoring": {
    "type": "deductions",
    "max_score": 20,
    "deductions": {
      "critical": 5,
      "high": 3,
      "medium": 1,
      "low": 0
    }
  }
}
```

**Output Format**:

```json
{
  "rubric_id": "security",
  "rubric_type": "security_scan",
  "score": 15,
  "max_score": 20,
  "status": "DONE",
  "details": {
    "total_scans": 3,
    "total_vulnerabilities": 5,
    "critical": 0,
    "high": 1,
    "medium": 3,
    "low": 1,
    "vulnerabilities": [
      {
        "severity": "high",
        "type": "dependency",
        "package": "express",
        "version": "4.16.0",
        "vulnerability": "CVE-2022-24999",
        "description": "Cross-site Scripting vulnerability",
        "deduction": 3
      },
      {
        "severity": "medium",
        "type": "static_analysis",
        "file": "src/auth.js",
        "line": 25,
        "rule": "B201",
        "description": "Use of weak cryptographic key",
        "deduction": 1
      }
    ]
  }
}
```

---

### `ui_test`

**Description**: Tests UI functionality and appearance

**Use Cases**:

- UI component behavior
- User interaction flows
- Visual regression
- Responsive design

**Test Case Format**:

```json
{
  "base_url": "http://frontend:3000",
  "browser": "chromium",
  "viewport": {
    "width": 1280,
    "height": 720
  },
  "test_cases": [
    {
      "id": "test_login",
      "name": "User Login Flow",
      "steps": [
        {
          "action": "navigate",
          "url": "/login"
        },
        {
          "action": "fill",
          "selector": "#email",
          "value": "test@example.com"
        },
        {
          "action": "fill",
          "selector": "#password",
          "value": "password123"
        },
        {
          "action": "click",
          "selector": "#login-button"
        },
        {
          "action": "wait_for_navigation"
        },
        {
          "action": "assert_url",
          "expected": "/dashboard"
        },
        {
          "action": "assert_text",
          "selector": ".welcome-message",
          "expected": "Welcome, Test User"
        }
      ],
      "weight": 1.5
    },
    {
      "id": "test_responsive",
      "name": "Responsive Design",
      "viewports": [
        { "width": 375, "height": 667, "name": "Mobile" },
        { "width": 768, "height": 1024, "name": "Tablet" },
        { "width": 1920, "height": 1080, "name": "Desktop" }
      ],
      "steps": [
        {
          "action": "navigate",
          "url": "/"
        },
        {
          "action": "screenshot",
          "name": "homepage"
        },
        {
          "action": "assert_visible",
          "selector": ".navigation-menu"
        }
      ],
      "weight": 1.0
    }
  ]
}
```

**Output Format**:

```json
{
  "rubric_id": "ui_functionality",
  "rubric_type": "ui_test",
  "score": 35,
  "max_score": 40,
  "status": "DONE",
  "details": {
    "total_tests": 8,
    "passed_tests": 7,
    "failed_tests": 1,
    "test_results": [
      {
        "id": "test_login",
        "name": "User Login Flow",
        "passed": true,
        "execution_time_ms": 1250,
        "screenshot": "/out/artifacts/test_login.png",
        "score": 6
      },
      {
        "id": "test_responsive",
        "name": "Responsive Design",
        "passed": false,
        "step_failed": 4,
        "error": "Element .navigation-menu not visible on Mobile viewport",
        "screenshot": "/out/artifacts/test_responsive_mobile.png",
        "score": 0
      }
    ]
  }
}
```

---

### `resource_usage`

**Description**: Monitors resource consumption

**Use Cases**:

- Memory efficiency
- CPU usage
- Disk I/O
- Network usage

**Test Case Format**:

```json
{
  "monitoring": {
    "duration_seconds": 60,
    "interval_seconds": 5,
    "metrics": ["cpu", "memory", "disk", "network"]
  },
  "limits": {
    "memory_mb": 512,
    "cpu_percent": 80,
    "disk_read_mb": 100,
    "disk_write_mb": 50
  },
  "scoring": {
    "type": "efficiency",
    "max_score": 20,
    "memory_weight": 0.4,
    "cpu_weight": 0.4,
    "disk_weight": 0.2
  }
}
```

**Output Format**:

```json
{
  "rubric_id": "resource_efficiency",
  "rubric_type": "resource_usage",
  "score": 18,
  "max_score": 20,
  "status": "DONE",
  "details": {
    "duration_seconds": 60,
    "memory": {
      "peak_mb": 245,
      "average_mb": 198,
      "limit_mb": 512,
      "efficiency_percent": 52,
      "score": 7.5
    },
    "cpu": {
      "peak_percent": 65,
      "average_percent": 45,
      "limit_percent": 80,
      "efficiency_percent": 56,
      "score": 7.5
    },
    "disk": {
      "read_mb": 12,
      "write_mb": 8,
      "efficiency_percent": 80,
      "score": 3
    }
  }
}
```

---

### `integration_test`

**Description**: Tests integration between components

**Use Cases**:

- End-to-end testing
- Multi-service workflows
- Data flow validation

**Test Case Format**:

```json
{
  "test_cases": [
    {
      "id": "test_user_registration_flow",
      "name": "Complete User Registration",
      "steps": [
        {
          "service": "frontend",
          "action": "submit_form",
          "data": {
            "name": "John Doe",
            "email": "john@example.com"
          }
        },
        {
          "service": "backend",
          "action": "verify_api_call",
          "endpoint": "POST /api/users",
          "expected_status": 201
        },
        {
          "service": "database",
          "action": "verify_record",
          "table": "users",
          "where": {
            "email": "john@example.com"
          }
        },
        {
          "service": "backend",
          "action": "verify_email_sent",
          "to": "john@example.com",
          "subject": "Welcome"
        }
      ],
      "weight": 2.0
    }
  ]
}
```

**Output Format**:

```json
{
  "rubric_id": "integration",
  "rubric_type": "integration_test",
  "score": 28,
  "max_score": 30,
  "status": "DONE",
  "details": {
    "total_tests": 3,
    "passed_tests": 2,
    "failed_tests": 1,
    "test_results": [
      {
        "id": "test_user_registration_flow",
        "name": "Complete User Registration",
        "passed": true,
        "execution_time_ms": 2340,
        "steps_completed": 4,
        "steps_failed": 0,
        "score": 20
      }
    ]
  }
}
```

---

### `ml_metrics`

**Description**: Evaluates machine learning models

**Use Cases**:

- Classification accuracy
- Regression metrics
- Model performance

**Test Case Format**:

```json
{
  "task_type": "classification",
  "test_data": "/data/test_dataset.csv",
  "target_column": "label",
  "metrics": [
    {
      "name": "accuracy",
      "min_threshold": 0.85,
      "weight": 1.0
    },
    {
      "name": "f1_score",
      "min_threshold": 0.8,
      "weight": 1.0
    },
    {
      "name": "precision",
      "min_threshold": 0.82,
      "weight": 0.5
    },
    {
      "name": "recall",
      "min_threshold": 0.78,
      "weight": 0.5
    }
  ],
  "scoring": {
    "type": "weighted_average",
    "max_score": 50
  }
}
```

**Output Format**:

```json
{
  "rubric_id": "model_accuracy",
  "rubric_type": "ml_metrics",
  "score": 45,
  "max_score": 50,
  "status": "DONE",
  "details": {
    "task_type": "classification",
    "test_samples": 1000,
    "metrics": {
      "accuracy": {
        "value": 0.89,
        "threshold": 0.85,
        "passed": true,
        "score": 16.7
      },
      "f1_score": {
        "value": 0.84,
        "threshold": 0.8,
        "passed": true,
        "score": 16.7
      },
      "precision": {
        "value": 0.88,
        "threshold": 0.82,
        "passed": true,
        "score": 5.8
      },
      "recall": {
        "value": 0.81,
        "threshold": 0.78,
        "passed": true,
        "score": 5.8
      }
    },
    "confusion_matrix": [
      [850, 50],
      [100, 0]
    ]
  }
}
```

---

### `manual`

**Description**: Reserved for human evaluation by judges

**Use Cases**:

- Code style and readability (subjective assessment)
- Design decisions and architecture
- Documentation quality
- Creativity and innovation
- Presentation and communication skills

**Test Case Format**: Not applicable (handled by DOMServer)

**Output Format**: Judgehost will automatically create a result with `SKIPPED` status

```json
{
  "rubric_id": "code_review",
  "rubric_type": "manual",
  "score": 0,
  "max_score": 20,
  "status": "SKIPPED",
  "message": "Manual evaluation pending instructor review"
}
```

**Note**: The judgehost does not evaluate `manual` rubrics. These are automatically marked as `SKIPPED` and must be graded by judges through the DOMServer interface. The `SKIPPED` status is reserved exclusively for manual rubrics.

---

### `custom`

**Description**: Custom evaluation logic

**Use Cases**:

- Domain-specific evaluation
- Unique rubric requirements
- Custom scoring algorithms

**Test Case Format**: Flexible, defined by problem author

**Output Format**: Must follow standard rubric output format with `rubric_type: "custom"`

```json
{
  "rubric_id": "blockchain_consensus",
  "rubric_type": "custom",
  "score": 32,
  "max_score": 40,
  "status": "DONE",
  "details": {
    "consensus_reached": true,
    "blocks_validated": 95,
    "blocks_rejected": 5,
    "avg_confirmation_time_ms": 245
  }
}
```

---

## Creating Custom Rubric Types

For `custom` rubric types, the hook author has full control over test case format and evaluation logic:

1. **Define test case format** in `/data/rubric_<rubric_id>_tests.json`
2. **Implement evaluation logic** in hook script
3. **Write results** to `/out/rubric_<rubric_id>.json` following standard output format

**Example Custom Hook**:

```bash
#!/bin/bash
# hooks/post/evaluate_custom.sh

TEST_CASES="/data/rubric_consensus_tests.json"
OUTPUT="/out/rubric_blockchain_consensus.json"

# Custom evaluation logic
# ...

# Write result
cat > "$OUTPUT" << EOF
{
  "rubric_id": "blockchain_consensus",
  "rubric_type": "custom",
  "score": $SCORE,
  "max_score": 40,
  "status": "$STATUS",
  "details": {
    ...
  }
}
EOF
```

---

## See Also

- [Project Types](project_types.md) - Project type specifications and recommended rubrics
- [Rubric Mapping](rubrics/mapping.md) - Mapping rubrics to containers
- [Problem Registration](../problems/POST_problems.md) - How to register problems with rubrics

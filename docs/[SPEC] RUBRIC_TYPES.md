# Rubric Types Specification

This document defines the rubric types used for automated evaluation in the judgehost system.

---

## Overview

Rubric types define the evaluation method and expected output format for each rubric. The judgehost only supports **automated evaluation** - all rubrics must be evaluated by hooks and scripts without human intervention.

Each rubric type has:

- A standardized `details` field structure
- Specific evaluation criteria
- Expected output format from evaluation hooks

---

## Generic Rubric Type: `rubric_type`

The `rubric_type` field normalizes how evaluation results are reported across different kinds of tests.

### Common Structure

```json
{
  "rubric_id": "string",
  "rubric_name": "string",
  "rubric_type": "string",
  "score": "number",
  "max_score": "number",
  "percentage": "number",
  "weight": "number",
  "weighted_score": "number",
  "status": "passed | partial | failed | skipped",
  "details": {
    // Structure varies by rubric_type
  },
  "feedback": "string"
}
```

---

## Standard Rubric Types

### 1. `test_cases`

**Description**: Pass/fail tests with expected vs actual comparison.

**Use Cases**: Unit tests, integration tests, functional tests

**Details Structure**:

```json
{
  "rubric_type": "test_cases",
  "details": {
    "total": 20,
    "passed": 18,
    "failed": 2,
    "skipped": 0,
    "failures": [
      {
        "test_name": "string",
        "expected": "any",
        "actual": "any",
        "message": "string",
        "trace": "string (optional)"
      }
    ]
  }
}
```

**Example**:

```json
{
  "rubric_id": "functional_tests",
  "rubric_name": "Functional Correctness",
  "rubric_type": "test_cases",
  "score": 36.0,
  "max_score": 40.0,
  "percentage": 90.0,
  "status": "passed",
  "details": {
    "total": 20,
    "passed": 18,
    "failed": 2,
    "skipped": 0,
    "failures": [
      {
        "test_name": "test_delete_nonexistent_user",
        "expected": "404 Not Found",
        "actual": "500 Internal Server Error",
        "message": "Should return 404 for non-existent resource"
      },
      {
        "test_name": "test_invalid_input_validation",
        "expected": "400 Bad Request",
        "actual": "200 OK",
        "message": "Missing input validation"
      }
    ]
  },
  "feedback": "Most test cases passed. Fix error handling for edge cases."
}
```

---

### 2. `security_scan`

**Description**: Security vulnerability detection and compliance checks.

**Use Cases**: Dependency scanning, code analysis, configuration audits

**Details Structure**:

```json
{
  "rubric_type": "security_scan",
  "details": {
    "total": 15,
    "passed": 11,
    "failed": 4,
    "skipped": 0,
    "vulnerabilities": [
      {
        "severity": "critical | high | medium | low",
        "type": "string",
        "location": "string",
        "description": "string",
        "recommendation": "string",
        "cve": "string (optional)"
      }
    ],
    "summary": {
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 1
    }
  }
}
```

**Example**:

```json
{
  "rubric_id": "security",
  "rubric_name": "Security Assessment",
  "rubric_type": "security_scan",
  "score": 15.0,
  "max_score": 20.0,
  "percentage": 75.0,
  "status": "partial",
  "details": {
    "total": 15,
    "passed": 11,
    "failed": 4,
    "skipped": 0,
    "vulnerabilities": [
      {
        "severity": "high",
        "type": "SQL Injection",
        "location": "api/users.js:45",
        "description": "User input not sanitized before SQL query",
        "recommendation": "Use parameterized queries or an ORM"
      },
      {
        "severity": "medium",
        "type": "CORS Misconfiguration",
        "location": "app.js:12",
        "description": "CORS allows all origins (*)",
        "recommendation": "Restrict CORS to specific trusted domains"
      }
    ],
    "summary": {
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 1
    }
  },
  "feedback": "Address SQL injection vulnerability and tighten CORS policy."
}
```

---

### 3. `performance_benchmark`

**Description**: Performance and efficiency measurements.

**Use Cases**: Load testing, response time, throughput, resource efficiency

**Details Structure**:

```json
{
  "rubric_type": "performance_benchmark",
  "details": {
    "total": 10,
    "passed": 8,
    "failed": 2,
    "skipped": 0,
    "benchmarks": [
      {
        "name": "string",
        "measured_value": "number",
        "target_value": "number",
        "unit": "string",
        "passed": "boolean",
        "deviation_percent": "number (optional)"
      }
    ],
    "summary": {
      "avg_response_time_ms": "number (optional)",
      "throughput_rps": "number (optional)",
      "p50": "number (optional)",
      "p95": "number (optional)",
      "p99": "number (optional)"
    }
  }
}
```

**Example**:

```json
{
  "rubric_id": "performance",
  "rubric_name": "Performance & Efficiency",
  "rubric_type": "performance_benchmark",
  "score": 17.5,
  "max_score": 20.0,
  "percentage": 87.5,
  "status": "passed",
  "details": {
    "total": 10,
    "passed": 8,
    "failed": 2,
    "skipped": 0,
    "benchmarks": [
      {
        "name": "GET /users response time",
        "measured_value": 42,
        "target_value": 100,
        "unit": "ms",
        "passed": true,
        "deviation_percent": -58.0
      },
      {
        "name": "POST /users throughput",
        "measured_value": 245,
        "target_value": 200,
        "unit": "req/s",
        "passed": true,
        "deviation_percent": 22.5
      },
      {
        "name": "Complex query execution",
        "measured_value": 5200,
        "target_value": 1000,
        "unit": "ms",
        "passed": false,
        "deviation_percent": 420.0
      }
    ],
    "summary": {
      "avg_response_time_ms": 145,
      "throughput_rps": 245,
      "p50": 45,
      "p95": 320,
      "p99": 1200
    }
  },
  "feedback": "Good overall performance. Optimize complex queries."
}
```

---

### 4. `code_quality`

**Description**: Code quality metrics and style compliance.

**Use Cases**: Linting, code coverage, complexity analysis, style checks

**Details Structure**:

```json
{
  "rubric_type": "code_quality",
  "details": {
    "total": 8,
    "passed": 7,
    "failed": 1,
    "skipped": 0,
    "metrics": {
      "linting_errors": "number",
      "linting_warnings": "number",
      "code_coverage_percent": "number",
      "maintainability_index": "number",
      "cyclomatic_complexity_avg": "number",
      "cyclomatic_complexity_max": "number",
      "code_smells": "number"
    },
    "issues": [
      {
        "type": "error | warning | info",
        "rule": "string",
        "location": "string",
        "message": "string"
      }
    ]
  }
}
```

**Example**:

```json
{
  "rubric_id": "code_quality",
  "rubric_name": "Code Quality & Style",
  "rubric_type": "code_quality",
  "score": 18.0,
  "max_score": 20.0,
  "percentage": 90.0,
  "status": "passed",
  "details": {
    "total": 8,
    "passed": 7,
    "failed": 1,
    "skipped": 0,
    "metrics": {
      "linting_errors": 0,
      "linting_warnings": 5,
      "code_coverage_percent": 85.5,
      "maintainability_index": 78,
      "cyclomatic_complexity_avg": 4.2,
      "cyclomatic_complexity_max": 12,
      "code_smells": 3
    },
    "issues": [
      {
        "type": "warning",
        "rule": "complexity",
        "location": "utils/validator.js:23",
        "message": "Function has complexity of 12, consider refactoring"
      }
    ]
  },
  "feedback": "Well-written code with good test coverage. Minor complexity issues."
}
```

---

### 5. `output_validation`

**Description**: Output format and correctness validation.

**Use Cases**: CLI output, file generation, data format validation

**Details Structure**:

```json
{
  "rubric_type": "output_validation",
  "details": {
    "total": 12,
    "passed": 11,
    "failed": 1,
    "skipped": 0,
    "validations": [
      {
        "name": "string",
        "type": "format | content | structure",
        "passed": "boolean",
        "expected": "string (optional)",
        "actual": "string (optional)",
        "message": "string"
      }
    ]
  }
}
```

**Example**:

```json
{
  "rubric_id": "output_format",
  "rubric_name": "Output Format Validation",
  "rubric_type": "output_validation",
  "score": 18.3,
  "max_score": 20.0,
  "percentage": 91.5,
  "status": "passed",
  "details": {
    "total": 12,
    "passed": 11,
    "failed": 1,
    "skipped": 0,
    "validations": [
      {
        "name": "JSON structure",
        "type": "structure",
        "passed": true,
        "message": "Valid JSON format"
      },
      {
        "name": "Required fields present",
        "type": "content",
        "passed": true,
        "message": "All required fields found"
      },
      {
        "name": "Date format",
        "type": "format",
        "passed": false,
        "expected": "ISO 8601",
        "actual": "MM/DD/YYYY",
        "message": "Date should be in ISO 8601 format"
      }
    ]
  },
  "feedback": "Output mostly correct. Use ISO 8601 for dates."
}
```

---

### 6. `api_endpoints`

**Description**: API endpoint functionality and contract validation.

**Use Cases**: REST API testing, GraphQL query validation, endpoint compliance

**Details Structure**:

```json
{
  "rubric_type": "api_endpoints",
  "details": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0,
    "endpoints": [
      {
        "method": "GET | POST | PUT | DELETE | PATCH",
        "path": "string",
        "status": "passed | failed",
        "status_code_expected": "number",
        "status_code_actual": "number",
        "response_time_ms": "number",
        "issues": ["string"]
      }
    ]
  }
}
```

**Example**:

```json
{
  "rubric_id": "api_correctness",
  "rubric_name": "API Endpoint Correctness",
  "rubric_type": "api_endpoints",
  "score": 38.0,
  "max_score": 40.0,
  "percentage": 95.0,
  "status": "passed",
  "details": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0,
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/users",
        "status": "passed",
        "status_code_expected": 200,
        "status_code_actual": 200,
        "response_time_ms": 42
      },
      {
        "method": "DELETE",
        "path": "/api/users/invalid-id",
        "status": "failed",
        "status_code_expected": 404,
        "status_code_actual": 500,
        "response_time_ms": 15,
        "issues": ["Should return 404 for invalid ID"]
      }
    ]
  },
  "feedback": "API endpoints mostly working. Fix error handling."
}
```

---

### 7. `database_validation`

**Description**: Database schema, query, and data integrity validation.

**Use Cases**: Schema design, normalization, query performance, data integrity

**Details Structure**:

```json
{
  "rubric_type": "database_validation",
  "details": {
    "total": 15,
    "passed": 13,
    "failed": 2,
    "skipped": 0,
    "validations": [
      {
        "category": "schema | normalization | constraints | performance",
        "name": "string",
        "passed": "boolean",
        "message": "string",
        "severity": "error | warning | info"
      }
    ],
    "schema_issues": ["string"],
    "performance_issues": ["string"]
  }
}
```

**Example**:

```json
{
  "rubric_id": "database_design",
  "rubric_name": "Database Design & Performance",
  "rubric_type": "database_validation",
  "score": 17.3,
  "max_score": 20.0,
  "percentage": 86.5,
  "status": "passed",
  "details": {
    "total": 15,
    "passed": 13,
    "failed": 2,
    "skipped": 0,
    "validations": [
      {
        "category": "schema",
        "name": "Foreign key constraints",
        "passed": true,
        "message": "All foreign keys properly defined",
        "severity": "info"
      },
      {
        "category": "performance",
        "name": "Index on frequently queried column",
        "passed": false,
        "message": "Missing index on users.email column",
        "severity": "warning"
      },
      {
        "category": "normalization",
        "name": "3NF compliance",
        "passed": false,
        "message": "Address fields should be in separate table",
        "severity": "error"
      }
    ],
    "schema_issues": ["Address denormalization"],
    "performance_issues": ["Missing index on email column"]
  },
  "feedback": "Good schema design. Add index and normalize address data."
}
```

---

### 8. `ui_tests`

**Description**: User interface functionality and visual testing.

**Use Cases**: Browser automation, UI component testing, visual regression

**Details Structure**:

```json
{
  "rubric_type": "ui_tests",
  "details": {
    "total": 18,
    "passed": 16,
    "failed": 2,
    "skipped": 0,
    "tests": [
      {
        "name": "string",
        "type": "functional | visual | accessibility",
        "passed": "boolean",
        "message": "string",
        "screenshot_url": "string (optional)"
      }
    ],
    "accessibility_score": "number (0-100, optional)"
  }
}
```

**Example**:

```json
{
  "rubric_id": "ui_functionality",
  "rubric_name": "UI Functionality",
  "rubric_type": "ui_tests",
  "score": 17.8,
  "max_score": 20.0,
  "percentage": 89.0,
  "status": "passed",
  "details": {
    "total": 18,
    "passed": 16,
    "failed": 2,
    "skipped": 0,
    "tests": [
      {
        "name": "Login form submission",
        "type": "functional",
        "passed": true,
        "message": "Form submits correctly with valid data"
      },
      {
        "name": "Responsive layout on mobile",
        "type": "visual",
        "passed": false,
        "message": "Navigation menu overlaps content on 375px width",
        "screenshot_url": "/artifacts/sub_123/screenshots/mobile-layout.png"
      },
      {
        "name": "Keyboard navigation",
        "type": "accessibility",
        "passed": false,
        "message": "Some buttons not reachable via Tab key"
      }
    ],
    "accessibility_score": 82
  },
  "feedback": "UI mostly functional. Fix mobile layout and keyboard navigation."
}
```

---

### 9. `coverage_metrics`

**Description**: Test coverage and code execution analysis.

**Use Cases**: Line coverage, branch coverage, statement coverage

**Details Structure**:

```json
{
  "rubric_type": "coverage_metrics",
  "details": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0,
    "coverage": {
      "line_percent": "number",
      "branch_percent": "number",
      "function_percent": "number",
      "statement_percent": "number"
    },
    "thresholds": {
      "line_threshold": "number",
      "branch_threshold": "number",
      "function_threshold": "number",
      "statement_threshold": "number"
    },
    "uncovered_files": ["string"]
  }
}
```

---

### 10. `custom`

**Description**: Custom rubric type for specialized evaluation.

**Use Cases**: Non-standard evaluation criteria

**Details Structure**:

```json
{
  "rubric_type": "custom",
  "custom_type_name": "string",
  "details": {
    // Flexible structure defined by problem creator
    "total": "number",
    "passed": "number",
    "failed": "number",
    "skipped": "number"
    // ... custom fields
  }
}
```

---

## Rubric Status Values

- `passed` - All or most criteria met (typically >= 90%)
- `partial` - Some criteria met (typically 50-89%)
- `failed` - Few or no criteria met (typically < 50%)
- `skipped` - Rubric evaluation was not performed (dependency failed)

---

## Hook Output Format

Evaluation hooks must output results in JSON format to `/out/rubric_<rubric_id>.json`:

```json
{
  "rubric_id": "api_correctness",
  "rubric_type": "api_endpoints",
  "score": 38.0,
  "status": "passed",
  "details": {
    // Type-specific details structure
  },
  "feedback": "Optional human-readable feedback"
}
```

---

## Best Practices

1. **Use appropriate rubric types** - Choose the type that best matches your evaluation method
2. **Standardize details** - Follow the documented structure for `details` field
3. **Provide feedback** - Include actionable feedback in the `feedback` field
4. **Report all attempts** - Include both passed and failed items in details
5. **Use severity levels** - For security_scan, use appropriate severity levels
6. **Include context** - Provide file locations, line numbers when applicable

---

## See Also

- [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) - Project type definitions
- [`[API] GET_RESULT.md`](%5BAPI%5D%20GET_RESULT.md) - Result retrieval API
- [`[GUIDE] WRITING_HOOKS.md`](%5BGUIDE%5D%20WRITING_HOOKS.md) - Guide for writing evaluation hooks

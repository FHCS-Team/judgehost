## Multi-Container Problem Support (Latest)

### Major Features Added

#### 1. Multi-Container Architecture

- Support for problems with multiple interconnected containers
- Define frontend, backend, database, cache, and test containers
- Automatic dependency ordering and health checks
- Network isolation between submissions

#### 2. Multiple Submission Packages

- Accept and process multiple code packages in a single submission
- Map each package to its target container
- New API endpoint: `POST /api/submissions/multi`

#### 3. Parameterized Container Builds

- New `containerBuilder` module replaces hard-coded build logic (npm install)
- Configurable build steps (run, copy, env, workdir, expose, etc.)
- Support for multiple languages and frameworks
- Common build patterns provided

#### 4. Container Orchestration

- Container group creation and management
- Topological sorting based on dependencies
- Per-container resource limits and health monitoring

See `docs/[GUIDE] MULTI_CONTAINER_SUPPORT.md` for complete documentation.

---

## API Changes for Custom Judgehost Implementation

This document outlines the changes required to adapt the original DOMjudge judgehost API for our custom container-based evaluation system.

### 1. Endpoints to Retain (with minimal changes)

- **GET /config**  
  _Reusable as-is_ - We'll continue to fetch configuration from the DOMserver.

- **POST /judgehosts (registration)**  
  _Reusable as-is_ - The registration flow can be maintained for compatibility.

- **POST /judgehosts/internal-error**  
  _Reusable as-is_ - Error reporting remains valuable.

- **GET /judgehosts/get_files/source/{submitid}**  
  _Minor changes_ - We'll need this to retrieve submitted source files, but may need to handle Git repositories in addition to regular files.

### 2. Endpoints Requiring Significant Modification

- **POST /judgehosts/fetch-work**  
  _Major changes_ - Need to modify response handling to support our container-based workflow. The judgeTask structure needs to include project type, resource limits, and hook information.

  ```json
  {
    "type": "project_evaluation",
    "submitid": "12345",
    "judgetaskid": 6789,
    "project_type": "web_api",
    "submission_url": "https://github.com/team/project",
    "resource_limits": {
      "memory": 1024,
      "cpu": 2,
      "network_enabled": true
    }
  }
  ```

- **PUT /judgehosts/update-judging/{hostname}/{judgetaskid}**  
  _Major changes_ - The payload needs to include rubric/criteria evaluation results instead of simple compile success/failure:

  ```
  deployment_success=1
  rubric_api_correctness=23
  rubric_performance=15
  rubric_security=1
  output_logs=<base64-encoded logs>
  ```

- **POST /judgehosts/add-judging-run/{hostname}/{judgetaskid}**  
  _Major changes_ - We need to adapt this to report complex project evaluation results rather than single test runs:

  ```
  result=evaluated
  metrics=<base64-encoded JSON metrics>
  logs=<base64-encoded logs>
  output_artifacts=<base64-encoded archive of relevant outputs>
  rubric_scores=<base64-encoded JSON of rubric scores>
  ```

### 3. Endpoints to Replace or Remove

- **GET /languages**  
  _Remove_ - Not needed for project evaluation where we're not compiling code directly.

- **GET /judgehosts/get_files/{type}/{execid}**  
  _Replace_ - Instead of executables, we need to retrieve problem packages with hooks:

  ```
  GET /judgehosts/get_problem_package/{problemid}
  ```

- **GET /judgehosts/get_files/testcase/{testcase_id}**  
  _Replace_ - We'll need a different endpoint for retrieving evaluation resources:

  ```
  GET /judgehosts/get_problem_resources/{problemid}
  ```

- **GET /judgehosts/get_version_commands/{judgetaskid}**  
  _Remove_ - Not directly applicable to our container evaluation approach.

- **PUT /judgehosts/check_versions/{judgetaskid}**  
  _Remove_ - Not directly applicable to our container evaluation approach.

### 4. New Endpoints to Implement

- **GET /judgehosts/get_problem_package/{problemid}**  
  Retrieves the full problem package including hooks, resources, and configuration.

  Response:

  ```json
  {
    "problem_id": "123",
    "project_type": "web_api",
    "files": [
      {
        "filename": "hooks/pre/setup.sh",
        "content": "base64-encoded-content",
        "is_executable": true
      },
      {
        "filename": "hooks/post/evaluate.sh",
        "content": "base64-encoded-content",
        "is_executable": true
      },
      {
        "filename": "resources/test_data.json",
        "content": "base64-encoded-content"
      },
      {
        "filename": "Dockerfile",
        "content": "base64-encoded-content"
      }
    ],
    "rubrics": [
      { "id": "api_correctness", "max_score": 25 },
      { "id": "performance", "max_score": 15 },
      { "id": "security", "max_score": 10 }
    ],
    "config": {
      "memory_limit": 1024,
      "cpu_limit": 2,
      "network_enabled": true,
      "evaluation_timeout": 600
    }
  }
  ```

- **POST /judgehosts/update_status/{hostname}/{judgetaskid}**  
  Reports interim status during long-running evaluations:

  ```
  status=running
  progress=75
  current_stage=performance_testing
  message=Running performance tests 3/4
  ```

### 5. API Contract Modifications

1. **Authentication & Retry Logic**  
   _Retain_ - We'll keep the authentication approach and retry logic with exponential backoff.

2. **Base64 Encoding**  
   _Retain_ - We'll continue to use base64 encoding for file content transfer.

3. **Result Format**  
   _Major changes_ - Our result format will need to include:

   - Rubric scores
   - Performance metrics
   - Log outputs
   - Evaluation artifacts

4. **Container Image Caching**  
   _New_ - We'll need to add a mechanism to report/track built Docker images for problems to avoid rebuilding.

### 6. Implementation Impact

1. The judgehost will need to maintain compatibility with original DOMjudge API endpoints while adding extensions for container-based evaluation.

2. We'll need to implement translation layers that map between the original API contracts and our container evaluation workflow.

3. The DOMserver will need corresponding changes to handle our extended result formats and problem packages.

4. We should implement versioning in our API requests to allow gradual migration and backward compatibility.

### 7. Migration Path

1. First, implement the core judgehost functionality using the original endpoints where possible.

2. Add new endpoints for container-specific functionality.

3. Extend existing endpoints to handle our additional data formats.

4. Ensure the DOMserver can handle both traditional code evaluation and our new project evaluation formats.

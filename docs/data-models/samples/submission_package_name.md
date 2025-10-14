# Submission Package Structure

This document provides a visual overview of the submission package file structure.

**Related Documentation**:

- [`../../submissions/POST_submissions.md`](../../submissions/POST_submissions.md) - Submission API
- [`../containers/resources.md`](../containers/resources.md) - Resource mounting details
- [`problem_package_name.md`](problem_package_name.md) - Problem package structure

---

## Overview

A submission package is a `.tar.gz` or `.zip` archive containing submission code that will be evaluated against a problem.

Key characteristics:

- **Language-agnostic**: Can contain any project type (Python, Node.js, Java, etc.)
- **Mounted to containers**: Injected into containers with `accepts_submission: true`
- **Flexible mounting**: Mounted to path specified by problem's `submission_mounts` configuration

---

## File Structure

A submission package contains a directory with all submission files:

```
submission.tar.gz
└── submission/
    ├── package.json                # Project metadata (if applicable)
    ├── src/                        # Source code
    │   ├── index.js                # Entry point
    │   ├── routes/
    │   │   ├── users.js
    │   │   └── posts.js
    │   ├── models/
    │   │   ├── User.js
    │   │   └── Post.js
    │   └── utils/
    │       └── validation.js
    ├── tests/                      # submission's own tests (optional)
    │   └── api.test.js
    └── README.md                   # Documentation (optional)
```

The entire `submission/` directory is mounted to the container at the location specified by the problem.

---

## Example: Node.js REST API Submission

```
rest-api-submission.tar.gz
└── submission/
    ├── package.json                # Dependencies and scripts
    ├── package-lock.json           # Lock file
    ├── .gitignore                  # Git ignore (optional)
    ├── .env.example                # Environment variables template
    ├── src/
    │   ├── index.js                # Main entry point (starts server)
    │   ├── app.js                  # Express app setup
    │   ├── routes/
    │   │   ├── index.js            # Route index
    │   │   ├── users.js            # User routes
    │   │   └── auth.js             # Auth routes
    │   ├── controllers/
    │   │   ├── userController.js
    │   │   └── authController.js
    │   ├── models/
    │   │   ├── User.js
    │   │   └── Session.js
    │   ├── middleware/
    │   │   ├── auth.js
    │   │   └── errorHandler.js
    │   ├── utils/
    │   │   ├── validation.js
    │   │   └── database.js
    │   └── config/
    │       └── database.js
    ├── tests/                      # Optional submission tests
    │   ├── setup.js
    │   ├── users.test.js
    │   └── auth.test.js
    └── README.md
```

---

## Example: Python Flask API Submission

```
flask-api-submission.tar.gz
└── submission/
    ├── requirements.txt            # Python dependencies
    ├── .env.example
    ├── app.py                      # Main entry point
    ├── config.py                   # Configuration
    ├── models/
    │   ├── __init__.py
    │   ├── user.py
    │   └── post.py
    ├── routes/
    │   ├── __init__.py
    │   ├── users.py
    │   └── posts.py
    ├── utils/
    │   ├── __init__.py
    │   ├── validation.py
    │   └── database.py
    ├── tests/                      # Optional submission tests
    │   ├── __init__.py
    │   ├── test_users.py
    │   └── test_posts.py
    └── README.md
```

---

## Example: Java Spring Boot API Submission

```
spring-api-submission.tar.gz
└── submission/
    ├── pom.xml                     # Maven configuration
    ├── .gitignore
    ├── src/
    │   ├── main/
    │   │   ├── java/
    │   │   │   └── com/
    │   │   │       └── example/
    │   │   │           └── api/
    │   │   │               ├── ApiApplication.java
    │   │   │               ├── controllers/
    │   │   │               │   ├── UserController.java
    │   │   │               │   └── PostController.java
    │   │   │               ├── models/
    │   │   │               │   ├── User.java
    │   │   │               │   └── Post.java
    │   │   │               ├── repositories/
    │   │   │               │   ├── UserRepository.java
    │   │   │               │   └── PostRepository.java
    │   │   │               └── services/
    │   │   │                   ├── UserService.java
    │   │   │                   └── PostService.java
    │   │   └── resources/
    │   │       ├── application.properties
    │   │       └── application.yml
    │   └── test/
    │       └── java/
    │           └── com/
    │               └── example/
    │                   └── api/
    │                       ├── UserControllerTest.java
    │                       └── PostControllerTest.java
    └── README.md
```

---

## Example: Full-Stack Application Submission

```
fullstack-submission.tar.gz
└── submission/
    ├── package.json                # Root package.json
    ├── .gitignore
    ├── docker-compose.yml          # Optional: submission's own compose
    ├── frontend/
    │   ├── package.json
    │   ├── public/
    │   │   ├── index.html
    │   │   └── favicon.ico
    │   ├── src/
    │   │   ├── App.js
    │   │   ├── index.js
    │   │   ├── components/
    │   │   │   ├── UserList.js
    │   │   │   ├── UserForm.js
    │   │   │   └── Header.js
    │   │   ├── services/
    │   │   │   └── api.js
    │   │   └── styles/
    │   │       └── App.css
    │   └── README.md
    ├── backend/
    │   ├── package.json
    │   ├── src/
    │   │   ├── index.js
    │   │   ├── routes/
    │   │   │   └── users.js
    │   │   ├── models/
    │   │   │   └── User.js
    │   │   └── controllers/
    │   │       └── userController.js
    │   └── README.md
    └── README.md
```

---

## Submission Mounting Mechanism

### Mounting Format

Submissions are mounted using the format: **`<container-id>:<path>`**

Defined in the problem's global `config.json`:

```json
{
  "problem_id": "rest-api-users",
  "submission_mounts": {
    "submission": "/workspace/src",
    "frontend": "/app/src"
  }
}
```

This configuration means:

- In the `submission` container: submission mounted to `/workspace/src`
- In the `frontend` container: submission mounted to `/app/src`

### Container Filesystem After Mounting

**Example: Node.js API submission mounted to `/workspace/src`**

```
Container Filesystem:
/
├── app/
│   └── node_modules/           # Dependencies installed in Stage 1
│       ├── express/
│       ├── mongoose/
│       └── ...
├── workspace/
│   └── src/                    # Submission mounted here
│       ├── index.js            # Can require('express'), require('mongoose')
│       ├── routes/
│       │   └── users.js
│       └── models/
│           └── User.js
├── hooks/                      # Problem hooks
├── data/                       # Problem test data
├── out/                        # Output directory for results
└── tmp/                        # Temporary files
```

**Key points**:

- Submission is mounted to the path specified in `submission_mounts`
- Submission code can access dependencies installed in Stage 1
- Problem author chooses where to mount based on dependency locations
- Different containers can mount submission to different paths

### Why Mounting Path Matters

The mounting path must be chosen so submission code can access installed dependencies:

**Good example** (Node.js):

```dockerfile
# Stage 1: Install dependencies
WORKDIR /app
COPY package.json .
RUN npm install

# Stage 2: Submission mounted to /workspace/src
# submission code: require('express') → finds /app/node_modules/express
```

**Good example** (Python):

```dockerfile
# Stage 1: Install packages
RUN pip install flask sqlalchemy

# Stage 2: Submission mounted to /workspace/src
# submission code: import flask → finds system packages
```

---

## Submission Requirements

### General Requirements

1. **Archive format**: `.tar.gz` or `.zip`
2. **Size limit**: Typically 50MB (configurable)
3. **No absolute paths**: All paths must be relative
4. **No symlinks**: Symbolic links are not allowed
5. **Text encoding**: UTF-8 recommended

### Project-Specific Requirements

Different problems may require specific files or structure:

#### Node.js API Problem

```
Required:
- package.json (with "start" script)
- src/index.js or index.js (entry point)

Optional:
- .env.example
- README.md
- tests/
```

#### Python Script Problem

```
Required:
- main.py or solution.py (entry point)
- requirements.txt (if dependencies needed)

Optional:
- README.md
- tests/
```

#### Database Design Problem

```
Required:
- schema.sql (database schema)

Optional:
- seed.sql (test data)
- migrations/
- README.md
```

---

## Best Practices

### For submissions

1. **Include dependency manifests**: `package.json`, `requirements.txt`, `pom.xml`, etc.
2. **Provide clear entry point**: Problem should know how to start your application
3. **Follow problem requirements**: Check problem description for required files and structure
4. **Test locally first**: Verify your code works before submitting
5. **Include README**: Document any special setup or requirements
6. **Avoid hardcoded paths**: Use relative paths only
7. **Don't include installed dependencies**: Exclude `node_modules/`, `__pycache__/`, `target/`, etc.
8. **Keep submission focused**: Only include source code and necessary files

### Directory Structure Tips

```
✅ Good:
submission/
├── src/
│   └── index.js
└── package.json

❌ Bad:
submission/
├── /home/submission/project/src/  # Absolute paths
│   └── index.js
└── package.json
```

---

## Security Considerations

### What submissions Should NOT Include

- **Secrets**: API keys, passwords, tokens (use `.env.example` instead)
- **Personal information**: Email addresses, submission IDs in code
- **Copyrighted code**: Unlicensed third-party code
- **Malicious code**: Code that attempts to escape sandbox or harm system
- **Build artifacts**: Compiled binaries, `node_modules/`, etc.

### What Judgehost Checks

- File size limits
- Archive structure validation
- Malicious file patterns
- Resource limits during execution

---

## Submission Lifecycle

1. **Upload**: submission uploads submission package
2. **Validation**: Judgehost validates archive structure
3. **Storage**: Package stored with unique submission ID
4. **Queuing**: Submission queued for evaluation
5. **Extraction**: Package extracted to temporary directory
6. **Mounting**: Contents mounted to container at path specified by problem
7. **Evaluation**: Problem hooks evaluate the submission
8. **Cleanup**: Temporary files removed after evaluation

---

## See Also

- [Submission API](../../submissions/POST_submissions.md)
- [Problem Package Structure](problem_package_name.md)
- [Resource Mounting Details](../containers/resources.md)
- [Rubric Evaluation](../rubrics/mapping.md)

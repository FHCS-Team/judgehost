# REST API - User Management

## Problem Description

Build a REST API for user management with full CRUD (Create, Read, Update, Delete) operations. Your API should connect to a PostgreSQL database and handle user data with proper validation and error handling.

## Requirements

### Database Schema

Your API must work with this PostgreSQL schema:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

Implement the following endpoints:

#### 1. Health Check

- **GET** `/health`
- Returns status 200 with any message
- Used to verify the API is running

#### 2. List All Users

- **GET** `/api/users`
- Returns array of all users
- Status: 200

#### 3. Get User by ID

- **GET** `/api/users/:id`
- Returns single user object
- Status: 200 if found, 404 if not found

#### 4. Create User

- **POST** `/api/users`
- Body: `{ "name": string, "email": string, "age": number }`
- Returns created user with ID
- Status: 201

#### 5. Update User

- **PUT** `/api/users/:id`
- Body: `{ "name": string, "email": string, "age": number }`
- Returns updated user
- Status: 200 if found, 404 if not found

#### 6. Delete User

- **DELETE** `/api/users/:id`
- Deletes the user
- Status: 200 or 204

## Environment Variables

Your application will have access to these environment variables:

```bash
DATABASE_URL=postgresql://testuser:testpass@database:5432/usersdb
PORT=3000
NODE_ENV=production
```

## Project Structure

Your submission should follow this structure:

```
submission/
├── package.json          # Dependencies
├── index.js or server.js # Main entry point
├── routes/               # API routes (optional)
└── db.js                 # Database connection (optional)
```

## Submission Format

### package.json

```json
{
  "name": "user-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "body-parser": "^1.20.2"
  }
}
```

### index.js (Example Structure)

```javascript
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// GET /api/users - List all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - Get specific user
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users - Create new user
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, age } = req.body;
    const result = await pool.query(
      "INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *",
      [name, email, age]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/users/:id - Update user
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age } = req.body;
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, age = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [name, email, age, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## Evaluation Criteria

### API Endpoints (60 points)

- Health check (5 points)
- GET /api/users - List all (10 points)
- GET /api/users/:id - Get one (10 points)
- POST /api/users - Create (15 points)
- PUT /api/users/:id - Update (10 points)
- DELETE /api/users/:id - Delete (10 points)

### Code Quality (20 points)

- Code style and formatting
- Proper error handling
- No unused variables
- Follows best practices

### Security (20 points)

- No hardcoded credentials
- Proper input validation
- No SQL injection vulnerabilities
- No use of dangerous functions (eval)
- Dependency vulnerabilities check

**Total: 100 points**

## Time and Resource Limits

- **Time limit:** 300 seconds (5 minutes)
- **Memory limit:** 1GB total
- **Network:** Internal only (can communicate with database)

## Testing Locally

Before submitting, test your API:

```bash
# Start your server
npm start

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/users
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","age":30}'
```

## Tips

1. **Database Connection**

   - Use connection pooling for better performance
   - Handle connection errors gracefully

2. **Error Handling**

   - Return proper HTTP status codes
   - Provide meaningful error messages
   - Catch and handle database errors

3. **Validation**

   - Validate required fields
   - Check email format
   - Handle duplicate emails

4. **Testing**
   - Test all CRUD operations
   - Verify 404 responses for missing resources
   - Ensure health check works

## Common Issues

- **Connection Refused:** Make sure your server listens on `0.0.0.0:3000`, not `localhost:3000`
- **Database Errors:** Check your SQL queries and parameter binding
- **Port Already in Use:** The PORT environment variable is set to 3000
- **Health Check Fails:** Implement `/health` endpoint that returns 200

## Sample Database

The database starts with 3 users:

- Alice Johnson (alice@example.com, age 28)
- Bob Smith (bob@example.com, age 35)
- Charlie Brown (charlie@example.com, age 42)

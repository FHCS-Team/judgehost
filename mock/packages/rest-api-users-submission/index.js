const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// GET /api/users - List all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id - Get specific user
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users - Create new user
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, age } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    if (age && (isNaN(age) || age < 0 || age > 150)) {
      return res.status(400).json({ error: "Invalid age" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const result = await pool.query(
      "INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *",
      [name, email, age || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/users/:id - Update user
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age } = req.body;

    // Validate ID
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Validation
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    if (age && (isNaN(age) || age < 0 || age > 150)) {
      return res.status(400).json({ error: "Invalid age" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, age = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
      [name, email, age || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/users/:id - Delete user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User deleted successfully", user: result.rows[0] });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`User Management API listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(
    `Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  pool.end();
  process.exit(0);
});

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// In-memory data store
let todos = [];
let nextId = 1;

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get all todos
app.get("/api/todos", (req, res) => {
  res.json({
    success: true,
    data: todos,
  });
});

// Get a specific todo
app.get("/api/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: "Todo not found",
    });
  }

  res.json({
    success: true,
    data: todo,
  });
});

// Create a new todo
app.post("/api/todos", (req, res) => {
  const { title, description, completed } = req.body;

  // Validation
  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Title is required and must be a non-empty string",
    });
  }

  const newTodo = {
    id: String(nextId++),
    title: title.trim(),
    description: description || "",
    completed: completed === true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  todos.push(newTodo);

  res.status(201).json({
    success: true,
    data: newTodo,
  });
});

// Update a todo
app.put("/api/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: "Todo not found",
    });
  }

  const { title, description, completed } = req.body;

  // Update fields if provided
  if (title !== undefined) {
    if (typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Title must be a non-empty string",
      });
    }
    todo.title = title.trim();
  }

  if (description !== undefined) {
    todo.description = description;
  }

  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "Completed must be a boolean",
      });
    }
    todo.completed = completed;
  }

  todo.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    data: todo,
  });
});

// Delete a todo
app.delete("/api/todos/:id", (req, res) => {
  const index = todos.findIndex((t) => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Todo not found",
    });
  }

  todos.splice(index, 1);

  res.json({
    success: true,
    message: "Todo deleted",
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = app;

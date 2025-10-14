# Node.js REST API Problem

## Overview

Create a RESTful API server using Express.js that manages a simple todo list.

## Requirements

### Endpoints

1. **GET /api/todos** - Get all todos

   - Returns: `{ success: true, data: [...] }`

2. **GET /api/todos/:id** - Get a specific todo

   - Returns: `{ success: true, data: {...} }`
   - Error: `{ success: false, error: "Todo not found" }` (404)

3. **POST /api/todos** - Create a new todo

   - Body: `{ title: string, description?: string, completed?: boolean }`
   - Returns: `{ success: true, data: {...} }`

4. **PUT /api/todos/:id** - Update a todo

   - Body: `{ title?: string, description?: string, completed?: boolean }`
   - Returns: `{ success: true, data: {...} }`

5. **DELETE /api/todos/:id** - Delete a todo

   - Returns: `{ success: true, message: "Todo deleted" }`

6. **GET /health** - Health check
   - Returns: `{ status: "ok" }`

### Data Structure

```json
{
  "id": "unique-id",
  "title": "Todo title",
  "description": "Optional description",
  "completed": false,
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp"
}
```

### Validation Rules

- `title` is required and must be a non-empty string
- `completed` must be a boolean if provided
- IDs should be unique

## Testing

The evaluation will:

1. Start your server on port 3000
2. Test all endpoints with various scenarios
3. Verify response formats and status codes
4. Check data persistence within the session
5. Measure response times

## Expected Files

Your submission should include:

- `package.json` - Dependencies (express, etc.)
- `server.js` or `index.js` - Main server file
- Any additional files needed

The server should listen on port 3000 and be ready to accept requests.

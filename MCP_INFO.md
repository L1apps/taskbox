
# TaskBox MCP Readiness & API Usage Guide

## Is TaskBox "MCP Server Ready"?
**No.** TaskBox is a standalone web application utilizing a standard **REST API** over HTTP. It does not natively implement the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) (JSON-RPC over Stdio/SSE).

To use TaskBox with an MCP Client (like Claude Desktop or an IDE), you would need an **intermediate MCP Server** (a "Bridge") that translates MCP Tool calls into HTTP requests sent to the TaskBox API.

---

## Commands (API Endpoints)
If you were to wrap TaskBox in an MCP server, these are the exposed "Tools" (commands) available for the AI to use.

### 1. Authentication (Required)
All subsequent commands require a JWT Bearer Token.
*   **Command:** `login`
*   **Endpoint:** `POST /api/users/login`
*   **Payload:** `{ "username": "admin", "password": "..." }`
*   **Result:** Returns `token` (valid for 7 days by default).

### 2. Structure Management
*   **Command:** `get_lists`
    *   **Endpoint:** `GET /api/lists`
    *   **Description:** Returns all lists, folder hierarchy, and tasks contained within.
*   **Command:** `create_list`
    *   **Endpoint:** `POST /api/lists`
    *   **Payload:** `{ "title": "Project X", "parentId": 5 }` (parentId is optional)
*   **Command:** `move_list`
    *   **Endpoint:** `PUT /api/lists/:id`
    *   **Payload:** `{ "parentId": 2 }`
*   **Command:** `delete_list`
    *   **Endpoint:** `DELETE /api/lists/:id`

### 3. Task Management
*   **Command:** `add_task`
    *   **Endpoint:** `POST /api/lists/:listId/tasks`
    *   **Payload:** `{ "description": "Buy milk" }`
*   **Command:** `update_task`
    *   **Endpoint:** `PUT /api/tasks/:taskId`
    *   **Payload:**
        *   `completed`: boolean
        *   `description`: string
        *   `importance`: 0 (Low), 1 (Med), 2 (High)
        *   `dueDate`: "YYYY-MM-DD"
        *   `pinned`: boolean
        *   `focused`: boolean
        *   `dependsOn`: integer (Task ID)
*   **Command:** `delete_task`
    *   **Endpoint:** `DELETE /api/tasks/:taskId`

### 4. Search
*   **Command:** `search`
    *   **Description:** There is no dedicated search endpoint; the frontend filters the `GET /api/lists` response. An MCP server would need to fetch all lists and perform fuzzy matching locally.

---

## Usage Guide for AI Agents

To interact with TaskBox programmatically:

1.  **Network Access:** The MCP Server must be able to reach the TaskBox container (e.g., `http://localhost:6500` or `http://taskbox:3000` via Docker network).
2.  **Authenticate First:** The agent must perform a login to retrieve a JWT string.
3.  **Header Injection:** All subsequent HTTP requests must include:
    `Authorization: Bearer <jwt_token>`
4.  **Context Loading:** To understand the state, the agent should call `get_lists` to build its context window before attempting to modify specific IDs.

---

## Limitations

1.  **No Real-Time Events:** TaskBox does not support WebSockets or SSE for the API. An MCP server must poll `GET /api/lists` to see changes made by other users.
2.  **Text Limits:** Task descriptions are strictly limited to **102 characters**. Calls exceeding this will be truncated or rejected.
3.  **Hierarchy Rules:**
    *   Max depth: 3 (Master -> Sub -> Nested).
    *   Container Mode: A list cannot contain both Tasks and Sublists. The API may reject requests that violate this.
4.  **Session Timeout:** Tokens expire (default 7 days). The MCP bridge must handle re-authentication logic.
5.  **Single Session DB:** Heavy write operations via API might lock the SQLite database temporarily.

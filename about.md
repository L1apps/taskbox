
# About TaskBox

TaskBox is a standalone, privacy-focused task management application designed to run as a single Docker container. It combines robust project management features (like dependencies and sublists) with a simple, high-performance interface.

## Core Concepts

### 1. Hierarchy & Containers
TaskBox uses a strict 2-level hierarchy to keep organization clean:
1.  **Top Level:** The root view where your Master Lists live.
2.  **Master List:** A top-level list. It can behave in one of two ways:
    *   **Task List:** Contains tasks directly.
    *   **Container List:** Contains **Sublists**.
    *   *Rule:* A list cannot contain both tasks and sublists.
3.  **Sublist:** A list nested inside a Master List. It can only contain tasks. It cannot contain other lists.

### 2. Permissions
*   **Owner:** The user who created the list. Only the owner can Move, Merge, Delete, or Share the list.
*   **Shared User:** Can View, Add, Edit, and Complete tasks within the list, but cannot alter the list structure or share it with others.

---

## Features Guide

### 🎬 Getting Started
*   **First Run:** The first user to register becomes the **Admin**.
*   **Registration:** The Admin creates additional user accounts via the Admin Panel. Public registration is disabled by default for security.

### 🔍 Search
*   **Global Search:** Located in the header, allows searching tasks across **all** lists.
*   **Local Search:** Located in the task toolbar, filters tasks within the **current** list only.

### 📝 Task Management
*   **Add Task:** Type in the input field at the bottom of a list and press Enter.
*   **Edit:** Click any task text to edit it inline.
*   **Complete:** Click the checkbox. Completed tasks move to the bottom or are hidden via the "Eye" icon toggle.
*   **Priority:** Click the flag icon to cycle through Low (Gray), Medium (Yellow), and High (Red) importance.
*   **Pin:** Click the pin icon to stick the task to the top of the list, regardless of sorting.
*   **Dependencies:** Use the dropdown on the right of a task to select a prerequisite. You cannot complete a task until its dependency is finished.
*   **Copy/Move:** Hover over a task description and click the "Copy" icon (two sheets of paper) to copy or move the task to another list.

### 📂 List Actions
Hover over the list name or look at the sidebar toolbar to access actions:
*   **Rename:** Change the list title.
*   **Move:** Move a list to the Top Level or into another Master List. (Validates against hierarchy rules).
*   **Merge:** Combine two lists. Select a target, and all tasks from the current list will be moved there. The old list is deleted.
*   **Share:** Grant access to other users.
    *   *Upward Sharing:* Sharing a sublist automatically shares the parent container so the user can navigate to it.
    *   *Recursive Sharing:* Sharing a Master List automatically grants access to all its sublists.

### 📋 Copy / Paste & Import
*   **Copy / Paste (Clipboard):** Click the clipboard icon in the header.
    *   **Paste:** Paste a simple list of text (one item per line) to bulk-create tasks.
    *   **Copy:** Click "Load Active List" to copy your current list's tasks to the clipboard buffer for use in other apps.
*   **Import File:** Upload `.csv` or `.txt` files. Supports headers: `Description`, `Completed`, `Date Created`, `Due Date`, `Importance`.
*   **Export:** Export your list to CSV or Text file.

### ⚙️ Admin Panel
Accessible only to the Admin user via the shield icon in the header.
*   **User Management:** Create new users, delete users, or reset their passwords.
*   **Activity Log:** Audit trail of logins, critical deletions, and security events.
*   **Maintenance:**
    *   *Vacuum:* Optimizes the SQLite database size.
    *   *Prune:* Deletes orphaned data.
    *   *Purge All:* Wipes all lists/tasks (Emergency use only).
    *   *Reset Defaults:* Wipes data and restores the demo "Groceries" list.

### 🎨 Themes
TaskBox supports three themes, toggled via the moon/sun icon in the header:
1.  **Light:** Standard white/gray interface.
2.  **Dark:** Low-light gray/black interface.
3.  **Orange:** High-contrast mode with black backgrounds and bright orange accents.

---

## Technical Limitations

1.  **Max Depth:** You can only nest lists one level deep (Master -> Sublist). You cannot create a sublist inside a sublist.
2.  **Container Rule:** If a list has sublists, you cannot add tasks to it directly. You must add them to one of the sublists.
3.  **Single Session:** While multiple users are supported, the database is SQLite (file-based). Extremely high write concurrency (hundreds of writes per second) may experience locking, though typical team usage is unaffected.
4.  **Offline:** As a self-hosted web app, it requires network connectivity to the Docker container. It does not have an offline sync mode for mobile apps.

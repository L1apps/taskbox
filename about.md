
# About TaskBox

TaskBox is a standalone, privacy-focused task management application designed to run as a single Docker container. It combines robust project management features (like dependencies and sublists) with a simple, high-performance interface.

## Core Concepts

### 1. Hierarchy & Containers
TaskBox uses a strict **3-level hierarchy** to keep organization clean while allowing depth:
1.  **Top Level:** The root view where your Master Lists live.
2.  **Level 1 (Master List):** A top-level list. It can contain tasks OR Level 2 lists.
3.  **Level 2 (Sublist):** A list inside a Master List. It can contain tasks OR Level 3 lists.
4.  **Level 3 (Nested Sublist):** The deepest level. It can only contain Tasks.

*Rule:* Any specific list can contain **Tasks** OR **Sublists**, but never both at the same time. This is known as "Container Mode".

### 2. Permissions
*   **Owner:** The user who created the list. Only the owner can Move, Merge, Delete, or Share the list.
*   **Shared User:** Can interact with the list based on assigned permission level:
    *   **View Only:** Can only view tasks and list details. No editing allowed.
    *   **Modify:** Can Add, Edit, and Complete tasks. Cannot Delete tasks.
    *   **Full Access:** Can do everything including deleting tasks. (Cannot manage List settings).

---

## Features Guide

### 🎬 Getting Started
*   **First Run:** The first user to register becomes the **Admin**.
*   **Registration:** The Admin creates additional user accounts via the Admin Panel. Public registration is disabled by default for security.

### 🔍 Search
*   **Global Search:** Located in the header, allows searching tasks across **all** lists.
*   **Local Search:** Located in the task toolbar, filters tasks within the **current** view (works in specific lists AND Global Views).

### 🎯 Focused List
The **Focused** list is a permanent system list located at the top of the sidebar (Lightning Bolt Icon). It is designed for your immediate priorities.
*   **Add to Focused:** Click the Lightning Bolt icon (turns blue when active) on any task to add it to the Focused list.
*   **Features:**
    *   **Sort & Search:** Sort focused items by due date or importance, or search locally within the list.
    *   **Export:** Export your focused list to CSV for reporting.
    *   **Print:** Print your focused priorities.
*   **Rules:**
    *   Completed tasks cannot be focused.
    *   Completing a task automatically removes it from the Focused list.
    *   Limit: 100 tasks max.

### 📂 Global Views (File Cabinet)
Located in the sidebar header, the file cabinet icon allows you to see tasks from **all lists** in a single view.
*   **Filter Lists:** Use the list filter icon to show tasks from specific lists only while staying in the Global View.
*   **Show all Tasks:** Aggregates every active task you have access to.
*   **Importance:** Filters for tasks marked with Medium (Yellow) or High (Red) importance.
*   **Show Pinned Tasks:** Filters for tasks you have pinned.
*   **Show Dependent Tasks:** Filters for tasks that are waiting on another task. Shows dependency name inline.
*   **Note:** You cannot Import files or Paste items when in a Global View, as there is no specific list to add them to.

### 📝 Task Management
*   **Add Task:** Type in the input field at the bottom of a list and press Enter.
*   **Edit:** Click any task text to edit it inline.
*   **Complete:** Click the checkbox. Completed tasks move to the bottom or are hidden via the "Checkbox" icon toggle.
*   **Importance:** Click the flag icon to cycle through Low (Gray), Medium (Yellow), and High (Red) importance.
*   **Pin:** Click the pin icon to stick the task to the top of the list, regardless of sorting.
*   **Dependencies:** Use the dropdown on the right of a task to select a prerequisite. You cannot complete a task until its dependency is finished.
*   **Copy/Move:** Hover over a task description and click the "Copy" icon (two sheets of paper) to copy or move the task to another list.
*   **Print:** Click the printer icon in the toolbar. This generates a minimalist checklist view suitable for physical printing. It hides all UI chrome and ensures content flows across multiple pages correctly.

### 📂 List Actions
Hover over the list name or look at the sidebar toolbar to access actions:
*   **Rename:** Change the list title.
*   **Move:** Move a list to the Top Level or into another Master List. (Validates against hierarchy rules).
*   **Merge:** Combine two lists. Select a target, and all tasks from the current list will be moved there. The old list is deleted.
*   **Share:** Grant access to other users with View Only, Modify, or Full Access permissions.
    *   *Upward Sharing:* Sharing a sublist automatically shares the parent container so the user can navigate to it.
    *   *Recursive Sharing:* Sharing a Master List automatically grants access to all its sublists.

### 📋 Copy / Paste & Import
*   **Copy / Paste (Clipboard):** Click the clipboard icon in the header.
    *   **Paste:** Paste a simple list of text (one item per line) to bulk-create tasks. (Disabled for Global Views).
    *   **Copy:** Click "Load Active List" to copy your current list's tasks to the clipboard buffer for use in other apps.
*   **Import File:** Upload `.csv` or `.txt` files. Supports headers: `Description`, `Completed`, `Date Created`, `Due Date`, `Importance`.
    *   *Restriction:* File import is disabled when viewing Global Views (File Cabinet / Focused).
*   **Export:** Export your current list (or Global View) to CSV or Text file.

### ⚙️ Admin Panel
Accessible only to the Admin user via the shield icon in the header.
*   **User Management:** Create new users, delete users, or reset their passwords.
*   **Activity Log:** Audit trail of logins, critical deletions, and security events.
*   **Database Management:**
    *   *Export Backup:* Download the full SQLite database file for safe keeping.
    *   *Restore Backup:* Upload a `.db` file to overwrite the current database. The server will automatically restart to apply the restore.
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

### 🐞 Diagnostics
If asked by support to provide UI details, you can enable **Debug Mode**.
*   **How:** Add `?tooltips=on` to your URL (e.g., `http://...:6500/?tooltips=on`).
*   **Effect:** Tooltips will show the internal name (ID) of the UI element you are hovering over in bright colors.

---

## Technical Limitations

1.  **User Limit:** Maximum **5 Users** (including Admin).
2.  **List Limits (Per User):**
    *   **20** Grandparent (Root) Lists.
    *   **10** Parent/Child (Nested) Lists per container.
3.  **Task Limits (Per User):**
    *   **50** Tasks per specific list.
    *   **5,000** Tasks total per user.
4.  **Max Depth:** 3 Levels (Master → Sublist → Nested Sublist).
5.  **Dependency Depth:** Max 5 levels.
6.  **Single Session:** SQLite may lock under heavy parallel writes.
7.  **No Offline Mode:** Requires network to container.

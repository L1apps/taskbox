
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
*   **Owner:** The user who created the list. Only the owner can Move, Merge, Delete, Transfer, or Share the list.
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
*   **All Due Tasks:** Shows all tasks that have a Due Date set, regardless of list.
*   **Show Dependent Tasks:** Filters for tasks that have relationships (Parent/Child).
*   **Note:** You cannot Import files or Paste items when in a Global View, as there is no specific list to add them to.

### 📝 Task Management
*   **Add Task:** Type in the input field at the bottom of a list and press Enter.
*   **Edit:** Click any task text to edit it inline.
*   **Complete:** Click the checkbox. Completed tasks move to the bottom or are hidden via the "Checkbox" icon toggle.
*   **Custom Order:** Toggle the "Box List" icon to enable manual sorting. Use Up/Down arrows to reorder tasks exactly as you wish. (Note: Custom Sort is disabled in most Global Views).
*   **Importance:** Click the flag icon to cycle through Low (Gray), Medium (Yellow), and High (Red) importance.
*   **Pin:** Click the pin icon to stick the task to the top of the list, regardless of sorting.
*   **Task Relationships:** Use the dropdown on the right of a task to select a Parent Task. A Parent Task becomes a container for sub-tasks and cannot be completed until all its children are finished.
*   **Copy/Move:** Hover over a task description and click the "Copy" icon (two sheets of paper) to copy or move the task to another list.
*   **Print:** Click the printer icon in the toolbar. This generates a minimalist checklist view suitable for physical printing. It hides all UI chrome and ensures content flows across multiple pages correctly.

### 📂 List Actions
Hover over the list name or look at the sidebar toolbar to access actions:
*   **View Mode:** The button in the top right of the sidebar cycles through 3 modes:
    1.  **Accordion Mode (List Icon):** Opening a list automatically closes other lists to keep the view tidy.
    2.  **Expand All (Arrows Out):** Expands every list hierarchy.
    3.  **Collapse All (Arrows In):** Collapses every list hierarchy.
*   **Rename:** Change the list title (Max 20 chars).
*   **Move:** Move a list to the Top Level or into another Master List. (Validates against hierarchy rules).
*   **Merge:** Combine two lists. Select a target, and all tasks from the current list will be moved there. The old list is deleted.
*   **Share:** Grant access to other users with View Only, Modify, or Full Access permissions.
    *   *Transfer Ownership:* Make another user the full owner of a list. (Admins can override).
    *   *Upward Sharing:* Sharing a sublist automatically shares the parent container so the user can navigate to it.
    *   *Recursive Sharing:* Sharing a Master List automatically grants access to all its sublists.
*   **View Settings:** 
    *   **Global Persistence:** By default, TaskBox remembers your sort order, filters (like "Show Completed"), and dependency grouping for *all* lists and Global Views. This can be toggled in **User Settings**.
    *   **Per-List Override:** You can toggle persistence on or off for a specific list using the "Eye" icon in the list toolbar (left of the Custom Sort button).
*   **Settings:** Access via the Share/Gear icon.

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
    *   *Reset Task Relationships:* Flattens the entire task hierarchy (removes parent/child links) to fix nesting or cross-linking errors.

### 👤 User Settings
Accessible via the user icon in the header.
*   **Global View Preferences:** Toggle default "Remember View Settings" for all lists and reset all saved views.
*   **Change Password/Username:** Update your credentials.
*   **Session Timeout:** Configure how long your login lasts.

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
    *   **20** Characters Max for List Title.
3.  **Task Limits (Per User):**
    *   **50** Tasks per specific list.
    *   **5,000** Tasks total per user.
    *   **102** Characters Max for Task Description.
4.  **Max Depth:** 3 Levels (Master → Sublist → Nested Sublist).
5.  **Dependency Depth:** Max 5 levels.
6.  **Single Session:** SQLite may lock under heavy parallel writes.
7.  **No Offline Mode:** Requires network to container.

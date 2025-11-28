
# Changelog

All notable changes to the **TaskBox** project will be documented in this file.

## [3.7.4] - 2025-09-01
### Fixed
- **Sorting:** Completely refactored list sorting. It now handles null/undefined values safely, preventing glitches where rows jump around. Empty dates are explicitly pushed to the end.
- **Error Handling:** Adding, moving, renaming, or merging lists no longer crashes the page to an error screen on failure. It now uses simple alerts/popups to keep the user in the context of their work.

### Changed
- **Warning Modal:** Updated styling to include a backdrop blur and higher Z-index, ensuring it clearly looks like a popup overlaying the application.

## [3.7.3] - 2025-08-25
### Changed
- **Statistics:** The "Per-List Breakdown" in the Stats page now strictly excludes lists that have 0 tasks (Master Lists or Empty Lists) to focus on relevant data. Added an explanatory note.

## [3.7.2] - 2025-08-20
### Added
- **Paste Feature:** Added a dedicated "Paste" icon and modal to separate text input from file imports.
- **Warning Popups:** Replaced browser alerts with custom warning modals for better UX when restrictions are hit (e.g., adding tasks to container lists).

### Fixed
- **Move Logic:** Hidden "Top Level" option in the Move Modal if the list is already at the top level.
- **Purge Logic:** Disabled the "Purge Completed" button if there are no completed tasks to remove.
- **Tooltip Alignment:** Fixed "Add Sublist" tooltip clipping by aligning it left.

### Changed
- **UI:** Updated Sidebar icons. Top Level lists now use a "Stack" icon, while Sublists use a "Document" icon for visual distinction.

## [3.7.1] - 2025-08-15
### Fixed
- **Add Task Popup:** Fixed "Add Task" behavior for lists with sublists. Instead of a disabled screen, clicking "Add Task" now shows a clear alert popup.
- **Tooltip Layering:** Increased Z-Index of the Sidebar Toolbar to ensure tooltips render on top of the list container.

## [3.7.0] - 2025-08-10
### Fixed
- **Priority Sorting:** Fixed toggle logic for Importance sorting. Now correctly toggles between Ascending and Descending.
- **Tooltip Clipping:** Sidebar action tooltips now appear *above* the icons (`position="top"`), preventing them from being hidden by the list view below.
- **Left Edge Clipping:** The "Check/Uncheck All" tooltip is now left-aligned to prevent being cut off by the screen edge.

### Changed
- **Versioning:** Centralized version number. Now displayed as v3.7.0 in the Header and About modal.
- **Links:** Updated Header icons to point to specific `taskbox` repositories on GitHub and Docker Hub.

## [3.6.0] - 2025-08-05
### Fixed
- **Ghost Data:** Enabled SQLite foreign key enforcement (`PRAGMA foreign_keys = ON`). Now, deleting a parent list automatically deletes all sublists and tasks within it, preventing orphaned records.
- **Tooltip Clipping:** Added `z-index` to the sidebar container to ensure action tooltips appear above the main task view.

### Changed
- **UI:** Updated the delete confirmation message to explicitly warn about deleting sublists.
- **Admin Panel:** Updated maintenance text to "Delete All Data but users" and "This Action is irreversible" for clarity.

## [3.5.0] - 2025-08-01
### Added
- **Sidebar Toolbar:** Added a context-aware toolbar at the top of the sidebar for list actions (Rename, Share, Move, Merge, Delete).
- **Admin Refresh:** Database maintenance actions (Prune, Reset) now immediately refresh the application data.

### Changed
- **UI Overhaul:** Removed inline hover buttons from the list tree for a cleaner look. Moved all list actions to the new toolbar.
- **Add List:** Removed the unused "Description" field from the creation modal.

## [3.4.0] - 2025-07-28
### Added
- **Example Data:** Automatically seeds a "Groceries" list with example tasks upon initial admin registration.
- **Reset to Defaults:** Added a button in the Admin Maintenance tab to wipe all data and restore the example "Groceries" list.

## [3.3.0] - 2025-07-20
### Added
- **Renaming:** Added ability to rename lists and sublists via a new sidebar icon.
- **Admin Maintenance:** Added a "Database" tab to the Admin Panel with tools to Prune orphans, Purge all data, and Vacuum the database.
- **UI:** Sidebar overhaul. Removed list descriptions and "tab-like" borders for a cleaner look. Fixed tooltip overlapping issues.

### Changed
- **Hierarchy Logic:** Renamed "Root" to "Top Level".
- **Task View:** The task view is now disabled/greyed out if the selected list contains sublists (enforcing strict container vs. task list rules).
- **Import/Export:** These buttons are now disabled if the active list is a container (has sublists).

## [3.2.0] - 2025-07-10
### Added
- **Merge Lists:** New feature to merge one list into another (moves tasks, deletes source).
- **Hierarchy Rules:** Strict enforcement that a Master List can hold tasks OR sublists (not both).
- **UI:** Tooltip improvements (prevent overlap) and new Merge icon.

### Changed
- **Move Logic:** Restricted moving lists. Can only move to Root or to an empty Master List. Cannot move to Sublist (max depth 2).

## [3.1.1] - 2025-07-06
### Fixed
- **Build Error:** Resolved TypeScript errors for implicit any types in headers and unused imports.

## [3.1.0] - 2025-07-05
### Added
- **Nested Lists:** Replaced "Folders" with a recursive "List inside List" model.
- **Recursive Sharing:** Sharing a Parent List now automatically shares all its Sublists.
- **Sidebar Controls:** Share, Delete, and Move actions are now available directly on sidebar items.

### Changed
- **Architecture:** Deprecated `folders` table. Migrated data to `lists` table using `parent_id`.
- **UI:** Removed resizing from sidebar (fixed width).
- **UI:** Moved Bulk Toggle button to left of search bar.
- **Rules:** Enforced rule that a list can contain tasks OR sublists, but not both.

## [3.0.0] - 2025-07-01
### Added
- **Folder Structure:** Lists can now be organized into collapsible Folders.
- **Tree View:** The sidebar now displays a hierarchical tree of folders and lists.
- **Duplicate Checker:** Real-time checking of task descriptions.
- **Move List:** Added functionality to move lists.

### Changed
- **UI:** Removed the "Add List" button from the main header.
- **Layout:** Major refactor of the left sidebar.

## [2.9.1] - 2025-06-27
### Fixed
- **Sorting:** Fixed a crash when sorting by "Date Created".
- **Tooltips:** Fixed tooltip clipping.
- **Copy Description:** Fixed edit mode bug.

## [2.9.0] - 2025-06-25
### Added
- **Header:** Added version number display.
- **Copy Description:** Improved copy-to-clipboard reliability.

## [2.8.0] - 2025-06-20
### Added
- **Sort Arrows:** Added missing sort indicators.
- **Dependency Sorting:** Implemented sorting logic for Dependency.

## [2.7.0] - 2025-06-15
### Added
- **Admin Logs:** Ability to clear activity logs.
- **Layout:** Text wrapping for long tasks.

## [2.6.0] - 2025-06-10
### Added
- **Resizable Sidebar:** User-resizable list sidebar.
- **Interactive Headers:** Clickable column headers.
- **Advanced Import/Export:** New modals for data handling.

## [2.5.0] - 2025-05-28
### Added
- **User Account Settings:** Change username/password.
- **Date Created:** Tracks creation date.
- **UI:** Trash Icon, Right Sidebar (later reverted), Header Row.

## [2.0.0] - 2025-05-10
### Added
- **Multi-User:** Authentication system.
- **List Sharing:** Collaborate on lists.
- **Pinned Tasks:** Pin tasks to top.

## [1.0.0] - 2025-04-20
### Initial Release
- Core features: Multiple lists, Task CRUD, SQLite, Docker.

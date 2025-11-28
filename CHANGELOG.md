
# Changelog

All notable changes to the **TaskBox** project will be documented in this file.

## [2.9.1] - 2025-06-27
### Fixed
- **Sorting:** Fixed a crash (white screen) when sorting by "Date Created" if the backend returned invalid date data.
- **Tooltips:** Fixed tooltip clipping for items on the screen edges (Checkbox/Pin) by implementing left/right alignment.
- **Copy Description:** Fixed a bug where clicking the copy button would also trigger "Edit Mode" for the task.
- **Sidebar:** Improved sidebar resizing reliability by using direct React event handlers.

## [2.9.0] - 2025-06-25
### Added
- **Header:** Added version number display next to the application title.
- **Copy Description:** Improved the copy-to-clipboard functionality. Now uses a robust fallback method (execCommand) to ensure it works in non-secure contexts (HTTP) like local Docker deployments.

## [2.8.0] - 2025-06-20
### Added
- **Sort Arrows:** Added missing sort indicators for "Status" and "Dependency" columns.
- **Dependency Sorting:** Implemented sorting logic for the Dependency column.
- **Resizer:** Made the sidebar resize handle larger and more visible on hover to improve usability.

### Changed
- **UI:** Renamed "Dependency" dropdown option to "None" in task item.
- **Import:** Changed default importance for unstructured text imports to 0 (Low) instead of 1 (Medium).

## [2.7.0] - 2025-06-15
### Added
- **Admin Logs:** Added ability for admins to clear the activity log.
- **Layout:** Improved sidebar resizing smoothness and text selection handling.
- **Layout:** Increased header spacing in list view for better sorting icon visibility.
- **Task View:** Added text wrapping for long task descriptions.

### Changed
- **Import:** Improved logic for pasting text. If no headers are detected, it treats input as a simple list even if commas are present. Defaults importance to 'Low' (0).
- **Export:** Refined CSV quoting logic to only quote fields when necessary. Renamed "Tab (Unknown)" to "Tab".

## [2.6.0] - 2025-06-10
### Added
- **Resizable Sidebar:** The list sidebar is now user-resizable via a drag handle.
- **Interactive Headers:** List sorting is now controlled by clicking column headers instead of a dropdown.
- **Advanced Import:** New Import Modal supports File Upload OR Paste Text. Handles raw text lists (descriptions only) or structured CSV.
- **Advanced Export:** New Export Modal supports choosing between CSV/TXT, setting delimiters (comma/tab), and selecting specific fields.
- **Bulk Toggle:** Added a "Check/Uncheck All" button to the task list view.
- **Copy Description:** Added a button to copy individual task descriptions to the clipboard.
- **Tooltips:** Added tooltips to all task item controls (Trash, Checkbox, Date, Dependency).

## [2.5.5] - 2025-06-04
### Fixed
- **CSV Export:** Fixed an issue where the "Date Created" field in exported CSV files was displaying raw ISO strings or error values. It now exports as a clean `YYYY-MM-DD` format compatible with Excel.

## [2.5.4] - 2025-06-03
### Added
- **Import:** The CSV/TXT importer now supports a `Date Created` (or `CreatedAt`) column, allowing users to preserve task history during migration.
- **Documentation:** Updated the import example in the "About" modal to reflect the support for `Date Created`.

## [2.5.3] - 2025-06-01
### Fixed
- **Task Created Date:** Fixed an issue where the creation date of tasks was displayed as "N/A" by ensuring proper data normalization from the database.
- **Date Formatting:** Forced the task creation date to display in `mm/dd/yyyy` format.

## [2.5.2] - 2025-05-30
### Added
- **User Settings:** Added a "Session Timeout" setting, allowing users to override the global logout timer with their own preference (e.g., 30m, 1d, 30d).

### Changed
- **Layout (Sidebar):** Made the list sidebar transparent to blend with the theme background. It is now dynamically sized based on list names (with min/max limits) to save screen space.
- **UI (Task Item):** Styled the "Created Date" field to match the "Due Date" input box (gray background, rounded corners) for a consistent read-only look.

## [2.5.1] - 2025-05-29
### Changed
- **Layout:** Moved List Tabs back to the left side.
- **UI:** Moved List Settings and Delete List controls from individual tabs to the main task list header.
- **UI:** Improved styling for the list header area.

## [2.5.0] - 2025-05-28
### Added
- **User Account Settings:** Users can now change their own username and password via a new settings gear icon.
- **Date Created:** Tasks now automatically track their creation date.
- **Sorting:** Added "Sort by Date Created" options.
- **Configurable Session:** The session timeout (logout time) is now adjustable via the `SESSION_TIMEOUT` environment variable.
- **UI:** Added a descriptive header row above the task list for better column identification.

### Changed
- **Layout:** Moved List Tabs to a vertical sidebar on the right side of the screen.
- **UI:** Replaced the "X" delete button on list tabs with a Trash Can icon.
- **UI:** Task items now display the "Created" date next to the "Due Date".

## [2.4.0] - 2025-05-25
### Added
- **Admin Password Reset:** Admins can now reset passwords for other users directly from the Admin Panel.
- **Emergency Recovery:** Added a CLI script (`reset_admin.js`) to reset the admin password via Docker if lost.

### Fixed
- **UI:** Fixed text visibility issues in the Statistics modal when using the Orange theme (text was too dark on dark backgrounds).
- **UI:** Resolved tooltip clipping on list tabs by switching from a scrolling layout to a wrapping layout.

## [2.3.2] - 2025-05-22
### Fixed
- **UI:** Fixed an issue where tooltips on list tabs were appearing underneath the main content area by adjusting Z-index layers.
- **UI:** Fixed clipping of tooltips by replacing `overflow: hidden` with a CSS-based scrollbar hiding technique.

## [2.3.1] - 2025-05-21
### Fixed
- **Bug:** Fixed a synchronization issue where deleting a task did not clear dependencies on other tasks, causing errors when subsequently updating them.

## [2.3.0] - 2025-05-20
### Added
- **Tabbed Interface:** Replaced the scrolling list of projects with a proper folder-tab style interface for better navigation.
- **High Contrast Orange Theme:** Optimized the Orange/Black theme. Input fields, dropdowns, and the Admin Panel now use black text on light backgrounds to ensure readability.

### Changed
- **Icons:** 
    - Updated the "Pin" icon to a clear, vertical push-pin style.
    - Updated the "Importance" icon to a clearer waving flag.
- **UX:** Renamed the "No Dependency" option in task dropdowns to simply "Dependency" for a cleaner look.
- **Layout:** Removed the redundant title header from the Task List view to save vertical space.

## [2.2.0] - 2025-05-18
### Added
- **Import Tasks:** Full support for bulk importing tasks from `.csv` or `.txt` files.
- **Security:** Added explicit instructions and examples for setting the `JWT_SECRET` environment variable.
- **Session Management:** Implemented automatic logout and redirection when the user session (JWT) expires.

## [2.1.0] - 2025-05-15
### Added
- **Admin Panel:** A dedicated interface for the Administrator (first registered user).
- **User Management:** Admins can now create new users and delete existing users (cascading delete for their lists).
- **Activity Log:** A security log tracking logins, failed attempts, and administrative actions.
- **Log Rotation:** Automatic cleanup of activity logs older than 30 days.

### Changed
- **Performance:** Optimized frontend state management to prevent full re-fetches on every action.
- **API:** Added `adminOnly` middleware protection to specific routes.

### Fixed
- Fixed a broken SVG path for the light-theme icon in the header.

## [2.0.0] - 2025-05-10
### Added
- **Multi-User Architecture:** Complete overhaul to support username/password authentication (bcrypt).
- **List Sharing:** List owners can now share lists with specific users for real-time collaboration.
- **Pinned Tasks:** Tasks can be pinned to stick to the top of the list.
- **Importance Flags:** Replaced 5-star rating with 3-level colored flags (Low, Medium, High).
- **Purge Completed:** One-click button to remove all completed tasks from a list.
- **Task Dependencies:** Ability to make a task dependent on another task within the same list.

### Changed
- **Task Layout:** Reordered task item controls for better workflow (Check -> Pin -> Flag -> Desc -> Dep -> Date -> Delete).
- **Database:** Schema migration to add `users`, `list_shares`, and updated `tasks`/`lists` tables.

## [1.1.0] - 2025-05-01
### Added
- **Statistics:** A new modal displaying overall completion rates, total tasks, and per-list breakdown.

## [1.0.0] - 2025-04-20
### Initial Release
- Core features: Multiple lists, Task CRUD, Local SQLite database.
- Themes: Light, Dark, Orange.
- Docker: Full containerization with Node.js/Express backend.

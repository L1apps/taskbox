
# Changelog

All notable changes to the **TaskBox** project will be documented in this file.

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

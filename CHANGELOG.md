
# Changelog

All notable changes to the **TaskBox** project will be documented in this file.

## [3.10.6] - 2025-11-02
### Added
- **Sidebar Accordion Mode:** New behavior to automatically collapse other lists when opening a new one. Keeps the sidebar clean.
- **Global View Persistence:** View settings (sort order, filters, dependency view) are now remembered for ALL lists by default. This can be toggled globally in User Settings.
- **Per-List View Toggle:** A new "Eye" icon in the list toolbar allows toggling view persistence on/off for specific lists or Global Views.
- **Admin Takeover:** Admins can now force a transfer of ownership for any list directly from the Share/Settings modal, regardless of current ownership status.

### Changed
- **Sidebar UI:** Moved the Accordion Mode toggle from User Settings to the sidebar toolbar. It is now part of a tri-state button cycling through Accordion, Expand All, and Collapse All.
- **List Settings:** Removed the "Remember View Settings" checkbox from the Share Modal as it is now managed globally and via the toolbar.
- **Statistics UI:** Improved layout width and fixed tooltip clipping on the Export button.

## [3.10.5] - 2025-10-30
### Added
- **"All Due Tasks" View:** New Global View sidebar item to display all tasks with due dates across all lists.
- **Statistics Export:** Added a download button to the Statistics modal to export stats data to CSV.
- **Clear Button:** Added an 'X' button to the "Add New Task" input field for quick clearing.

### Changed
- **Task Description Rendering:** Switched text wrapping from `break-all` to `break-word` to prevent splitting words in the middle of sentences.
- **Global Sort Controls:** Custom Order toggle is now disabled for "All Tasks", "Importance", and "Due Tasks" views. It remains active for "Focused" and "Dependent" views.
- **Statistics UI:** Redesigned Overall Statistics section to use a clean list/table layout instead of cards.
- **Copy/Paste Modal:** Relocated the limit warning text to the bottom of the dialog for better visibility.
- **Admin Panel:** Removed the manual "Flatten User Hierarchy" tool and specific user login warnings as the hierarchy logic is now self-healing.

### Fixed
- **Task Date Created:** Fixed a backend mapping issue where the task creation date was not being sent to the frontend correctly.

## [3.10.2] - 2025-10-28
### Fixed
- **Docker Networking:** Explicitly bound the Express server to `0.0.0.0` instead of the default `localhost`. This resolves the issue where the container would start but not accept external connections or acquire an accessible network IP address from the host.
- **Healthcheck:** Updated Dockerfile healthcheck to use `127.0.0.1` explicitly to prevent potential IPv6 resolution issues.

## [3.10.1] - 2025-10-27
### Security
- **Database Integrity:** Added a sandboxed verification step for Database Restores. Uploaded files are now checked for SQLite consistency and schema validity in a temporary environment before overwriting the live database to prevent corruption.
- **Import Safety:** Added file size limits (5MB) and binary content detection to the Import Modal to prevent browser lockups when attempting to upload invalid files.

### Changed
- **Text Limits:** Enforced a strict 102-character limit on Task Descriptions to ensure UI stability. Long text in imports or pastes will be automatically truncated.
- **Text Wrapping:** Implemented `break-all` word wrapping for task descriptions to handle long URLs or strings without breaking the layout.
- **Paste Limits:** Limited the "Paste Tasks" functionality to a maximum of 20 items per action to ensure performance.

## [3.10.0] - 2025-10-25
### Added
- **Remember Last List:** The application now remembers your active list between sessions and reloads it automatically on login or refresh.
- **Custom Sort Order:** Added a toggle to enable manual task reordering. Use Up/Down arrows to arrange tasks exactly how you want. This setting is saved per list.
- **Ownership Transfer:** List owners can now transfer full ownership of a list to another shared user via the List Settings modal.
- **List Limits:** List titles are now restricted to 20 characters to ensure cleaner UI.

## [3.9.15] - 2025-10-20
### Added
- **Limits:** Implemented usage limits to ensure performance and prevent abuse:
    - **Max Users:** 5 (Global).
    - **Root Lists:** 20 per user.
    - **Sublists:** 10 per parent list.
    - **Tasks:** 50 per list.
    - **Total Tasks:** 5000 per user.

## [3.9.14] - 2025-10-18
### Changed
- **Dependencies:** 
    - Improved grouping visual: Dependencies now appear indented under their parent task instead of using a "Waiting on" label.
    - Implemented a depth limit of 5 levels for dependency chains to prevent complexity.
- **Global Views:** 
    - Renamed "High Importance" to "Importance" and now includes Medium importance tasks.
    - Updated Toolbar icons for consistency (Link icon for dependencies, Checkbox for completed).
    - Removed "Filter" text from List Filter button for cleaner UI.
- **UI:** Standardized sidebar and toolbar icons.

## [3.9.13] - 2025-10-15
### Added
- **Share Permissions:** Granular permissions for shared lists (View Only, Modify, Full Access).
- **Dependency Grouping:** Automatic grouping of dependent tasks across all views.
- **Visual Enhancements:** 
    - Updated Focused List icons to Lightning Bolt for consistency.
    - Updated High Importance icon in sidebar to Flag.
    - Renamed "Priority" to "Importance" across the UI.

### Changed
- **View Reset:** Hide Completed and Sort settings now reset when switching lists.
- **Tooltips:** Updated Create List tooltip logic.

## [3.9.12] - 2025-10-10
### Added
- **Debug Mode:** Added a diagnostic mode to help users report issues accurately. Enable by visiting `/debug` or appending `?tooltips=on` to the URL. This displays internal component names in high-contrast tooltips.

### Fixed
- **CSV Export:** Fixed an issue where exported CSV data was being double-quoted incorrectly in some spreadsheet viewers.
- **Share Permissions:** Restricted "Share" functionality so only the list Owner can add new users. Shared users can now only remove themselves (leave the list).
- **UI:** Fixed minor alignment issues in Task List headers.

## [3.9.11] - 2025-10-08
### Added
- **Global View Filtering:** Added a "Filter Lists" dropdown in the Global View toolbar, allowing users to show/hide specific lists within the aggregated view.
- **Dependency Grouping:** Global Views now clearly display prerequisite relationships (e.g., "Waiting on: [Task Name]") when filtering by dependencies.

### Changed
- **UI Enhancements:**
    - Updated the "Focused" list icon in the sidebar to a blue filled list style.
    - Updated the Task Focus toggle button to a blue circle/check icon for better visibility.
    - Updated the "Show Focused" filter icon in standard lists to a target/filter symbol.
- **Sorting:** Dependency sorting now attempts to group dependent tasks immediately after their prerequisites.

### Fixed
- **Printing:** Fixed a CSS issue where printing long lists (especially in Global Views) would only print the first page.

## [3.9.10] - 2025-10-06
### Fixed
- **Printing:** Fixed an issue where printing long lists would cut off content.
- **UI Consistency:** Import disabled in Global Views to prevent errors.

## [3.9.9] - 2025-10-04
### Added
- **Global Views Upgrade:** Sorting, Search, Print, and Completed Toggle for Global Views.
- **Global Export:** Export capability for Focused and Global lists.
- **Clipboard Copy:** "Load Active List" support in Global Views.

### Changed
- **Paste Modal:** Disabled "Import Text" in Global View.

## [3.9.8] - 2025-10-02
### Added
- **Focused List:** Permanent system list.
- **Task Focus Toggle:** Focus icon on tasks.

### Changed
- **Global Views:** Exclude completed tasks by default.

## [3.9.7] - 2025-09-30
### Added
- **Global Views:** "File Cabinet" menu.
- **Hierarchy Controls:** Visual nesting limit indicators.

## [3.9.6] - 2025-09-28
### Added
- **3-Tier Hierarchy:** Increased nesting depth.
- **Persistent View Settings:** Saved Sort/View preferences.

## [3.9.5] - 2025-09-26
### Added
- **Database Backup & Restore:** Admin features.

### Changed
- **Printing:** Font and checkbox standardization.
- **Server:** Upload limit increased.

## [3.9.4] - 2025-09-24
### Changed
- **Printing:** Redesigned clean layout.
- **Sidebar:** Floating behavior removed.

## [3.9.3] - 2025-09-22
### Changed
- **Performance:** Batch API for bulk toggle.
- **Printing:** CSS fixes.

## [3.9.2] - 2025-09-20
### Added
- **List Sorting & Pinning.**

## [3.9.1] - 2025-09-17
### Added
- **Duplicate Prevention.**
- **Clipboard:** Descriptions Only mode.

## [3.9.0] - 2025-09-15
### Architecture
- **Refactor:** Context API.
- **Global Search.**

## [3.8.0] - 2025-09-10
### Added
- **Copy/Move Task Modal.**

## [3.5.0] - 2025-08-01
### Added
- **Sidebar Toolbar.**

## [1.0.0] - 2025-04-20
### Initial Release.

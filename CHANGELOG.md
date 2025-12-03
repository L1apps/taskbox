
# Changelog

All notable changes to the **TaskBox** project will be documented in this file.

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
### Initial Release

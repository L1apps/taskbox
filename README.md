
# TaskBox - Your Personal Task Manager

**Version:** 3.9.5

[![Docker Pulls](https://img.shields.io/docker/pulls/l1apps/taskbox?style=for-the-badge)](https://hub.docker.com/r/l1apps/taskbox)
[![GitHub Repo stars](https://img.shields.io/github/stars/l1apps/taskbox?style=for-the-badge)](https://github.com/l1apps/taskbox)

![TaskBox Screenshot](https://l1apps.com/taskbox/taskbox-screenshot/)

---

## Overview

**TaskBox** is a standalone, feature-rich task management application designed for individuals and teams. It supports nested lists (sublists), multi-user collaboration, list sharing, admin controls, and extensive task organization features like dependencies and pinning, all in a secure, self-hosted Docker container.

---

## Installation

### 1. Docker Compose (Recommended)

This is the standard method for most users.

1.  **Create a directory for TaskBox:**
    
    ```bash
    mkdir taskbox
    cd taskbox
    ```

2.  **Create the `docker-compose.yml` file:**
    Save the following content as `docker-compose.yml` in your `taskbox` directory.
    
    ```yaml
    version: '3.8'
    
    services:
      taskbox:
        image: l1apps/taskbox:latest
        container_name: taskbox
        ports:
          - "6500:3000"
        volumes:
          - ./data:/app/data
        restart: unless-stopped
        environment:
          - NODE_ENV=production
          - PORT=3000
          # It is strongly recommended to change this to a long, random string for security
          - JWT_SECRET=your-super-secret-key-that-should-be-in-an-env-file
          # Optional: Set global session timeout (default 7d). Examples: 1h, 30m, 2d
          - SESSION_TIMEOUT=7d
    ```

3.  **Start the container:**
    
    ```bash
    docker-compose up -d
    ```

4.  **Access TaskBox:**
    Open your web browser and navigate to `http://<your-server-ip>:6500`.

### 2. Docker Run

If you prefer to run it manually via the CLI:

```bash
docker run -d \
  --name taskbox \
  -p 6500:3000 \
  -v ./data:/app/data \
  -e JWT_SECRET=mysecurekey \
  --restart unless-stopped \
  l1apps/taskbox:latest
```

### Pre-Release Builds

If you wish to test the latest features before they are marked as stable, you can look for tags marked as pre-release on Docker Hub (e.g., `l1apps/taskbox:3.9.0-rc1`). Use caution as these may contain bugs.

---

## Features

*   **Global Search:** Instantly find tasks across all your lists using the search bar in the header.
*   **List Sorting & Pinning:** Sort lists by name and pin important lists to the top.
*   **Duplicate Prevention:** Strict checks during paste/import to prevent creating duplicate tasks.
*   **Printing:** Clean print view for tasks (e.g., Grocery Lists).
*   **Context-Aware Architecture:** Faster performance and smoother state management.
*   **Clipboard Management:** Copy active lists to clipboard (All Data or Descriptions Only) or paste tasks easily.
*   **Sidebar Toolbar:** Centralized control for list actions (Rename, Share, Move, Merge, Delete).
*   **Demo Data:** Auto-generates example list on install. Admin can "Reset to Defaults".
*   **Nested Lists:** Hierarchical structure (Top Level -> Master List -> Sublist).
*   **Merge Lists:** Consolidate lists by merging them together.
*   **Renaming:** Rename any list or sublist easily.
*   **Recursive Sharing:** Sharing a Parent List automatically grants access to its sublists.
*   **Copy/Move Tasks:** Easily duplicate or move tasks between lists.
*   **Multi-User Support:** Secure user registration and login system.
*   **User Settings:** Change username, password, and session timeout.
*   **Admin Panel:** Create/Delete users, reset passwords, and view/clear security logs.
*   **Database Maintenance:** Prune orphans, Purge all data, and Vacuum database.
*   **Database Backup/Restore:** Download full backups or restore DB via file upload (Admin only).
*   **Duplicate Checker:** Real-time warning if a task description already exists.
*   **Pinned Tasks:** Pin important tasks to the top.
*   **3-Level Importance:** Low, Medium, High importance flags.
*   **Task Dependencies:** Set prerequisites for tasks.
*   **Advanced Import/Export:** Support for CSV and Text files with custom delimiters.
*   **Purge Completed:** Quickly remove completed tasks.
*   **Bulk Actions:** Toggle check/uncheck all tasks.
*   **Statistics Page:** View completion rates and overdue tasks.
*   **Custom Themes:** Light, Dark, and High-Contrast Orange/Black.
*   **Emergency Recovery:** CLI script to reset lost admin passwords.

---

## Tech Stack

*   **Frontend:** React (Context API), Tailwind CSS
*   **Backend:** Node.js, Express.js with JWT
*   **Database:** SQLite
*   **Containerization:** Docker (Alpine Linux base)

---

## Recovering Lost Admin Password

If you lose access to the admin account, you can reset the password directly via the container CLI:

1.  Open a terminal on your host machine.
2.  Run the following command:

```bash
docker exec -it taskbox node reset_admin.js <admin_username> <new_password>
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for full details.

*   **v3.9.5:** Database Backup/Restore (Import/Export), Print font/layout fixes.
*   **v3.9.4:** Enhanced Printing (Clean Checklist), Stats Sorting, UI Improvements.
*   **v3.9.3:** Performance optimization (Batch actions), Print CSS fixes, React Rendering tweaks.
*   **v3.9.2:** List Sorting, List Pinning, Printer-friendly view, Improved Folder/Stats behavior.
*   **v3.9.1:** Duplicate prevention, UI Polish (Clear Search, Icon Layout), "Descriptions Only" copy option.
*   **v3.9.0:** Major Refactor (Context API), Global Search, Enhanced Copy/Paste, UX Fixes.
*   **v3.8.0:** Copy/Move Tasks to other lists, Upward Sharing Logic, Strict Owner Permissions, Docker Labels.
*   **v3.7.x:** Statistics logic, UI Polishing, Warning Modals.
*   **v3.5.0:** Sidebar Toolbar (New UX), Admin Refresh logic.
*   **v3.4.0:** Demo Data Seeding, Reset to Defaults.
*   **v3.1.0:** Nested Lists (Sublists), Recursive Sharing.
*   **v2.x:** Admin Panel, Multi-User, Import/Export tools.
*   **v1.0.0:** Initial Release.

---

## Support and Contribution

Developed by [Level 1 Apps](https://l1apps.com/taskbox/).

For support or inquiries, please visit our website. All Rights Reserved Level 1 Apps © 2025.

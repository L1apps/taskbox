
# TaskBox - Your Personal Task Manager

**Version:** 3.7.4

[![Docker Pulls](https://img.shields.io/docker/pulls/l1apps/taskbox?style=for-the-badge)](https://hub.docker.com/r/l1apps/taskbox)
[![GitHub Repo stars](https://img.shields.io/github/stars/l1apps/taskbox?style=for-the-badge)](https://github.com/l1apps/taskbox)

![TaskBox Screenshot](https://l1apps.com/taskbox-screenshot/)

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
        image: l1apps/taskbox:latest # or ghcr.io/l1apps/taskbox:latest
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

### 2. Portainer Stacks

If you use Portainer, you can deploy TaskBox easily using the "Stacks" feature.

1.  **Log in** to your Portainer instance.
2.  Navigate to **Stacks** and click **+ Add stack**.
3.  **Name:** Enter `taskbox`.
4.  **Build method:** Select **Web editor**.
5.  **Configuration:** Paste the YAML content from the **Docker Compose** section above into the editor.
    *   *Note:* You may want to change the volume to a named volume (e.g., `taskbox_data:/app/data`) if you prefer Portainer to manage storage.
6.  Click **Deploy the stack**.

---

## Features

*   **Sidebar Toolbar:** Centralized control for list actions (Rename, Share, Move, Merge, Delete).
*   **Demo Data:** Auto-generates example list on install. Admin can "Reset to Defaults".
*   **Nested Lists:** Hierarchical structure (Top Level -> Master List -> Sublist).
*   **Merge Lists:** Consolidate lists by merging them together.
*   **Renaming:** Rename any list or sublist easily.
*   **Recursive Sharing:** Sharing a Parent List automatically grants access to all its sublists.
*   **Multi-User Support:** Secure user registration and login system.
*   **User Settings:** Change username, password, and session timeout.
*   **Admin Panel:** Create/Delete users, reset passwords, and view/clear security logs.
*   **Database Maintenance:** Prune orphans, Purge all data, and Vacuum database.
*   **Duplicate Checker:** Real-time warning if a task description already exists.
*   **Pinned Tasks:** Pin important tasks to the top.
*   **3-Level Importance:** Low, Medium, High importance flags.
*   **Task Dependencies:** Set prerequisites for tasks.
*   **Advanced Import/Export:** Support for CSV and Text files with custom delimiters.
*   **Paste Feature:** Quickly paste text lists directly into TaskBox.
*   **Purge Completed:** Quickly remove completed tasks.
*   **Bulk Actions:** Toggle check/uncheck all tasks.
*   **Statistics Page:** View completion rates and overdue tasks.
*   **Custom Themes:** Light, Dark, and High-Contrast Orange/Black.
*   **Emergency Recovery:** CLI script to reset lost admin passwords.

---

## Tech Stack

*   **Frontend:** React, Tailwind CSS
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

*   **v3.7.4:** Robust sorting logic, error handling improvements, better popup styling.
*   **v3.7.3:** Statistics breakdown logic improvement, UI Polishing.
*   **v3.7.2:** Separate Paste feature, Custom Warning Modals, UI Polishing.
*   **v3.7.1:** Add Task Popup for sublists, Tooltip z-index layering fix.
*   **v3.7.0:** Priority sorting fixes, tooltip improvements, link updates.
*   **v3.6.0:** Database integrity fixes, Tooltip visibility, Text updates.
*   **v3.5.0:** Sidebar Toolbar (New UX), Admin Refresh logic, UI Cleanup.
*   **v3.4.0:** Demo Data Seeding, Reset to Defaults.
*   **v3.3.0:** Renaming Lists, Admin Maintenance Tools (Prune/Purge/Vacuum), Sidebar UI Overhaul.
*   **v3.2.0:** Merge functionality, Strict Hierarchy Rules.
*   **v3.1.0:** Nested Lists (Sublists), Recursive Sharing.
*   **v3.0.0:** Folder structure, Duplicate Checker.
*   **v2.x:** Admin Panel, Multi-User, Import/Export tools.
*   **v1.0.0:** Initial Release.

---

## Support and Contribution

Developed by [Level 1 Apps](https://l1apps.com/taskbox/).

For support or inquiries, please visit our website. All Rights Reserved Level 1 Apps © 2025.


# TaskBox - Your Personal Task Manager

**Version:** 3.9.12

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

---

## Features

*   **Focused List:** Keep track of your most important tasks using the new permanent "Focused" list.
*   **Global Views:** View tasks across all lists via the "File Cabinet". Now includes list filtering and dependency visualization.
*   **Global Search:** Instantly find tasks across all your lists using the search bar in the header.
*   **Printing:** Clean, ink-friendly print view. Supports printing Global Views and Focused lists properly across multiple pages.
*   **Duplicate Prevention:** Strict checks during paste/import to prevent creating duplicate tasks.
*   **Clipboard Management:** Copy active lists to clipboard (All Data or Descriptions Only) or paste tasks.
*   **Sidebar Toolbar:** Centralized control for list actions (Rename, Share, Move, Merge, Delete).
*   **Nested Lists:** Hierarchical structure (Top Level -> Master List -> Sublist -> Nested Sublist). Max nesting depth is 3 levels.
*   **Persistent View:** Your sort order and view filters are saved automatically.
*   **Merge Lists:** Consolidate lists by merging them together.
*   **Multi-User Support:** Secure user registration and login system.
*   **Admin Panel:** User management, security logs, and database maintenance.
*   **Database Backup/Restore:** Download full backups or restore DB via file upload (Admin only).
*   **Import/Export:** Support for CSV and Text files. (Import disabled in Global Views).
*   **Statistics Page:** View completion rates and overdue tasks.
*   **Custom Themes:** Light, Dark, and High-Contrast Orange/Black.

---

## Troubleshooting & Diagnostics

If you encounter issues or need to report bugs, you can enable **Debug Mode**. This reveals internal object names and component IDs on tooltips to help identify specific UI elements.

To enable Debug Mode, append one of the following to your URL:
*   `http://<your-ip>:6500/?debug=on`
*   `http://<your-ip>:6500/?tooltips=on`
*   `http://<your-ip>:6500/debug`

When enabled, hovering over any interactive element (buttons, checkboxes, inputs) will display its internal debug label in a high-contrast fuchsia tooltip.

---

## Recovering Lost Admin Password

If you lose access to the admin account, you can reset the password directly via the container CLI:

```bash
docker exec -it taskbox node reset_admin.js <admin_username> <new_password>
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for full details.

*   **v3.9.12:** Fixed CSV export formatting (double-quotes), restricted List Sharing permissions, added Debug Mode for diagnostics.
*   **v3.9.11:** UI Enhancements (Icons), Global View Filtering, Dependency Grouping, Multi-page printing fix.
*   **v3.9.10:** Fixed multi-page printing overflow. Disabled Import in Global Views.
*   **v3.9.9:** Enhanced Global Views (Sort/Search/Print), Global View Export.
*   **v3.9.8:** Focused List (System List), Task Focus Toggle.
*   **v3.9.7:** Global Views (File Cabinet), 3-Tier Hierarchy UI adjustments.
*   **v3.9.5:** Database Backup/Restore (Import/Export).
*   **v3.9.4:** Enhanced Printing (Clean Checklist).
*   **v3.9.0:** Major Refactor (Context API), Global Search.
*   **v1.0.0:** Initial Release.

---

## Support and Contribution

Developed by [Level 1 Apps](https://l1apps.com/taskbox/).

For support or inquiries, please visit our website. All Rights Reserved Level 1 Apps © 2025.

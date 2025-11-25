
# TaskBox by Level 1 Apps

**TaskBox** is a standalone, feature-rich task management application for individuals and teams. It now includes multi-user support, list sharing, and enhanced task organization features, all packaged in a secure, self-hosted Docker container.

[Website](https://l1apps.com/taskbox/) | [GitHub](https://github.com/l1apps/taskbox)

![TaskBox Screenshot](https://l1apps.com/taskbox-screenshot/)

---

## Overview

TaskBox is a powerful and intuitive to-do list application that you can host on your own server using Docker. With the new multi-user support, you can create accounts for your family or team and share lists for seamless collaboration. The application features a persistent SQLite database backend, ensuring your data is always saved and available.

### Features:

*   **Multi-User Support & Sharing:** Secure user registration and login, with the ability to share lists with other users.
*   **User Account Settings:** Users can manage their own credentials.
*   **Import Tasks:** Easily import tasks from CSV or TXT files.
*   **Pinned Tasks:** Pin your most important tasks to the top of a list.
*   **3-Level Importance:** Assign a Low, Medium, or High importance level to tasks using colored flags.
*   **Purge Completed:** Clean up lists by removing all completed tasks with one click.
*   **Task Dependencies:** Set prerequisites for tasks within the same list.
*   **Filtering & Sorting:** Quickly find tasks with powerful search and sort options.
*   **Task Statistics:** Get a high-level overview of your productivity with detailed stats.
*   **Admin Panel:** Create/Delete users and reset passwords.
*   **Emergency Recovery:** Includes a CLI script to reset the admin password if lost.
*   **UI/UX Improvements:** New folder-style tabs, high-contrast Orange theme, and clear icons.
*   **Custom Themes:** Switch between Light, Dark, and Orange/Black themes.

---

## Recommended Deployment (Docker Compose)

This is the easiest way to get TaskBox running.

**Important:** Replace `your-super-secret-key...` with a strong, random string (e.g., generated via `openssl rand -hex 32`).

1.  Create a `docker-compose.yml` file with the following content:

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
          # Optional: Set session timeout (default 7d). Examples: 1h, 30m, 2d
          - SESSION_TIMEOUT=7d
    ```

2.  Run the application:
    
    ```bash
    docker-compose up -d
    ```

3.  **Initial Setup:** Access TaskBox in your browser at `http://<your-server-ip>:6500`. You will be prompted to create the first admin account. Afterwards, the app will require login for access.

---

## Docker Run Command

If you prefer not to use Docker Compose, you can use the following `docker run` command:

```bash
docker run -d \
  --name=taskbox \
  -p 6500:3000 \
  -v ./data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET=your-super-secret-key-that-should-be-in-an-env-file \
  -e SESSION_TIMEOUT=7d \
  --restart unless-stopped \
  l1apps/taskbox:latest
```

---

## Support

Developed by [Level 1 Apps](https://l1apps.com/taskbox/). For support or inquiries, please visit our website.

All Rights Reserved Level 1 Apps © 2025

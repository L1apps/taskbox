# TaskBox - Your Personal Task Manager

**Version:** 2.3.2

[![Docker Pulls](https://img.shields.io/docker/pulls/l1apps/taskbox?style=for-the-badge)](https://hub.docker.com/r/l1apps/taskbox)
[![GitHub Repo stars](https://img.shields.io/github/stars/l1apps/taskbox?style=for-the-badge)](https://github.com/l1apps/taskbox)

![TaskBox Screenshot](https://l1apps.com/taskbox-screenshot/)

---

### Short Description

TaskBox is a standalone, feature-rich task management application designed for individuals and teams. It now includes multi-user support with admin controls, list sharing, activity logging, and enhanced task organization features, all packaged in a secure, self-hosted Docker container.

### Long Description

TaskBox is a powerful and intuitive to-do list application that you can host on your own server. It provides a clean, modern interface for managing multiple task lists, from a simple shopping list to complex project tasks. With full multi-user support, you can create accounts for your family or team and share lists for seamless collaboration. The new Admin Panel allows the administrator to manage users and view a security activity log. The application features a persistent SQLite database backend, ensuring your data is always saved and available. With features like task pinning, 3-level importance flags, due dates, dependencies, and a new purge function, TaskBox is the perfect tool to boost your productivity.

---

## Features

*   **Multi-User Support:** Secure user registration and login system.
*   **Admin Panel & User Management:** The first user becomes the admin, with the ability to create and delete other user accounts.
*   **Activity Logging:** Admins can view a log of important security events like logins and user management actions.
*   **Shared Lists:** List owners can share their lists with other users for collaboration.
*   **Import Tasks from File:** Bulk import tasks from CSV or TXT files.
*   **Pinned Tasks:** Pin your most important tasks to the top of a list for easy access.
*   **3-Level Importance:** Assign a Low, Medium, or High importance level to tasks using colored flags.
*   **Purge Completed Tasks:** Clean up your lists by removing all completed tasks with a single click.
*   **Task Dependencies:** Set prerequisites for tasks within the same list.
*   **Filtering and Sorting:** Quickly find tasks by searching, or sort by importance, description, due date, or completion status.
*   **Statistics Page:** View detailed statistics about your tasks, including overall and per-list completion rates.
*   **Custom Themes:** Switch between Light, Dark, and a special Orange/Black theme (High Contrast).

---

## Tech Stack

*   **Frontend:** React, Tailwind CSS
*   **Backend:** Node.js, Express.js with JWT for authentication.
*   **Database:** SQLite
*   **Containerization:** Docker, Docker Compose

---

## Installation

The recommended method for installation is using Docker Compose.

### Important: Set Your Security Key

For security, you must generate a strong random string for your `JWT_SECRET`. You can generate one using `openssl rand -hex 32` or any password generator. Replace `your-super-secret-key...` below with your generated key.

1.  **Create a directory for TaskBox:**
    
    ```bash
    mkdir taskbox
    cd taskbox
    ```

2.  **Download the `docker-compose.yml` file:**
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
    ```

3.  **Start the container:**
    
    ```bash
    docker-compose up -d
    ```

4.  **Access TaskBox & Initial Setup:**
    Open your web browser and navigate to `http://<your-server-ip>:6500`. On the first run, you will be prompted to create the first administrator account. After that, the application will switch to multi-user mode and present a login screen.

---

## Version History

For a detailed list of changes for every version, please see the [CHANGELOG.md](CHANGELOG.md).

*   **v2.3.2 (Current):** UI/UX fixes (tooltips, dependencies), Security updates.
*   **v2.3.0:** UI Polish, Orange Theme visibility fixes, Icon updates, Tabbed interface.
*   **v2.2.0:** Import Tasks, Security Documentation.
*   **v2.1.0:** Admin Panel, Activity Log.
*   **v2.0.0:** Multi-user, Sharing, Pins, Flags.
*   **v1.0.0:** Initial Release.

---

## Support and Contribution

Developed by [Level 1 Apps](https://l1apps.com/taskbox/).

For support or inquiries, please visit our website. All Rights Reserved Level 1 Apps © 2025.
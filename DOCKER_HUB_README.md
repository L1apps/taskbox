# TaskBox by Level 1 Apps

**TaskBox** is a standalone, feature-rich task management application to organize your to-do lists efficiently. Manage multiple lists, track progress, and customize your experience with themes.

[Website](https://l1apps.com) | [GitHub](https://github.com/l1apps/taskbox)

![TaskBox Screenshot](https://raw.githubusercontent.com/l1apps/taskbox/main/screenshot.png) <!-- Placeholder for a future screenshot -->

---

## Overview

TaskBox is a powerful and intuitive to-do list application that you can host on your own server using Docker. It provides a clean, modern interface for managing multiple task lists, from a simple shopping list to complex project tasks. The application features a persistent SQLite database backend, ensuring your data is always saved and available.

### Features:

*   **Multiple Lists:** Organize your tasks into separate lists.
*   **Task Details:** Assign importance (star rating) and due dates.
*   **Filtering & Sorting:** Quickly find tasks with powerful search and sort options.
*   **Progress Tracking:** Visualize your list's completion percentage.
*   **Custom Themes:** Switch between Light, Dark, and Orange/Black themes.
*   **Persistent Data:** Data is safely stored in an SQLite database via a Docker volume.
*   **Easy Deployment:** Get up and running in minutes with Docker Compose.

---

## Recommended Deployment (Docker Compose)

This is the easiest way to get TaskBox running.

1.  Create a `docker-compose.yml` file with the following content:

    
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
    

2.  Run the application:
    
    docker-compose up -d
    

3.  Access TaskBox in your browser at `http://<your-server-ip>:6500`.

---

## Docker Run Command

If you prefer not to use Docker Compose, you can use the following `docker run` command:

docker run -d \
  --name=taskbox \
  -p 6500:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  l1apps/taskbox:latest

---

## Support

Developed by [Level 1 Apps](https://l1apps.com). For support or inquiries, please visit our website.

All Rights Reserved Level 1 Apps © 2025
# TaskBox - Your Personal Task Manager

**Version:** 1.1.0

[![Docker Pulls](https://img.shields.io/docker/pulls/l1apps/taskbox?style=for-the-badge)](https://hub.docker.com/r/l1apps/taskbox)
[![GitHub Repo stars](https://img.shields.io/github/stars/l1apps/taskbox?style=for-the-badge)](https://github.com/l1apps/taskbox)

---

### Short Description

TaskBox is a standalone, feature-rich task management application designed to organize your to-do lists efficiently. Built with Node.js and React, and packaged in Docker, it provides a persistent, self-hosted solution for all your task management needs.

### Long Description

TaskBox is a powerful and intuitive to-do list application that you can host on your own server or NAS using Docker. It provides a clean, modern interface for managing multiple task lists, from a simple shopping list to complex project tasks. The application features a persistent SQLite database backend, ensuring your data is always saved and available. With features like task prioritization, due dates, filtering, sorting, and completion tracking, TaskBox is the perfect tool to boost your productivity. Customize your experience with multiple themes (Light, Dark, Orange/Black) and easily import or export your tasks.

---

## Features

*   **Multiple Lists:** Organize your tasks into separate lists with custom titles and descriptions.
*   **Comprehensive Task Management:** Add, edit, delete, and mark tasks as complete.
*   **Task Details:** Assign importance (star rating), due dates, and even dependencies between tasks in the same list.
*   **Filtering and Sorting:** Quickly find tasks by searching, or sort by importance, description, due date, or completion status.
*   **Progress Tracking:** Visualize your list's completion with a percentage-based progress bar.
*   **Statistics Page:** View detailed statistics about your tasks, including overall and per-list completion rates and overdue tasks.
*   **Custom Themes:** Switch between Light, Dark, and a special Orange/Black theme to suit your preference.
*   **Data Persistence:** Your data is safely stored in an SQLite database, persisted via a Docker volume.
*   **Import/Export:** Easily import tasks from CSV/TXT files and export your task lists to CSV.
*   **Easy Deployment:** Deploy in minutes using the provided Docker Compose file.

---

## Tech Stack

*   **Frontend:** React, Tailwind CSS
*   **Backend:** Node.js, Express.js
*   **Database:** SQLite
*   **Containerization:** Docker, Docker Compose

---

## Installation

The recommended method for installation is using Docker Compose.

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
    ```

3.  **Start the container:**
    
    ```bash
    docker-compose up -d
    ```

4.  **Access TaskBox:**
    Open your web browser and navigate to `http://<your-server-ip>:6500`.

---

## Version History

*   **v1.1.0**
    *   Added a statistics modal to view overall and per-list task metrics.
    *   Statistics include completion percentage, overdue tasks, and total task counts.
*   **v1.0.0 (Initial Release)**
    *   Initial public release.
    *   Core features: multi-list support, task CRUD, sorting, filtering, themes, task dependencies.
    *   Node.js backend with SQLite database.
    *   Docker container for easy deployment.

---

## Support and Contribution

Developed by [Level 1 Apps](https://l1apps.com).

For support or inquiries, please visit our website. All Rights Reserved Level 1 Apps © 2025.
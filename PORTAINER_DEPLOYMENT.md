# Deploying TaskBox with Portainer

This guide will walk you through deploying the TaskBox application using Portainer's "Stacks" feature, which is the recommended method as it utilizes Docker Compose.

## Prerequisites

*   A working instance of Docker.
*   A working instance of Portainer connected to your Docker environment.

## Deployment Steps

1.  **Log in to Portainer.**

2.  **Navigate to Stacks:**
    From the left-hand menu, click on **Stacks**.

3.  **Create a new stack:**
    Click the **+ Add stack** button.

4.  **Configure the stack:**

    *   **Name:** Give your stack a name, for example, `taskbox`.
    *   **Build method:** Select **Web editor**. This is where you will paste the Docker Compose configuration.

5.  **Paste the Docker Compose configuration:**
    Copy the entire content below and paste it into the **Web editor**.

    ```yaml
    version: '3.8'

    services:
      taskbox:
        image: l1apps/taskbox:latest # You can also use ghcr.io/l1apps/taskbox:latest
        container_name: taskbox
        ports:
          - "6500:3000"
        volumes:
          - taskbox_data:/app/data # Use a named volume managed by Docker
        restart: unless-stopped
        environment:
          - NODE_ENV=production
          - PORT=3000
          # It is strongly recommended to change this to a long, random string for security
          - JWT_SECRET=your-super-secret-key-that-should-be-in-an-env-file

    volumes:
      taskbox_data:
    ```
    
    > **Note on Volumes:** The configuration above uses a Docker "named volume" (`taskbox_data`). This is often easier to manage within Portainer. Portainer will automatically create this volume for you. If you prefer to use a "bind mount" to a specific folder on your host machine, you can revert the `volumes` section to match the standard `docker-compose.yml` file:
    
    ```yaml
    volumes:
      - /path/on/your/host/taskbox/data:/app/data
    ```

6.  **Deploy the stack:**
    Scroll to the bottom of the page and click the **Deploy the stack** button.

7.  **Wait for deployment:**
    Portainer will now pull the `l1apps/taskbox` image and create the container. You can monitor the progress in the stack's details or the container logs.

8.  **Access TaskBox:**
    Once the container is running and healthy, you can access the application in your web browser by navigating to `http://<your-server-ip>:6500`.

Your TaskBox instance is now up and running, with its data safely persisted in the volume you configured.
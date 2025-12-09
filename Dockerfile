
# Stage 1: Build the React frontend
# This stage installs all dependencies (including devDependencies) and builds the static frontend assets.
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools for native dependencies (like bcrypt) in the builder stage too
# Python 3.12+ (default in Alpine 3.20) removed distutils, so we must install py3-setuptools
RUN apk add --no-cache python3 py3-setuptools make g++

# Copy package.json AND package-lock.json (if available).
# Using package*.json ensures it works even if package-lock.json is missing locally.
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code.
# A .dockerignore file is used to prevent node_modules and other unnecessary files from being copied.
COPY . .

# Build the application, creating the static files in the /app/dist directory.
RUN npm run build

# Stage 2: Create the production image
# This stage takes the built assets from the 'builder' stage and sets up the final, lean production server.
FROM node:20-alpine
WORKDIR /app

# Add Metadata Labels
LABEL maintainer="Level 1 Apps"
LABEL version="3.11.5"
LABEL description="TaskBox - Standalone Task Manager"
LABEL com.l1apps.www="Level 1 Apps"

# For native modules like bcrypt and sqlite3, Alpine needs build tools.
# We install them, build the modules, and then remove the tools to keep image small.
# CRITICAL: py3-setuptools provides 'distutils', required for node-gyp on Python 3.12+
RUN apk add --no-cache python3 py3-setuptools make g++ sqlite

# Copy package files again and install ONLY production dependencies.
# We force build-from-source for sqlite3 to ensure it links correctly against Alpine's musl libc.
COPY package*.json ./
RUN npm install --omit=dev --build-from-source=sqlite3

# After installing, we can remove the build tools to keep the image lean.
RUN apk del python3 py3-setuptools make g++

# Copy the server-side JavaScript files needed to run the backend.
# Grouping the copy ensures better layer caching and atomic failure if files are missing.
COPY server.js database.js api.js reset_admin.js ./

# Copy the built frontend from the builder stage.
COPY --from=builder /app/dist ./dist

# The data directory will be mounted as a volume.
# We create it here so permissions are set correctly within the container.
RUN mkdir -p /app/data

# Expose the port the app runs on.
EXPOSE 3000

# Set the node environment to production.
# This enables optimizations in Express and is used by our database logic.
ENV NODE_ENV=production

# Healthcheck to verify the application is responding
# Use 127.0.0.1 explicitly. 'wget -q -O -' is safer for busybox implementations.
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -q -O - http://127.0.0.1:3000/api/users/any-exist || exit 1

# Command to run the application.
CMD ["node", "server.js"]

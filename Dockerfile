
# Stage 1: Build the React frontend
# This stage installs all dependencies (including devDependencies) and builds the static frontend assets.
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools for native dependencies (like bcrypt) in the builder stage too
RUN apk add --no-cache python3 make g++

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

# For native modules like bcrypt, Alpine needs some build tools.
RUN apk add --no-cache python3 make g++

# Copy package files again and install ONLY production dependencies.
# This keeps the final image size small and more secure.
COPY package*.json ./
RUN npm install --omit=dev

# After installing, we can remove the build tools to keep the image lean.
RUN apk del python3 make g++

# Copy the server-side JavaScript files needed to run the backend.
COPY server.js .
COPY database.js .
COPY api.js .

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
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/users/any-exist || exit 1

# Command to run the application.
CMD ["node", "server.js"]

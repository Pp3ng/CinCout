FROM node:18-bullseye AS builder

# Create app directory
WORKDIR /app

# First stage - copy and build everything
COPY . .
RUN npm install
RUN npm run build

# Final stage - keep only what's needed
FROM node:18-bullseye-slim

# Install only the minimum required runtime dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    clang \
    clang-format \
    valgrind \
    cppcheck \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy only the exact files needed
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/dist/server.bundle.js ./backend/dist/server.bundle.js
COPY --from=builder /app/backend/templates ./backend/templates
COPY --from=builder /app/backend/node_modules/node-pty ./backend/node_modules/node-pty

# Expose the port
EXPOSE 9527

# Start the server with the bundled file
CMD ["node", "backend/dist/server.bundle.js"]
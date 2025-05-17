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
    gdb \
    strace \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install PM2 globally
RUN npm install pm2 -g

# Create app directory
WORKDIR /app

# Create non-privileged user
RUN adduser --disabled-password --gecos "" appuser

# Copy only the exact files needed
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/dist/server.bundle.js ./backend/dist/server.bundle.js
COPY --from=builder /app/backend/templates ./backend/templates
COPY --from=builder /app/backend/node_modules/node-pty ./backend/node_modules/node-pty

# Create a PM2 ecosystem file
RUN echo '{\
  "apps": [{\
    "name": "cincout",\
    "script": "./backend/dist/server.bundle.js",\
    "instances": 1,\
    "exec_mode": "fork",\
    "env": {\
      "NODE_ENV": "production"\
    },\
    "max_memory_restart": "500M"\
  }]\
}' > ecosystem.config.json

# Expose the port
EXPOSE 9527

# Switch to non-root user
USER appuser

# Start the server with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.json"]
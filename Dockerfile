# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    g++ \
    clang \
    clang-extra-tools \
    musl-dev \
    python3 \
    make \
    linux-headers

# Create app directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Extract node-pty module (this is the only native module we need)
RUN mkdir -p /tmp/node-pty-binaries
RUN cp -r backend/node_modules/node-pty /tmp/node-pty-binaries/

# Production stage - super minimal image
FROM node:18-alpine

# Install only runtime dependencies for running binaries
RUN apk add --no-cache \
    clang \
    clang-extra-tools \
    valgrind 

# Create app directory with minimal structure
WORKDIR /app
RUN mkdir -p backend/node_modules/node-pty backend/dist frontend

# Copy only the essential files needed to run the application
COPY --from=builder /tmp/node-pty-binaries/node-pty /app/backend/node_modules/node-pty
COPY --from=builder /app/frontend/dist /app/frontend/dist
COPY --from=builder /app/backend/dist/server.bundle.js /app/backend/dist/
COPY --from=builder /app/backend/templates /app/backend/templates

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 9527

# Start the server with the bundled file
CMD ["node", "backend/dist/server.bundle.js"]
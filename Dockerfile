FROM node:18-alpine

# Install build tools, Python and necessary dependencies for node-pty and C/C++ compilers
RUN apk add --no-cache \
    gcc \
    g++ \
    clang \
    clang-extra-tools \
    valgrind \
    musl-dev \
    python3 \
    make \
    linux-headers

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create app directory and set permissions
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies with proper build environment
RUN npm install
RUN cd backend && npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 9527

# Start the server
CMD ["npm", "start"]
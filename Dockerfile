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

# Create app directory
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

# Expose the port
EXPOSE 9527

# Start the server
CMD ["npm", "start"]
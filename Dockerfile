FROM node:18-bullseye

# Install system dependencies
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

# Copy all files
COPY . .

# Install root dependencies and run build script
RUN npm install
RUN npm run build

# Expose the port
EXPOSE 9527

# Just start the server (everything is already built)
CMD ["npm", "start"]
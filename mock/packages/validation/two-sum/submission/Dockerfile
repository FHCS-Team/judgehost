# Use Node.js 18 Alpine for small image size
FROM node:18-alpine

# Install Python for code quality tools
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Install test framework and code quality tools
RUN npm install -g jest eslint && \
    pip3 install --break-system-packages pylint flake8

# Copy test runner
COPY test-runner.js /app/

# Default command (will be overridden during evaluation)
CMD ["node", "test-runner.js"]

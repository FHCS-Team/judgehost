FROM node:18-alpine

# Install curl and testing tools
RUN apk add --no-cache curl jq

WORKDIR /app

# Copy test files
COPY api-test-runner.js /app/
COPY package.json /app/

# Install dependencies
RUN npm install

# Default command
CMD ["node", "api-test-runner.js"]

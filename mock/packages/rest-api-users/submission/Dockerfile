FROM node:18-alpine

# Install security scanning tools
RUN apk add --no-cache curl git && \
    npm install -g eslint npm-audit-resolver snyk

WORKDIR /app

# Copy package template
COPY package.json /app/

# Install dependencies
RUN npm install

# Default command
CMD ["npm", "start"]

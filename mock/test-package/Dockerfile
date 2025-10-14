FROM node:18-alpine

# Install essential tools for testing and script execution
# - curl: for making HTTP requests to test the API
# - bash: for running hook scripts  
# - jq: for parsing JSON responses
# - coreutils: provides GNU versions of cat, tail, head, etc.
RUN apk add --no-cache curl bash jq coreutils

# Create workspace
WORKDIR /workspace
RUN mkdir -p /workspace/problem /workspace/submission /workspace/out

# Copy problem files
COPY . /workspace/problem/

# Install required npm packages that submissions will need
# This is done at problem build time with network enabled
# Submissions will use these pre-installed packages
RUN cd /workspace/problem && \
    if [ -f package.json ]; then \
        npm install --production && \
        npm cache clean --force; \
    fi

# Set environment variables
ENV WORKSPACE_DIR=/workspace
ENV PROBLEM_DIR=/workspace/problem
ENV SUBMISSION_DIR=/workspace/submission
ENV OUT_DIR=/workspace/out
ENV NODE_ENV=test
ENV PORT=3000

# The tools and entrypoint will be mounted at runtime

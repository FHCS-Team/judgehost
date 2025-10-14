FROM node:18-alpine

# Install curl for testing
RUN apk add --no-cache curl bash jq

# Create workspace
WORKDIR /workspace
RUN mkdir -p /workspace/problem /workspace/submission /workspace/out

# Copy problem files
COPY . /workspace/problem/

# Set environment variables
ENV WORKSPACE_DIR=/workspace
ENV PROBLEM_DIR=/workspace/problem
ENV SUBMISSION_DIR=/workspace/submission
ENV OUT_DIR=/workspace/out
ENV NODE_ENV=test
ENV PORT=3000

# The tools and entrypoint will be mounted at runtime

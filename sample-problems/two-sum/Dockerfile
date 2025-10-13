FROM python:3.11-slim

# Install basic tools
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    time \
    && rm -rf /var/lib/apt/lists/*

# Create workspace structure
WORKDIR /workspace
RUN mkdir -p /workspace/problem /workspace/submission /workspace/out

# Copy problem files
COPY . /workspace/problem/

# Install any problem-specific dependencies
RUN if [ -f /workspace/problem/requirements.txt ]; then \
        pip install --no-cache-dir -r /workspace/problem/requirements.txt; \
    fi

# Set environment variables
ENV WORKSPACE_DIR=/workspace
ENV PROBLEM_DIR=/workspace/problem
ENV SUBMISSION_DIR=/workspace/submission
ENV OUT_DIR=/workspace/out

# The tools and entrypoint will be mounted at runtime

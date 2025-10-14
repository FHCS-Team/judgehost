FROM postgres:14-alpine

# Install required tools
RUN apk add --no-cache \
    bash \
    python3 \
    py3-pip \
    curl \
    jq \
    bc

# Install Python dependencies
RUN pip3 install --no-cache-dir psycopg2-binary

# Set timezone
ENV TZ=UTC

# Database connection info
ENV PGHOST=database
ENV PGPORT=5432
ENV PGDATABASE=hackathon_db
ENV PGUSER=judge
ENV PGPASSWORD=judgepass

# Create workspace
RUN mkdir -p /workspace /submission /shared

WORKDIR /workspace

CMD ["bash"]

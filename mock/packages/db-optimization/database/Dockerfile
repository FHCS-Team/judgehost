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

# PostgreSQL environment
ENV POSTGRES_DB=hackathon_db
ENV POSTGRES_USER=judge
ENV POSTGRES_PASSWORD=judgepass
ENV PGDATA=/var/lib/postgresql/data/pgdata

# Create workspace
RUN mkdir -p /workspace /submission

WORKDIR /workspace

# PostgreSQL will start automatically
CMD ["postgres"]

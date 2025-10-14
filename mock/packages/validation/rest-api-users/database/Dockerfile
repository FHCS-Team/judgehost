FROM postgres:15-alpine

# Set environment variables
ENV POSTGRES_USER=testuser
ENV POSTGRES_PASSWORD=testpass
ENV POSTGRES_DB=usersdb

# Copy initialization script
COPY data/init.sql /docker-entrypoint-initdb.d/

# Health check
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD pg_isready -U testuser -d usersdb || exit 1

# Expose PostgreSQL port
EXPOSE 5432

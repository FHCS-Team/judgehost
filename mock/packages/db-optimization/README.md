# Database Query Optimization Challenge

## Problem Statement

Optimize three SQL queries on a PostgreSQL database with 1M+ event records to run in ≤2 seconds each.

## Database Schema

### Events Table (1M+ records)

```sql
CREATE TABLE events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id BIGINT,
    event_type VARCHAR(50),
    event_ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    payload JSONB
);
```

### Users Table (100K records)

```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    signup_ts TIMESTAMP,
    country CHAR(2),
    plan VARCHAR(20)
);
```

### Devices Table (50K records)

```sql
CREATE TABLE devices (
    device_id BIGINT PRIMARY KEY,
    device_type VARCHAR(30),
    os_version VARCHAR(20)
);
```

## Queries to Optimize

See `database/data/baseline_Q*.sql` for the three queries you need to optimize.

## Submission Format

Submit a ZIP containing:

- `migration.sql` - Schema changes (indexes, partitions, views)
- `Q1.sql` - Optimized query 1
- `Q2.sql` - Optimized query 2
- `Q3.sql` - Optimized query 3

## Evaluation Criteria

- **50% Correctness** - Results must be exact and in order
- **30% Query Latency** - Target <2s per query (5s timeout)
- **10% Concurrency** - Throughput under 10 concurrent clients
- **10% Storage Efficiency** - Additional storage ≤30% of base size

## Constraints

- PostgreSQL 14
- 2 vCPU, 2GB RAM (database), 1 vCPU, 1GB RAM (submission)
- Migration timeout: 5 minutes
- Query timeout: 5 seconds each

## Architecture

- **Database Container**: PostgreSQL server running on internal network
- **Submission Container**: Runs your queries via network connection to database

Good luck!

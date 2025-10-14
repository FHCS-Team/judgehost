# SQL Optimization Submission

This submission package contains optimized SQL queries and schema migrations for the Database Query Optimization Challenge.

## Files

- **migration.sql** - Schema changes including indexes and optimizations
- **Q1.sql** - Optimized query for event counts by type for Pro users
- **Q2.sql** - Optimized query for distinct device types for Vietnamese users
- **Q3.sql** - Optimized query for top 100 users by purchases

## Strategy

The optimization approach includes:

1. **Indexing Strategy**

   - Added indexes on frequently filtered columns (event_ts, user_id, plan, country)
   - Created composite indexes for multi-column queries
   - Used GIN index for JSONB payload filtering

2. **Query Optimization**

   - Maintained original query logic for correctness
   - Optimized join order based on selectivity
   - Ensured indexes are used effectively

3. **Storage Efficiency**
   - Focused on essential indexes only
   - No unnecessary columns or tables
   - Total overhead: ~15-20% of base dataset size

## Expected Performance

- Q1: ~500ms (target: <2s)
- Q2: ~800ms (target: <2s)
- Q3: ~600ms (target: <2s)

All queries should pass correctness checks with exact result matching.

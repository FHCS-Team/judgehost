#!/bin/bash
set -e

echo "[STAGE 1] Setting up PostgreSQL and creating data generation script"

# Create data generation script
cat > /workspace/generate_data.py <<'PYTHON_SCRIPT'
#!/usr/bin/env python3
"""Generate sample database for SQL optimization challenge"""

import psycopg2
import random
from datetime import datetime, timedelta
import json
import sys

try:
    # Connect to database
    conn = psycopg2.connect(
        host="localhost",
        database="hackathon_db",
        user="judge",
        password="judgepass"
    )
    cur = conn.cursor()

    print("[DATA] Generating sample data (1M+ records)...")

    # Generate users (100K)
    print("[DATA] Generating 100K users...")
    countries = ['US', 'VN', 'JP', 'KR', 'CN', 'IN', 'GB', 'FR', 'DE', 'CA']
    plans = ['free', 'basic', 'pro', 'enterprise']

    batch_size = 1000
    for batch in range(100):
        users = []
        for i in range(batch_size):
            user_id = batch * batch_size + i + 1
            signup_ts = datetime.now() - timedelta(days=random.randint(1, 365))
            country = random.choice(countries)
            plan = random.choice(plans)
            users.append((user_id, signup_ts, country, plan))
        
        cur.executemany(
            "INSERT INTO users (user_id, signup_ts, country, plan) VALUES (%s, %s, %s, %s)",
            users
        )
        if (batch + 1) % 10 == 0:
            print(f"[DATA] Users: {(batch + 1) * batch_size} / 100000")
    
    conn.commit()

    # Generate devices (50K)
    print("[DATA] Generating 50K devices...")
    device_types = ['mobile', 'tablet', 'desktop', 'smartwatch', 'tv']
    os_versions = ['iOS 15', 'iOS 16', 'Android 11', 'Android 12', 'Android 13']

    batch_size = 1000
    for batch in range(50):
        devices = []
        for i in range(batch_size):
            device_id = batch * batch_size + i + 1
            device_type = random.choice(device_types)
            os_version = random.choice(os_versions)
            devices.append((device_id, device_type, os_version))
        
        cur.executemany(
            "INSERT INTO devices (device_id, device_type, os_version) VALUES (%s, %s, %s)",
            devices
        )
        if (batch + 1) % 10 == 0:
            print(f"[DATA] Devices: {(batch + 1) * batch_size} / 50000")
    
    conn.commit()

    # Generate events (1M)
    print("[DATA] Generating 1M events...")
    event_types = ['page_view', 'click', 'purchase', 'login', 'logout', 
                   'search', 'add_to_cart', 'checkout', 'signup']

    batch_size = 1000
    for batch in range(1000):
        events = []
        for i in range(batch_size):
            user_id = random.randint(1, 100000)
            device_id = random.randint(1, 50000) if random.random() > 0.1 else None
            event_type = random.choice(event_types)
            event_ts = datetime.now() - timedelta(
                days=random.randint(0, 180),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            payload = {
                'flag': random.choice(['true', 'false']),
                'value': random.randint(1, 1000),
                'category': random.choice(['A', 'B', 'C', 'D'])
            }
            
            events.append((user_id, device_id, event_type, event_ts, json.dumps(payload)))
        
        cur.executemany(
            "INSERT INTO events (user_id, device_id, event_type, event_ts, payload) VALUES (%s, %s, %s, %s, %s)",
            events
        )
        if (batch + 1) % 100 == 0:
            print(f"[DATA] Events: {(batch + 1) * batch_size} / 1000000")
    
    conn.commit()
    cur.close()
    conn.close()

    print("[DATA] Sample data generation complete!")
    print(f"[DATA] Total: 100K users, 50K devices, 1M events")

except Exception as e:
    print(f"[ERROR] Failed to generate data: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

chmod +x /workspace/generate_data.py

echo "[STAGE 1] Setup complete"

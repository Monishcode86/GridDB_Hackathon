import json
import random
import requests
from datetime import datetime, timedelta
import pytz
import os

ist = pytz.timezone("Asia/Kolkata")
GRIDDB_WEBURL = os.getenv("GRIDDB_WEBURL")
GRIDDB_AUTH = os.getenv("GRIDDB_AUTH")
EVENT_CONTAINER = os.getenv("EVENT_CONTAINER")

# -----------------------------
# GridDB Configuration
# -----------------------------
url = f"{GRIDDB_WEBURL}/containers/{EVENT_CONTAINER}/rows"

headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": GRIDDB_AUTH,
    "User-Agent": "telemetrygrid/1.0.0"
}

# -----------------------------
# Parameters
# -----------------------------
start_time = datetime.fromisoformat("2025-01-05T03:50:42.753+00:00")
end_time   = datetime.fromisoformat("2025-12-31T04:00:42.753+00:00")

device_id = "34851867901C"
modes = ["Idle", "Running", "Breakdown", "Off"]

delta = timedelta(seconds=60)   # 1 minutes
batch_size = 500

min_hold = 10
max_hold = 20
current_mode = random.choice(modes)
hold_counter = random.randint(min_hold, max_hold)

# -----------------------------
# Helper
# -----------------------------
def random_float(min_val, max_val, decimals=6):
    return round(random.uniform(min_val, max_val), decimals)

# -----------------------------
# Batch Insert Logic
# -----------------------------
counter = 0
current_time = start_time
batch_rows = []

while current_time <= end_time:
    timestamp = current_time.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    row = [
        timestamp,
        device_id,
        int(current_time.astimezone(ist).timestamp() * 1000),
        current_time.strftime('%Y-%m-%d'),
        counter,
        current_mode,
        random_float(0, 5),
        random_float(0, 3),
        random_float(0, 4),
        random_float(0, 6.01)
    ]

    batch_rows.append(row)
    counter += 1
    current_time += delta

    # mode hold logic (unchanged)
    hold_counter -= 1
    if hold_counter <= 0:
        current_mode = random.choice(modes)
        hold_counter = random.randint(min_hold, max_hold)

    # -----------------------------
    # Send batch
    # -----------------------------
    if len(batch_rows) >= batch_size:
        response = requests.put(url, headers=headers, data=json.dumps(batch_rows))
        print(f"Inserted batch of {len(batch_rows)} rows | Status: {response.status_code}")
        batch_rows.clear()

# -----------------------------
# Send remaining rows
# -----------------------------
if batch_rows:
    response = requests.put(url, headers=headers, data=json.dumps(batch_rows))
    print(f"Inserted final batch of {len(batch_rows)} rows | Status: {response.status_code}")

print("✅ Data dump completed successfully!")

import os
import logging
import pytz
import httpx
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()

BASE_URL = os.getenv("GRIDDB_WEBURL")
GRIDDB_AUTH = os.getenv("GRIDDB_AUTH")
EVENT_CONTAINER = os.getenv("EVENT_CONTAINER")

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": GRIDDB_AUTH,
    "User-Agent": "telemetrygrid/1.0.0"
}

SHIFT_TIME = float(os.getenv("SHIFT_TIME", 1))        # hours
BREAK_TIME = float(os.getenv("BREAK_TIME", 0.5))      # hours
config_eneryCost = float(os.getenv("config_eneryCost") or 15)  # per hour
machineCost = float(os.getenv("machineCost") or 5)   # per hour

tz = pytz.timezone("Asia/Kolkata")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

@router.get("/report")
async def report(req: Request):

    device_id = req.query_params.get("deviceId")
    fromDate = req.query_params.get("fromDate")
    toDate = req.query_params.get("toDate")

    if not device_id or not fromDate or not toDate:
        raise HTTPException(status_code=400, detail="deviceId and dates are required")

    cursor_ts = fromDate + "T00:00:00.000Z"
    end_ts = toDate + "T23:59:59.999Z"

    BATCH_SIZE = 10_000

    total_energy = 0.0
    total_digital_pin = 0
    mode_durations = defaultdict(float)

    all_timestamps = []
    all_energy = []

    prev_pc_global = None

    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            stmt = (
                f"SELECT * FROM {EVENT_CONTAINER} "
                f"WHERE tenantID = '{device_id}' "
                f"AND timeStamp > TIMESTAMP('{cursor_ts}') "
                f"AND timeStamp <= TIMESTAMP('{end_ts}') "
                f"ORDER BY timeStamp "
                f"LIMIT {BATCH_SIZE}"
            )

            res = await client.post(
                f"{BASE_URL}/sql",
                headers=HEADERS,
                json=[{"stmt": stmt}]
            )
            res.raise_for_status()

            data = res.json()[0]
            rows = data.get("results", [])

            if not rows:
                break

            cols = [c["name"] for c in data["columns"]]
            ts_i = cols.index("timeStamp")
            pc_i = cols.index("digital_pin")
            mode_i = cols.index("machine_mode")
            en_i = cols.index("energy")

            batch_len = len(rows)

            # process rows
            for r in rows:
                ts = r[ts_i]
                curr_pc = r[pc_i]
                mode = r[mode_i]
                energy = float(r[en_i] or 0)

                # collect arrays
                all_timestamps.append(ts)
                all_energy.append(energy)

                # aggregate
                total_energy += energy
                mode_durations[mode] += 15  # 15 sec sampling

                # digital pin delta (row by row, ignore negative)
                if prev_pc_global is not None and curr_pc is not None:
                    delta = curr_pc - prev_pc_global
                    if delta > 0:
                        total_digital_pin += delta

                prev_pc_global = curr_pc  # carry to next row/batch

            # update pagination cursor
            cursor_ts = rows[-1][ts_i]

            rows.clear()

            if batch_len < BATCH_SIZE:
                break

    response = {
        "deviceId": device_id,
        "timeStamps": all_timestamps,
        "energyArray": all_energy,
        "totalParts": total_digital_pin,
        "totalEnergy": round(total_energy, 2),
        "energyCost": round(total_energy * config_eneryCost, 2),
        "modeDurations": dict(mode_durations)
    }

    return JSONResponse(
        status_code=200,
        content=response,
        headers={"Access-Control-Allow-Origin": "*"}
    )


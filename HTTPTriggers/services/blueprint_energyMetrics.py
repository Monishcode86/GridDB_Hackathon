import logging
import os
import httpx
import pytz
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

tz = pytz.timezone("Asia/Kolkata")

def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

def parse_ts(ts: str) -> datetime:
    if ts.endswith("Z"):
        ts = ts[:-1]
    return datetime.fromisoformat(ts)

def increase_count(arr):
    result = [0]
    for i in range(1, len(arr)):
        result.append(max(0, arr[i] - arr[i-1]))
    return result

@router.get("/energyMetrics")
async def energyMetrics(req: Request):
    logger.info("energyMetrics triggered")

    try:
        device_id = req.query_params.get("deviceId")
        date = req.query_params.get("date")

        if not device_id or not date:
            raise HTTPException(
                status_code=400,
                detail="deviceId and date are required"
            )

        BASE_URL = get_env("GRIDDB_WEBURL")
        EVENT_CONTAINER = get_env("EVENT_CONTAINER")
        HOURLY_CONTAINER = get_env("HOURLY_CONTAINER")
        GRIDDB_AUTH = get_env("GRIDDB_AUTH")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": GRIDDB_AUTH,
            "User-Agent": "telemetrygrid/1.0.0 (fastapi; python)",
        }

        async with httpx.AsyncClient(timeout=10) as client:

            # EVENT DATA
            event_stmt = (
                f"SELECT timeStamp, digital_pin, energy "
                f"FROM {EVENT_CONTAINER} "
                f"WHERE tenantID = '{device_id}' AND date = '{date}' "
                f"ORDER BY timeStamp"
            )
            res = await client.post(
                f"{BASE_URL}/sql",
                headers=headers,
                json=[{"stmt": event_stmt}],
            )
            res.raise_for_status()

            event_data = res.json()[0]
            event_columns = [c["name"] for c in event_data["columns"]]
            event_index = {name: idx for idx, name in enumerate(event_columns)}
            event_rows = event_data.get("results", [])

            # HOURLY DATA
            hourly_stmt = (
                f"SELECT startHour,endHour,energy "
                f"FROM {HOURLY_CONTAINER} "
                f"WHERE deviceId = '{device_id}' AND date = '{date}'"
                f"ORDER BY startHour"
            )

            res = await client.post(
                f"{BASE_URL}/sql",
                headers=headers,
                json=[{"stmt": hourly_stmt}],
            )
            res.raise_for_status()

            hourly_data = res.json()[0]
            hourly_columns = [c["name"] for c in hourly_data["columns"]]
            hourly_index = {name: idx for idx, name in enumerate(hourly_columns)}
            hourly_rows = hourly_data.get("results", [])

        result = {
            "timeStamp": [],
            "partCount": [],
            "energy": [],
            "hours": [],
            "hourlyEnergy": [],
        }

        # Hourly aggregation
        for row in hourly_rows:
            start = row[hourly_index["startHour"]]
            end = row[hourly_index["endHour"]]
            energy = row[hourly_index["energy"]]

            result["hours"].append(f"{start}-{end}")
            result["hourlyEnergy"].append(energy)

        # Event aggregation
        for row in event_rows:
            result["timeStamp"].append(row[event_index["timeStamp"]])
            result["partCount"].append(row[event_index["digital_pin"]])
            result["energy"].append(row[event_index["energy"]])
        
        ## CURRENT HOUR (REAL-TIME)
        now = datetime.now(tz)
        is_today = date == now.strftime("%Y-%m-%d")
        current_hour = now.hour

        if is_today and event_rows:
            current_hour_events = []

            for row in event_rows:
                ts = row[event_index["timeStamp"]]
                ts_dt = parse_ts(ts)

                if ts_dt.hour == current_hour:
                    current_hour_events.append(row)

            current_hour_energy = round(sum(
                row[event_index["energy"]]
                    for row in current_hour_events
                        if isinstance(row[event_index["energy"]], (int, float))
            ),2)

            result["hours"].append(f"{current_hour:02d}:00-{current_hour + 1:02d}:00")
            result["hourlyEnergy"].append(current_hour_energy)

        result["partCount"] = increase_count(result["partCount"])

        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in energyMetrics")
        raise HTTPException(status_code=500, detail="Internal server error")

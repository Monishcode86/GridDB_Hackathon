import logging
import os
import httpx
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

def build_start_timestamp(date_str: str) -> str:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be in YYYY-MM-DD format")

    return f"{date_str}T00:00:00.000Z"

def format_LTS(ts: str) -> str:
    date_part, time_part = ts.split("T")
    y, m, d = date_part.split("-")
    time_part = time_part.split(".")[0]
    return f"{d}-{m}-{y} {time_part}"

@router.get("/parameterMetrics")
async def parameterMetrics(req: Request):
    logger.info("parameterMetrics triggered")

    try:
        device_id = req.query_params.get("deviceId")
        date = req.query_params.get("date")

        if not device_id or not date:
            raise HTTPException(status_code=400, detail="deviceId and date are required")

        startTimeStamp = build_start_timestamp(date)
        endTimeStamp = startTimeStamp.split("T")[0] + "T23:59:59.999Z"

        BASE_URL = get_env("GRIDDB_WEBURL")
        ROW_CONTAINER = get_env("ROW_CONTAINER")
        EVENT_CONTAINER = get_env("EVENT_CONTAINER")
        GRIDDB_AUTH = get_env("GRIDDB_AUTH")
        config_energyCost = float(get_env("config_eneryCost"))

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": GRIDDB_AUTH,
            "User-Agent": "telemetrygrid/1.0.0 (fastapi; python)",
        }

        # ---------------- ROW DATA ----------------
        row_stmt = f"""
            SELECT
                TimeStamp,
                Voltage_R, Voltage_Y, Voltage_B,
                Current_R, Current_Y, Current_B,
                PowerFactor_R, PowerFactor_Y, PowerFactor_B
            FROM {ROW_CONTAINER}
            WHERE TenantId = '{device_id}'
            AND TimeStamp >= TIMESTAMP('{startTimeStamp}')
            AND TimeStamp <= TIMESTAMP('{endTimeStamp}')
            ORDER BY TimeStamp
        """

        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{BASE_URL}/sql",
                headers=headers,
                json=[{"stmt": row_stmt.strip()}],
            )
            res.raise_for_status()

            row_data = res.json()[0]
            columns = [c["name"] for c in row_data["columns"]]
            col_idx = {name: idx for idx, name in enumerate(columns)}
            rows = row_data.get("results", [])

            # ---------------- EVENT DATA ----------------
            event_stmt = f"""
                SELECT
                    real_power,
                    reactive_power,
                    apparent_power,
                    energy
                FROM {EVENT_CONTAINER}
                WHERE tenantID = '{device_id}'
                  AND date = '{date}'
                ORDER BY timeStamp
            """

            res = await client.post(
                f"{BASE_URL}/sql",
                headers=headers,
                json=[{"stmt": event_stmt.strip()}],
            )
            res.raise_for_status()

            event_data = res.json()[0]
            event_columns = [c["name"] for c in event_data["columns"]]
            event_index = {name: idx for idx, name in enumerate(event_columns)}
            event_rows = event_data.get("results", [])

        #  BUILD RESULT (ROW) 
        result = {col: [] for col in columns}

        for row in rows:
            for col in columns:
                result[col].append(row[col_idx[col]])

        #  INIT EVENT ARRAYS 
        for col in event_columns:
            result[col] = []

        energy = real_power = reactive_power = apparent_power = 0.0

        for row in event_rows:
            for col in event_columns:
                result[col].append(row[event_index[col]])

            energy += float(row[event_index["energy"]] or 0)
            real_power += float(row[event_index["real_power"]] or 0)
            reactive_power += float(row[event_index["reactive_power"]] or 0)
            apparent_power += float(row[event_index["apparent_power"]] or 0)

        result.update({
            "TotalEnergy": energy,
            "TotalEnergyCost": round(energy * config_energyCost, 2),
            "TotalReal_power": real_power,
            "TotalReactive_power": reactive_power,
            "TotalApparent_power": apparent_power,
            "LTU": format_LTS(result["TimeStamp"][-1]) if result.get("TimeStamp") else None,
        })

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
    except Exception:
        logger.exception("Error in parameterMetrics")
        raise HTTPException(status_code=500, detail="Internal server error")

from fastapi.responses import JSONResponse
from fastapi import APIRouter, Request, HTTPException
import logging
import requests
import os
from datetime import datetime

router = APIRouter()

BASE_URL = os.getenv("GRIDDB_WEBURL")
CONTAINER = os.getenv("GRIDDB_CONTAINER")
GRIDDB_AUTH = os.getenv("GRIDDB_AUTH")

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": GRIDDB_AUTH,
    "User-Agent": "telemetrygrid/1.0.0"
}

@router.api_route("/device", methods=["GET", "POST", "PUT", "DELETE"])
async def device(req: Request):
    method = req.method.upper()

    try:
        if method == "POST":
            return await create_device(req)

        if method == "GET":
            return await get_device(req)

        if method == "PUT":
            return await update_device(req)

        if method == "DELETE":
            return await delete_device(req)

        raise HTTPException(status_code=405, detail="Method not allowed")

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Unexpected error")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- CREATE ----------------
async def create_device(req: Request):
    body = await req.json()
    device_id = body.get("deviceId")

    if not device_id:
        raise HTTPException(status_code=400, detail="deviceId is required")

    # Check if device already exists
    if device_exists(device_id):
        raise HTTPException(
            status_code=409,
            detail=f"Device - '{device_id}' already exists"
        )

    now = datetime.utcnow().isoformat() + "Z"

    row = [
        device_id,
        body.get("deviceName"),
        body.get("deviceType"),
        body.get("deviceController"),
        body.get("deviceModal"),
        body.get("deviceManufacture"),
        body.get("deviceFrequency"),
        body.get("devicephaseSequence"),
        body.get("devicepgaGainConfig"),
        body.get("deviceMode"),
        now,
        now
    ]

    url = f"{BASE_URL}/containers/{CONTAINER}/rows"

    res = requests.put(url, headers=HEADERS, json=[row], timeout=10)
    res.raise_for_status()

    return JSONResponse(
        status_code=201,
        content={"status": "CREATED", "deviceId": device_id}
    )

def device_exists(device_id: str):
    stmt = f"SELECT * FROM {CONTAINER} WHERE deviceId = '{device_id}'"
    url = f"{BASE_URL}/sql"
    payload = [{"stmt": stmt}]

    res = requests.post(
        url,
        headers=HEADERS,
        json=payload,
        timeout=10
    )
    res.raise_for_status()

    data = res.json()[0]
    rows = data.get("results", [])

    if not rows:
        return None

    columns = [col["name"] for col in data["columns"]]
    return dict(zip(columns, rows[0]))

# ---------------- READ ----------------
async def get_device(req: Request):
    device_id = req.query_params.get("deviceId")

    if device_id:
        stmt = f"SELECT * FROM {CONTAINER} WHERE deviceId = '{device_id}'"
    else:
        stmt = f"SELECT * FROM {CONTAINER}"

    url = f"{BASE_URL}/sql"
    payload = [{"stmt": stmt}]

    res = requests.post(url, headers=HEADERS, json=payload, timeout=10)
    res.raise_for_status()

    data = res.json()[0]
    columns = [col["name"] for col in data["columns"]]
    rows = data["results"]

    readable_data = [dict(zip(columns, row)) for row in rows]

    return JSONResponse(status_code=200, content=readable_data)


# ---------------- UPDATE ----------------
async def update_device(req: Request):
    body = await req.json()
    device_id = body.get("deviceId")

    if not device_id:
        raise HTTPException(status_code=400, detail="deviceId is required")

    existing = device_exists(device_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Device '{device_id}' not found"
        )

    now = datetime.utcnow().isoformat() + "Z"

    row = [
        device_id, 
        body.get("deviceName", existing["deviceName"]),
        body.get("deviceType", existing["deviceType"]),
        body.get("deviceController", existing["deviceController"]),
        body.get("deviceModal", existing["deviceModal"]),
        body.get("deviceManufacture", existing["deviceManufacture"]),
        body.get("deviceFrequency", existing["deviceFrequency"]),
        body.get("devicephaseSequence", existing["devicephaseSequence"]),
        body.get("devicepgaGainConfig", existing["devicepgaGainConfig"]),
        body.get("deviceMode", existing["deviceMode"]),
        existing["createdAt"],     
        now        
    ]

    url = f"{BASE_URL}/containers/{CONTAINER}/rows"
    res = requests.put(url, headers=HEADERS, json=[row], timeout=10)
    res.raise_for_status()

    return JSONResponse(
        status_code=200,
        content={
            "status": "UPDATED",
            "deviceId": device_id,
            "updatedAt": now
        }
    )

# ---------------- DELETE ----------------
async def delete_device(req: Request):
    device_id = req.query_params.get("deviceId")

    if not device_id:
        raise HTTPException(status_code=400, detail="deviceId query param required")

    url = f"{BASE_URL}/containers/{CONTAINER}/rows"
    res = requests.delete(url, headers=HEADERS, json=[device_id], timeout=10)
    res.raise_for_status()

    return {"status": "DELETED"}

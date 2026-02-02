from fastapi.responses import JSONResponse
from fastapi import APIRouter, Request, HTTPException
import logging
import requests
import os
from datetime import datetime

router = APIRouter()

BASE_URL = os.getenv("GRIDDB_WEBURL")
GRIDDB_AUTH = os.getenv("GRIDDB_AUTH")
DOWNTIME_CONTAINER = os.getenv("DOWNTIME_CONTAINER")

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": GRIDDB_AUTH,
    "User-Agent": "telemetrygrid/1.0.0"
}

@router.api_route("/entry",methods=["POST"])
async def downtimeEntry(req: Request):
    method = req.method.upper()

    try:
        if method != "POST":
            raise HTTPException(status_code=405, detail="Method not allowed")

        body = await req.json()
        device_id = body.get("deviceId")

        if not device_id:
            raise HTTPException(status_code=400, detail="deviceId is required")

        now = datetime.utcnow().isoformat() + "Z"
        date = body.get("date")
        fromTo = body.get("fromTo")
        key = f"{device_id}|{date}|{fromTo}"

        row = [
            key,
            device_id,
            date,
            fromTo,
            body.get("name"),
            body.get("reason"),
            now
        ]

        url = f"{BASE_URL}/containers/{DOWNTIME_CONTAINER}/rows"
        res = requests.put(url, headers=HEADERS, json=[row], timeout=10)
        res.raise_for_status()
            
        return JSONResponse(
            status_code=201,
            content={"status": "ok"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Unexpected error")
        raise HTTPException(status_code=500, detail=str(e))
import logging
import os
import asyncio
import httpx

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

BASE_URL = os.getenv("GRIDDB_WEBURL")
ROW_CONTAINER = os.getenv("ROW_CONTAINER")
EVENT_CONTAINER = os.getenv("EVENT_CONTAINER")
GRIDDB_AUTH = os.getenv("GRIDDB_AUTH")

if not all([BASE_URL, ROW_CONTAINER, EVENT_CONTAINER, GRIDDB_AUTH]):
    raise RuntimeError("Missing required GridDB environment variables")

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": GRIDDB_AUTH,
    "User-Agent": "telemetrygrid/2.0.0",
}

GRIDDB_COLUMNS_ROWDATA = [
    "TimeStamp","PartitionKey","upTimeDuration","DigitalInput1",
    "NumberPulses_DigitalInput1","DigitalInput2",
    "NumberPulses_DigitalInput2","AnalogInput1","AnalogInput2",
    "Voltage_R","Voltage_Y","Voltage_B",
    "Current_R","Current_Y","Current_B",
    "PowerFactor_R","PowerFactor_Y","PowerFactor_B",
    "PowerAngle_R","PowerAngle_Y","PowerAngle_B",
    "Frequency","Total_ImportEnergyConsumption",
    "Total_ExportEnergyConsumption","Status"
]

GRIDDB_COLUMNS_ENERGYDATA = [
    "TimeStamp","TenantID","ts_epoch","date_part",
    "digital_pin","digital_GantChartEqp",
    "real_power","reactive_power",
    "apparent_power","energy"
]

#  REUSE CLIENT 
client = httpx.AsyncClient(timeout=3)

@router.post("/event")
async def eventProcess(req: Request):
    try:
        body = await req.json()
        rowData = body["rowData"]
        energyData = body["energyData"]

        row_rowdata = [rowData.get(c) for c in GRIDDB_COLUMNS_ROWDATA]
        row_energy = [energyData.get(c) for c in GRIDDB_COLUMNS_ENERGYDATA]

        #  PARALLEL GRIDDB WRITES 
        task1 = client.put(
            f"{BASE_URL}/containers/{ROW_CONTAINER}/rows",
            json=[row_rowdata],
            headers=HEADERS,
        )

        task2 = client.put(
            f"{BASE_URL}/containers/{EVENT_CONTAINER}/rows",
            json=[row_energy],
            headers=HEADERS,
        )

        resp1, resp2 = await asyncio.gather(task1, task2)

        if resp1.status_code >= 300 or resp2.status_code >= 300:
            logger.error("GridDB error %s %s", resp1.text, resp2.text)
            raise HTTPException(status_code=502, detail="GridDB write failed")

        return JSONResponse(
            status_code=200,
            content={"status": "ok"},
        )

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field {e}")
    except Exception:
        logger.exception("eventProcess failed")
        raise HTTPException(status_code=500, detail="Internal server error")

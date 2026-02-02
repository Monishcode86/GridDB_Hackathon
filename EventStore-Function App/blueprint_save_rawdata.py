import json
import math
import logging
import os
import asyncio
import httpx
import azure.functions as func
from datetime import datetime, timezone
import pytz

blueprint_save_rawdata = func.Blueprint()
logger = logging.getLogger(__name__)

SEMAPHORE_LIMIT = 2   # max parallel EH messages per instance
semaphore = asyncio.Semaphore(SEMAPHORE_LIMIT)

# Global HTTP client (connection reuse)
client = httpx.AsyncClient(
    timeout=httpx.Timeout(
        connect=2.0,
        read=10.0,
        write=2.0,
        pool=2.0
    ),
    limits=httpx.Limits(
        max_keepalive_connections=10,
        max_connections=20
    )
)

API_URL = os.getenv("APP_SERVICE_EVENT_API")
TIMEZONE = "Asia/Kolkata"

def epoch_ms_to_iso(ts_ms: int, tz_name: str) -> str:
    return (
        datetime
        .fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        .astimezone(pytz.timezone(tz_name))
        .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
        + "Z"
    )

# EventHub Trigger
@blueprint_save_rawdata.event_hub_message_trigger(
    arg_name="azeventhub",
    event_hub_name="iothub-ehub-iotprodhub-56152492-529f9915e4",
    consumer_group="development",
    connection="eventhub_connection_string",
    starting_position="@latest"
)
async def eventhub_trigger(azeventhub: func.EventHubEvent):
    async with semaphore:
        try:
            body = azeventhub.get_body().decode("utf-8")
            payload = json.loads(body)

            tenant_id = payload.get("TenantID")
            if not tenant_id or "-" not in tenant_id:
                logger.warning("Invalid TenantID, skipping event")
                return

            partition_key = tenant_id.split("-")[-1]

            rowData = build_row_data(payload, partition_key)
            energyData = build_energy_data(payload, partition_key)

            if not rowData or not energyData:
                logger.warning("Incomplete data, skipping event")
                return

            api_payload = {
                "rowData": rowData,
                "energyData": energyData
            }

            resp = await client.post(
                API_URL,
                json=api_payload,
                headers={"Content-Type": "application/json"}
            )

            if resp.status_code >= 300:
                logger.error("API failed %s %s", resp.status_code, resp.text)
            else:
                logger.info("API success")

        except Exception as ex:
            logger.exception("EventHub processing failed: %s", ex)

# S01 schema mapping
S01_SCHEMA = {
    "Timestamp": 0,
    "DigitalInput1": 1,
    "NumberPulses_DigitalInput1": 2,
    "DigitalInput2": 3,
    "NumberPulses_DigitalInput2": 4,
    "AnalogInput1": 5,
    "AnalogInput2": 6,
    "Voltage_R": 7,
    "Voltage_Y": 8,
    "Voltage_B": 9,
    "Current_R": 10,
    "Current_Y": 11,
    "Current_B": 12,
    "PowerFactor_R": 13,
    "PowerFactor_Y": 14,
    "PowerFactor_B": 15,
    "PowerAngle_R": 16,
    "PowerAngle_Y": 17,
    "PowerAngle_B": 18,
    "Frequency": 19,
    "Total_ImportEnergyConsumption": 20,
    "Total_ExportEnergyConsumption": 21,
    "Status": 22,
}

def map_s01(S01: list, timezone: str) -> dict:
    mapped = {}
    for key, idx in S01_SCHEMA.items():
        value = S01[idx] if idx < len(S01) else 0
        if isinstance(value, (int, float)):
            value = abs(value)
        mapped[key] = value

    mapped["TimeStamp"] = epoch_ms_to_iso(mapped.pop("Timestamp"), timezone)
    return mapped

# Row data builder
def build_row_data(data: dict, pk: str):
    raw = {
        "PartitionKey": pk,
        "upTimeDuration": data.get("upTimeDuration", 0)
    }

    if "S01" in data:
        raw.update(map_s01(data["S01"], TIMEZONE))

    return raw

# Energy data builder
def build_energy_data(data: dict, TenantID: str, timezone="Asia/Kolkata"):
    value = data.get("S01", [])
    if not value or not TenantID:
        return None

    ts_epoch = value[0]
    TimeStamp = epoch_ms_to_iso(ts_epoch, timezone)
    date_part = TimeStamp.split("T")[0]
    digital_pin = value[2]

    vr = abs(value[7]) if len(value) > 7 else 0
    vy = abs(value[8]) if len(value) > 8 else 0
    vb = abs(value[9]) if len(value) > 9 else 0

    ir = value[10] if len(value) > 10 else 0
    iy = value[11] if len(value) > 11 else 0
    ib = value[12] if len(value) > 12 else 0

    pfr = abs(value[13]) if len(value) > 13 else 0
    pfy = abs(value[14]) if len(value) > 14 else 0
    pfb = abs(value[15]) if len(value) > 15 else 0

    sin_r = math.sin(math.radians(abs(value[16]))) if len(value) > 16 else 0
    sin_y = math.sin(math.radians(abs(value[17]))) if len(value) > 17 else 0
    sin_b = math.sin(math.radians(abs(value[18]))) if len(value) > 18 else 0

    status = value[22] if len(value) > 22 else None
    mode_map = {0: "Idle", 1: "Running", 2: "Breakdown", 3: "Interlock", 4: "Off"}
    machine_mode = mode_map.get(status, "Unknown")

    real_power = vr * ir * pfr + vy * iy * pfy + vb * ib * pfb
    reactive_power = vr * ir * sin_r + vy * iy * sin_y + vb * ib * sin_b
    apparent_power = vr * ir + vy * iy + vb * ib

    energy = real_power * 0.25 / 1000

    return {
        "TimeStamp": TimeStamp,
        "TenantID": TenantID,
        "ts_epoch": ts_epoch,
        "date_part": date_part,
        "digital_pin": digital_pin,
        "digital_GantChartEqp": machine_mode,
        "real_power": real_power,
        "reactive_power": reactive_power,
        "apparent_power": apparent_power,
        "energy": energy
    }

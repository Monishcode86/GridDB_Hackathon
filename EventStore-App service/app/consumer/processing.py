import json
import logging
import math
from app.mappers.s01_mapper import map_s01
from app.utils.time_utils import epoch_ms_to_iso
from app.services.griddb_service import insert_row,insert_energy
 
async def process_rawEvent(data:dict,pk:str,timezone="Asia/Kolkata"):
    try:
        if not pk:
            logging.warning("Missing PartitionKey")
            return

        payload = {
            "PartitionKey": pk,
            "upTimeDuration": data.get("upTimeDuration", 0),
        }

        if "S01" in data:
            payload.update(map_s01(data["S01"], timezone))

        await insert_row(payload)

    except json.JSONDecodeError:
        logging.error("Invalid JSON received")
    except ValueError as ve:
        logging.warning("Validation error")
    except Exception:
        logging.exception("Unhandled error while processing event")
 
 
async def process_energyEvent(data:dict,TenantID:str,timezone="Asia/Kolkata"):

    if not TenantID:
        logging.warning("Missing PartitionKey")
        return
    
    connectionType = "3P-4W"
    
    value = data.get("S01", [])
    if not value:
        return
    

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

    digital_GantChartEqp = value[22] if len(value) > 22 else None

    machine_mode = "Idel"
    if digital_GantChartEqp is not None:
        mode_map = {
            0: "Idle",
            1: "Running",
            2: "Breakdown",
            3: "Interlock",
            4: "Off"
        }
        machine_mode = mode_map.get(digital_GantChartEqp, "Unknown")

    if connectionType in ["3P-4W", "3P-3W"]:
        real_power = (
            vr * ir * pfr +
            vy * iy * pfy +
            vb * ib * pfb
        )

        reactive_power = (
            vr * ir * sin_r +
            vy * iy * sin_y +
            vb * ib * sin_b
        )

        apparent_power = (
            vr * ir +
            vy * iy +
            vb * ib
        )

    elif connectionType == "1P-2W":
        real_power = vr * ir * pfr
        reactive_power = vr * ir * sin_r
        apparent_power = vr * ir

    energy = real_power * 0.25 / 1000


    await insert_energy(
        TimeStamp,
        TenantID,
        ts_epoch,
        date_part,
        digital_pin,
        machine_mode,
        real_power,
        reactive_power,
        apparent_power,
        energy
    )

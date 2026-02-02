from fastapi import APIRouter
import json
import os
import requests
import httpx
from datetime import datetime, timedelta
import pytz
import logging
from fastapi.responses import JSONResponse

router = APIRouter()

BASE_URL = os.getenv("GRIDDB_WEBURL")
GRIDDB_AUTH = os.getenv("GRIDDB_AUTH")
CONTAINER = os.getenv("GRIDDB_CONTAINER")
EVENT_CONTAINER = os.getenv("EVENT_CONTAINER")
HOURLY_CONTAINER = os.getenv("HOURLY_CONTAINER")

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": GRIDDB_AUTH,
    "User-Agent": "telemetrygrid/1.0.0"
}

SHIFT_TIME = float(os.getenv("SHIFT_TIME",1))     # 1 hours
BREAK_TIME = float(os.getenv("BREAK_TIME",0.5))   # 30 minutes
config_eneryCost = float(os.getenv("config_eneryCost") or 15) # Perday
machineCost = float(os.getenv("machineCost") or 5) # Perday

tz = pytz.timezone("Asia/Kolkata")
hourlyEnergyEQP = 15
machineCostperHour = 500

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

def clamp(value: float, min_v=0.0, max_v=100.0) -> float:
    return max(min_v, min(max_v, value))


def previousHour_Window():
    now = datetime.now(tz)
    end = now.replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(hours=1)
    end = end - timedelta(milliseconds=1)

    fmt = lambda dt: dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    return fmt(start), fmt(end)

def format_duration_ms(ms: int) -> str:
    hours = ms // 3_600_000
    ms %= 3_600_000
    minutes = ms // 60_000
    ms %= 60_000
    seconds = ms // 1_000
    millis = ms % 1_000
    return f"{hours:02}:{minutes:02}:{seconds:02}.{millis:03}"
    
def duration_to_hours(duration_str: str) -> float:
    if not duration_str:
        return 0.0
    h, m, rest = duration_str.split(":")
    s, ms = rest.split(".")
    return (int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000) / 3600

def get_devices():
    stmt = f"SELECT deviceId, deviceName FROM {CONTAINER}"
    try:
        res = requests.post(
            f"{BASE_URL}/sql",
            headers=HEADERS,
            json=[{"stmt": stmt}],
            timeout=10
        )
        res.raise_for_status()
        return res.json()[0].get("results", [])
    except Exception as e:
        logging.error(f"Device fetch failed: {e}")
        return []

def get_energy(device_id, start, end):
    stmt = f"""
        SELECT
            ts,
            digital_pin,
            machine_mode,
            real_power,
            reactive_power,
            apparent_power,
            energy
        FROM {EVENT_CONTAINER}
        WHERE tenantID = '{device_id}'
          AND timeStamp >= TIMESTAMP('{start}')
          AND timeStamp <= TIMESTAMP('{end}')
        ORDER BY timeStamp
    """
    try:
        res = requests.post(
            f"{BASE_URL}/sql",
            headers=HEADERS,
            json=[{"stmt": stmt}],
            timeout=15
        )
        res.raise_for_status()
        return res.json()[0].get("results", [])
    except Exception as e:
        logging.error(f"Energy fetch failed for {device_id}: {e}")
        return []

def partcount_digital(values):  # Counter
    if not values:
        return 0

    total_diff = 0
    end = values[0]
    skip_reset = False

    for i in range(1, len(values)):
        val = values[i]
        if val < 0:
            continue
        if val == 0 and end > 0:
            skip_reset = True
            continue
        if skip_reset and val == end:
            continue
        if skip_reset and val != end:
            skip_reset = False
        if val >= end:
            if val > end:
                total_diff += (val - end)
            end = val
        else:
            end = val
            skip_reset = False

    return total_diff


def machine_mode(ts_list, modes):
    if not ts_list or not modes or len(ts_list) != len(modes):
        return [], {}

    packets = []
    color_map = {
        "Idle": "#f7c030",
        "Running": "#548237",
        "Breakdown": "#eb5857",
        "Interlock": "#7B542F",
        "Off": "#b0b0b0"
    }
    total_time = {mode: 0 for mode in color_map}

    start_ts = ts_list[0]
    start_mode = modes[0]

    for i in range(1, len(ts_list)):
        curr_ts = ts_list[i]
        curr_mode = modes[i]
        ts_gap = curr_ts - ts_list[i - 1]

        if curr_mode != start_mode or ts_gap > 60000:
            end_ts = ts_list[i - 1]
            duration_ms = end_ts - start_ts
            duration_str = format_duration_ms(duration_ms)
            total_time[start_mode] += duration_ms

            from_time = datetime.fromtimestamp(start_ts / 1000, tz).strftime("%H:%M:%S.%f")[:-3]
            to_time = datetime.fromtimestamp(end_ts / 1000, tz).strftime("%H:%M:%S.%f")[:-3]

            packets.append({
                "fromTo": f"{from_time} - {to_time}",
                "name": start_mode,
                "value": [0, start_ts, end_ts, duration_str],
                "itemStyle": {"normal": {"color": color_map.get(start_mode)}}
            })

            if ts_gap > 60000:
                off_start = ts_list[i - 1]
                off_end = curr_ts
                off_duration_ms = off_end - off_start
                total_time["Off"] += off_duration_ms

                off_duration_str = format_duration_ms(off_duration_ms)

                off_from = datetime.fromtimestamp(off_start / 1000, tz).strftime("%H:%M:%S.%f")[:-3]
                off_to = datetime.fromtimestamp(off_end / 1000, tz).strftime("%H:%M:%S.%f")[:-3]

                packets.append({
                    "fromTo": f"{off_from} - {off_to}",
                    "name": "Off",
                    "value": [0, off_start, off_end, off_duration_str],
                    "itemStyle": {"normal": {"color": color_map["Off"]}}
                })

            start_ts = curr_ts
            start_mode = curr_mode

    # Last packet
    end_ts = ts_list[-1]
    duration_ms = end_ts - start_ts
    duration_str = format_duration_ms(duration_ms)
    total_time[start_mode] += duration_ms

    from_time = datetime.fromtimestamp(start_ts / 1000, tz).strftime("%H:%M:%S.%f")[:-3]
    to_time = datetime.fromtimestamp(end_ts / 1000, tz).strftime("%H:%M:%S.%f")[:-3]

    packets.append({
        "fromTo": f"{from_time} - {to_time}",
        "name": start_mode,
        "value": [0, start_ts, end_ts, duration_str],
        "itemStyle": {"normal": {"color": color_map.get(start_mode)}}
    })

    # Convert totalTimes
    for key in total_time:
        total_time[key] = format_duration_ms(total_time[key])

    return packets, total_time

@router.get("/hourlycal")
def hourlyjob():

    windowStart, windowEnd = previousHour_Window() # 2026-01-31T01:00:00.000Z 2026-01-31T01:59:59.999Z
    devices = get_devices()

    for device_id, device_name in devices:
        rows = get_energy(device_id, windowStart, windowEnd)

        date = windowStart.split("T")[0]
        startHour = windowStart[11:13] + ":00"
        endHour = f"{(int(startHour[:2]) + 1) % 24:02d}:00"

        digital = []
        ts = []
        modes = []
        real = reactive = apparent = energy = 0.0

        if rows:
            for r in rows:
                ts.append(r[0])
                digital.append(r[1])
                modes.append(r[2])
                real += r[3]
                reactive += r[4]
                apparent += r[5]
                energy += r[6]

        packets, total_time = machine_mode(ts, modes)

        breakdown_h = duration_to_hours(total_time.get("Breakdown"))
        running_h = duration_to_hours(total_time.get("Running"))
        idle_h = duration_to_hours(total_time.get("Idle"))

        planned_time = max(SHIFT_TIME - BREAK_TIME, 0.0)
        operating_time = max(planned_time - breakdown_h, 0.0)

        availability = clamp(
            (operating_time / planned_time) * 100 if planned_time else 0
        )
        performance = clamp((running_h / operating_time) * 100 if operating_time else 0)
        quality = 100.0
        oee = clamp((availability * performance * quality) / 10000)

        hourlydata = {
            "key": f"{device_id}|{date}|{startHour}",
            "deviceId": device_id,
            "deviceName": device_name,
            "date": date,
            "startHour": startHour,
            "endHour": endHour,
            "partCount": partcount_digital(digital),
            "ganttChart": json.dumps(packets),
            "idle": total_time.get("Idle", "0:00:00.000"),
            "running": total_time.get("Running", "0:00:00.000"),
            "breakdown": total_time.get("Breakdown", "0:00:00.000"),
            "interlock": total_time.get("Interlock", "0:00:00.000"),
            "off": total_time.get("Off", "0:00:00.000"),
            "realPower": round(real, 2),
            "reactivePower": round(reactive, 2),
            "apparentPower": round(apparent, 2),
            "energy": round(energy, 2),
            "energyCost": round(energy * hourlyEnergyEQP, 2),
            "revenueLoss": round(idle_h * machineCostperHour, 2),
            "availability": availability,
            "performance": performance,
            "quality": quality,
            "oee": oee,
            "records": len(rows) if rows else 0
        }

        GRIDDB_COLUMNS = [
            "key",
            "deviceId",
            "deviceName",
            "date",
            "startHour",
            "endHour",
            "partCount",
            "ganttChart",
            "idle",
            "running",
            "breakdown",
            "interlock",
            "off",
            "realPower",
            "reactivePower",
            "apparentPower",
            "energy",
            "energyCost",
            "revenueLoss",
            "availability",
            "performance",
            "quality",
            "oee",
            "records"
        ]

        row = [hourlydata.get(col) for col in GRIDDB_COLUMNS]
        with httpx.Client(timeout=10) as client:
            resp = client.put(
                f"{BASE_URL}/containers/{HOURLY_CONTAINER}/rows",
                json=[row],
                headers=HEADERS
            )

            if resp.status_code not in (200, 201):
                logging.error(f"GridDB insert failed: {resp.text}")
            else:
                logging.info(f"GridDB HourlyData {resp.status_code}")
        
    return JSONResponse(
        status_code=200,
        content={
            "status": "Sucessfully stored Hourly calculation data in GridDB"
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
        },
    )



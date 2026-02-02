import logging
import os
import httpx
import pytz
from typing import Dict
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

tz = pytz.timezone("Asia/Kolkata")
ALERT_THRESHOLD_MS = 300_000  # 5 minutes
DEFAULT_BREAK_TIME = 0.5
DEFAULT_ENERGY_COST = 15
DEFAULT_MACHINE_COST = 5

def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

def parse_ts(ts: str) -> datetime:
    # timestamp already in tz, ignore Z
    if ts.endswith("Z"):
        ts = ts[:-1]
    return datetime.fromisoformat(ts),ts

def format_duration_ms(ms: int) -> str:
    hours = ms // 3_600_000
    ms %= 3_600_000
    minutes = ms // 60_000
    ms %= 60_000
    seconds = ms // 1_000
    millis = ms % 1_000
    return f"{hours:02}:{minutes:02}:{seconds:02}.{millis:03}"

def machine_mode(ts_list, modes, date):
    # if not ts_list or not modes or len(ts_list) != len(modes):
    #     return [], {}

    packets = []
    color_map = {
        "Idle": "#f7c030",
        "Running": "#548237",
        "Breakdown": "#eb5857",
        "Interlock": "#7B542F",
        "Off": "#b0b0b0"
    }

    #  OFF till NOW (ONLY if date == today) 
    today_str = datetime.now(tz).strftime("%Y-%m-%d")

    if not ts_list or not modes or len(ts_list) != len(modes):
        total_time = {mode: "00:00:00.000" for mode in color_map}

        if date == today_str:
            start_of_day = datetime.now(tz).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            start_ts = int(start_of_day.timestamp() * 1000)
            now_ts = int(datetime.now(tz).timestamp() * 1000)

            duration_ms = now_ts - start_ts

            packets.append({
                "fromTo": f"{start_of_day.strftime('%H:%M:%S.%f')[:-3]} - "
                          f"{datetime.now(tz).strftime('%H:%M:%S.%f')[:-3]}",
                "name": "Off",
                "value": [0, start_ts, now_ts, format_duration_ms(duration_ms)],
                "itemStyle": {"normal": {"color": color_map["Off"]}}
            })

            total_time["Off"] = format_duration_ms(duration_ms)

        return packets, total_time

    total_time = {mode: 0 for mode in color_map}

    start_ts = ts_list[0]
    start_mode = modes[0]

    for i in range(1, len(ts_list)):
        curr_ts = ts_list[i]
        curr_mode = modes[i]
        prev_ts = ts_list[i - 1]

        ts_gap = curr_ts - prev_ts

        # Mode change OR long gap
        if curr_mode != start_mode or ts_gap > 60000:

            end_ts = prev_ts if ts_gap > 60000 else curr_ts
            duration_ms = end_ts - start_ts

            if duration_ms > 0:
                total_time[start_mode] += duration_ms

                packets.append({
                    "fromTo": f"{datetime.fromtimestamp(start_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]} - "
                              f"{datetime.fromtimestamp(end_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]}",
                    "name": start_mode,
                    "value": [0, start_ts, end_ts, format_duration_ms(duration_ms)],
                    "itemStyle": {"normal": {"color": color_map[start_mode]}}
                })

            # Insert OFF packet for long gap
            if ts_gap > 60000:
                total_time["Off"] += ts_gap

                packets.append({
                    "fromTo": f"{datetime.fromtimestamp(prev_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]} - "
                              f"{datetime.fromtimestamp(curr_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]}",
                    "name": "Off",
                    "value": [0, prev_ts, curr_ts, format_duration_ms(ts_gap)],
                    "itemStyle": {"normal": {"color": color_map["Off"]}}
                })

            start_ts = curr_ts
            start_mode = curr_mode

    end_ts = ts_list[-1]
    duration_ms = end_ts - start_ts

    if duration_ms > 0:
        total_time[start_mode] += duration_ms

        packets.append({
            "fromTo": f"{datetime.fromtimestamp(start_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]} - "
                      f"{datetime.fromtimestamp(end_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]}",
            "name": start_mode,
            "value": [0, start_ts, end_ts, format_duration_ms(duration_ms)],
            "itemStyle": {"normal": {"color": color_map[start_mode]}}
        })

    if date == today_str:
        now_ts = int(datetime.now(tz).timestamp() * 1000)
        last_ts = ts_list[-1]

        OFF_THRESHOLD_MS = 3 * 60 * 1000  # 3 minutes
        gap_to_now = now_ts - last_ts

        if gap_to_now >= OFF_THRESHOLD_MS:

            # Merge if last packet is already OFF
            if packets and packets[-1]["name"] == "Off":
                prev_start = packets[-1]["value"][1]
                old_end = packets[-1]["value"][2]

                packets[-1]["value"][2] = now_ts
                packets[-1]["value"][3] = format_duration_ms(now_ts - prev_start)

                packets[-1]["fromTo"] = (
                    f"{datetime.fromtimestamp(prev_start/1000, tz).strftime('%H:%M:%S.%f')[:-3]} - "
                    f"{datetime.fromtimestamp(now_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]}"
                )

                total_time["Off"] += (now_ts - old_end)

            # Create new OFF packet
            else:
                total_time["Off"] += gap_to_now

                packets.append({
                    "fromTo": f"{datetime.fromtimestamp(last_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]} - "
                              f"{datetime.fromtimestamp(now_ts/1000, tz).strftime('%H:%M:%S.%f')[:-3]}",
                    "name": "Off",
                    "value": [0, last_ts, now_ts, format_duration_ms(gap_to_now)],
                    "itemStyle": {"normal": {"color": color_map["Off"]}}
                })

    #  Convert totals to duration strings 
    for key in total_time:
        total_time[key] = format_duration_ms(total_time[key])

    return packets, total_time

def safe_duration_hours(d: str) -> float:
    return duration_to_hours(d or "0:00:00.000")

def sum_durations_to_hours(durations: Dict[str, str]) -> float:
    return sum(safe_duration_hours(v) for v in durations.values())

def duration_to_hours(duration_str: str) -> float:
    if not duration_str:
        return 0.0
    h, m, rest = duration_str.split(":")
    s, ms = rest.split(".")
    return (int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000) / 3600

def clamp(value: float, min_v=0.0, max_v=100.0) -> float:
    return max(min_v, min(max_v, value))

@router.get("/ganttChart")
async def ganttChartMetrics(req: Request):
    logger.info("ganttChartMetrics triggered")

    try:

        device_id = req.query_params.get("deviceId")
        date = req.query_params.get("date")

        if not device_id or not date:
            raise HTTPException(400, "deviceId and date are required")

        BASE_URL = get_env("GRIDDB_WEBURL")
        GRIDDB_AUTH = get_env("GRIDDB_AUTH")
        EVENT_CONTAINER = get_env("EVENT_CONTAINER")
        DOWNTIME_CONTAINER = get_env("DOWNTIME_CONTAINER")

        BREAK_TIME = float(get_env("BREAK_TIME") or DEFAULT_BREAK_TIME)
        config_energyCost = float(get_env("config_eneryCost") or DEFAULT_ENERGY_COST)
        machineCost = float(get_env("machineCost") or DEFAULT_MACHINE_COST)

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": GRIDDB_AUTH,
            "User-Agent": "telemetrygrid/1.0.0 (fastapi; python)",
        }

        result = {"ganttChart": [], "status": {}}

        ts_list, modes = [], []
        energy = 0.0
        mode_summary = {}

        async with httpx.AsyncClient(timeout=10) as client:

            # EVENT DATA
            event_stmt = (
                f"SELECT ts,machine_mode,energy "
                f"FROM {EVENT_CONTAINER} "
                f"WHERE tenantID = '{device_id}' AND date = '{date}' "
                f"ORDER BY ts"
            )

            res = await client.post(f"{BASE_URL}/sql", headers=headers, json=[{"stmt": event_stmt}])
            res.raise_for_status()

            event_data = res.json()[0]
            columns = {c["name"]: i for i, c in enumerate(event_data.get("columns", []))}
            rows = event_data.get("results", [])

            for r in rows:
                ts_list.append(r[columns["ts"]])
                modes.append(r[columns["machine_mode"]])
                energy += float(r[columns.get("energy", 0)] or 0)

            packets, mode_summary = machine_mode(ts_list, modes, date)

            # OEE CALC
            breakdown_h = safe_duration_hours(mode_summary.get("Breakdown"))
            running_h = safe_duration_hours(mode_summary.get("Running"))
            idle_h = safe_duration_hours(mode_summary.get("Idle"))

            SHIFT_TIME = sum_durations_to_hours({
                k: mode_summary.get(k)
                for k in ("Idle", "Breakdown", "Running", "Interlock", "Off")
            })

            planned_time = max(SHIFT_TIME - BREAK_TIME, 0.0)
            operating_time = max(planned_time - breakdown_h, 0.0)

            availability = clamp((operating_time / planned_time) * 100) if planned_time else 0.0
            performance = clamp((running_h / operating_time) * 100) if operating_time else 0.0
            quality = 100.0
            oee = clamp((availability * performance * quality) / 10000)

            # DOWNTIME DATA
            downtime_stmt = (
                f"SELECT fromTo,reason "
                f"FROM {DOWNTIME_CONTAINER} "
                f"WHERE deviceId = '{device_id}' AND date = '{date}'"
            )

            res = await client.post(f"{BASE_URL}/sql", headers=headers, json=[{"stmt": downtime_stmt}])
            res.raise_for_status()

            downtime_rows = res.json()[0].get("results", [])
            reason_map = {x[0]: x[1] for x in downtime_rows}

        # MERGE REASONS
        packet_output = []
        for p in packets:
            pkt = p.copy()
            pkt["reason"] = ""
            if pkt.get("fromTo") in reason_map:
                pkt["reason"] = reason_map[pkt["fromTo"]]
            packet_output.append(pkt)
        
        result["ganttChart"] = packet_output if packet_output else packets

        # ALERTS
        alerts = [
            p for p in packet_output
            if p.get("name") in ("Breakdown", "Idle")
            and len(p.get("value", [])) >= 3
            and (p["value"][2] - p["value"][1]) > ALERT_THRESHOLD_MS
        ]

        # FINAL STATUS
        result["status"] = {
            "status": packets[-1].get("name", "Off") if packets else "Off",
            "operatingTime": operating_time,
            "LTU": ts_list[-1] if ts_list else None,
            "energyData": energy,
            "energyCost": round(energy * config_energyCost),
            "opportunityCost": round(idle_h * machineCost),
            "shiftTime": SHIFT_TIME,
            "breakTime": BREAK_TIME,
            "availability": availability,
            "performance": performance,
            "quality": quality,
            "efficiency": oee,
            "idle": mode_summary.get("Idle"),
            "breakdown": mode_summary.get("Breakdown"),
            "running": mode_summary.get("Running"),
            "interlock": mode_summary.get("Interlock"),
            "off": mode_summary.get("Off"),
            "gauges": {
                "efficiency": {"value": oee, "unit": "%"},
                "energyProgress": {"value": energy, "unit": "kWh"},
            },
            "alerts": alerts,
            "alertsCount": len(alerts),
        }

        return JSONResponse(
            status_code=200,
            content=result,
            headers={"Access-Control-Allow-Origin": "*"}
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in ganttChartMetrics")
        raise HTTPException(500, "Internal server error")
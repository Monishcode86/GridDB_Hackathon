import httpx
from app.utils.config import *

async def insert_row(payload):
    GRIDDB_COLUMNS = [
        "TimeStamp",
        "PartitionKey",
        "upTimeDuration",
        "DigitalInput1",
        "NumberPulses_DigitalInput1",
        "DigitalInput2",
        "NumberPulses_DigitalInput2",
        "AnalogInput1",
        "AnalogInput2",
        "Voltage_R",
        "Voltage_Y",
        "Voltage_B",
        "Current_R",
        "Current_Y",
        "Current_B",
        "PowerFactor_R",
        "PowerFactor_Y",
        "PowerFactor_B",
        "PowerAngle_R",
        "PowerAngle_Y",
        "PowerAngle_B",
        "Frequency",
        "Total_ImportEnergyConsumption",
        "Total_ExportEnergyConsumption",
        "Status"
    ]

    row = [payload.get(col) for col in GRIDDB_COLUMNS]
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.put(
            f"{BASE_URL}/containers/{ROWDATA_CONTAINER_NAME}/rows",
            json=[row],
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": GRIDDB_AUTH,
                "User-Agent": "telemetrygrid/1.0.0"
            }
        )
        print("GridDB rowData status:", resp.status_code)

async def insert_energy(TimeStamp,TenantID,ts_epoch,date_part,digital_pin,digital_GantChartEqp,real_power,reactive_power,apparent_power,energy):

    row = [TimeStamp,TenantID,ts_epoch,date_part,digital_pin,digital_GantChartEqp,real_power,reactive_power,apparent_power,energy]
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.put(
            f"{BASE_URL}/containers/{EVENT_CONTAINER_NAME}/rows",
            json=[row],
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": GRIDDB_AUTH,
                "User-Agent": "telemetrygrid/1.0.0"
            }
        )
        print("GridDB energy status:", resp.status_code)
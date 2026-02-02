import logging
import os
import requests
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from azure.storage.blob import BlobSasPermissions, generate_blob_sas

router = APIRouter()
def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_device(device_id: str, container: str, base_url: str, headers: dict) -> str:
    if not device_id:
        raise ValueError("device_id is required")

    stmt = f"SELECT deviceId FROM {container} WHERE deviceId = '{device_id}'"
    url = f"{base_url}/sql"
    payload = [{"stmt": stmt}]

    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    resp.raise_for_status()

    data = resp.json()[0]
    rows = data.get("results", [])

    if not rows:
        raise LookupError(f"Device '{device_id}' not found")

    return rows[0][0]


def generate_sas_url(
    account_name: str,
    account_key: str,
    container_name: str,
    blob_name: str,
    expiry_minutes: int = 1,
) -> str:
    now = datetime.now(timezone.utc)

    sas_token = generate_blob_sas(
        account_name=account_name,
        account_key=account_key,
        container_name=container_name,
        blob_name=blob_name,
        permission=BlobSasPermissions(read=True),
        start=now - timedelta(minutes=5),
        expiry=now + timedelta(minutes=expiry_minutes),
        protocol="https",
    )

    return (
        f"https://{account_name}.blob.core.windows.net/"
        f"{container_name}/{blob_name}?{sas_token}"
    )

@router.get("/masterDevicesConfig/{device_id}")
async def masterDevice_OTAConfig(device_id: str):
    logging.info("masterDevicesConfig triggered")

    try:
        if not device_id:
            raise HTTPException(
                status_code=400,
                detail="deviceId path parameter is required"
            )

        # GridDB
        BASE_URL = get_env("GRIDDB_WEBURL")
        CONTAINER = get_env("GRIDDB_CONTAINER")
        GRIDDB_AUTH = get_env("GRIDDB_AUTH")

        HEADERS = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": GRIDDB_AUTH,
            "User-Agent": "telemetrygrid/1.0.0 (fastapi; python)",
        }

        device_id = get_device(device_id, CONTAINER, BASE_URL, HEADERS)

        # Storage
        account_name = get_env("STORAGE_ACCOUNT_NAME")
        account_key = get_env("STORAGE_ACCOUNT_KEY")
        container_name = get_env("DEVICE_CERTS_CONTAINER_NAME")

        # IoT Hub
        iot_hub_host = get_env("IOT_HUB_HOST_NAME")
        api_version = get_env("IOT_HUB_API_VERSION")

        pem_file = f"{device_id}.pem"
        key_file = f"{device_id}.key"

        clientCRTFile = generate_sas_url(
            account_name, account_key, container_name, pem_file
        )

        privateKeyFile = generate_sas_url(
            account_name, account_key, container_name, key_file
        )

        config = {
            "tenantID": f"BYX43-202401001-{device_id}",
            "txInterval": 23,
            "clientID": device_id,
            "mqttUrl": f"{iot_hub_host}:8883",
            "userName": f"{iot_hub_host}/{device_id}/api-version={api_version}",
            "password": None,
            "dataPubTopic": f"devices/{device_id}/messages/events/$.ct=application%2Fjson%3Bcharset%3Dutf-8",
            "willTopic": f"devices/{device_id}/messages/events/$.ct=application%2Fjson%3Bcharset%3Dutf-8",
            "subTopic": f"devices/{device_id}/messages/devicebound/#",
            "dvcInfoTopic": f"devices/{device_id}/messages/events/$.ct=application%2Fjson%3Bcharset%3Dutf-8",
            "responseTopic": f"devices/{device_id}/messages/events/$.ct=application%2Fjson%3Bcharset%3Dutf-8",
            "ssl_tls": 1,
            "sslSecureFlag": 0,
            "enableServerCertAuth": 1,
            "privateKeyPassword": None,
            "caRootFile": None,
            "clientCRTFile": clientCRTFile,
            "privateKeyFile": privateKeyFile,
        }

        return JSONResponse(
            status_code=200,
            content={
                "status": 1,
                "config": config,
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
            },
        )

    except Exception as exc:
        logging.exception("Error in masterDevicesConfig")
        raise HTTPException(status_code=500, detail=str(exc))

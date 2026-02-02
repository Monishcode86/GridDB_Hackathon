import logging
import json
import requests
import os
import azure.functions as func

WHATSAPP_APPID = os.environ["WHATSAPP_APPID"]
WHATSAPP_TOKEN = os.environ["WHATSAPP_TOKEN"]
numbers = json.loads(os.environ["WHATSAPP_NUMBERS"])

def send_whatsapp(message: str):
    url = f"https://graph.facebook.com/v22.0/{WHATSAPP_APPID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    for number in numbers:
        body = {
            "messaging_product": "whatsapp",
            "to": number,
            "type": "text",
            "text": {
                "body": message
            }
        }

        resp = requests.post(url, headers=headers, json=body, timeout=10)

        if resp.status_code != 200:
            logging.error(f"WhatsApp failed for {number}: {resp.text}")
        else:
            logging.info(f"WhatsApp sent to {number}")

def main(event: func.EventGridEvent, signalRMessages: func.Out[str]):
    logging.info("EventGrid trigger received")

    payload = {
        "eventType": event.event_type,
        "subject": event.subject,
        "data": event.get_json()
    }

    signalRMessages.set(json.dumps({
        "target": "deviceStatus",
        "arguments": [payload]
    }))

    EVENT_STATUS_ACTION_MAP = {
        "Microsoft.Devices.DeviceCreated": {
            "status": "CREATED 🆕",
            "action": "Confirm device setup. Device is currently powered OFF, will begin communication once powered ON."
        },
        "Microsoft.Devices.DeviceConnected": {
            "status": "CONNECTED 🟢",
            "action": "No action required. Device is communicating normally and telemetry data has started."
        },
        "Microsoft.Devices.DeviceDisconnected": {
            "status": "DISCONNECTED 📴",
            "action": "Check machine power supply, network cable, gateway connectivity and Azure IoT Hub."
        },
        "Microsoft.Devices.DeviceDeleted": {
            "status": " DELETED 🔴",
            "action": "Confirm device decommissioning or re-register if removal was unintentional."
        }
    }

    event_info = EVENT_STATUS_ACTION_MAP.get(
        event.event_type,
            {
                "status": "UNKNOWN",
                "action": "Review device status in the IoT platform and verify connectivity."
            }
    )
    device_id = payload["data"].get("deviceId", "UNKNOWN")
    status = event_info["status"]
    action = event_info["action"]

    msg = (
        "Hi Jay 👋\n\n"
        "IoT Device Notification 📡\n\n"
        f"📟 Device ID      : {device_id}\n"
        f"🔄 Event Status   : {status}\n\n"
        f"🛠️ Recommended Action:\n"
        f"- {action}"
    )

    send_whatsapp(msg)

    logging.info("Event sent to SignalR")

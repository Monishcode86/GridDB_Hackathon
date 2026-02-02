from fastapi import APIRouter
import requests
import socket
import os
from urllib.parse import urlparse

router = APIRouter()

GRIDDB_WEBURL = os.getenv("GRIDDB_WEBURL")

@router.get("/test")
def test():
    result = {}

    try:
        ip = requests.get("https://api.ipify.org", timeout=10).text
        result["outbound_ip"] = ip
    except Exception as e:
        result["outbound_ip_error"] = str(e)

    parsed_url = urlparse(GRIDDB_WEBURL)
    host = parsed_url.hostname

    try:
        resolved_ip = socket.gethostbyname(host)
        result["dns_resolution"] = resolved_ip
    except Exception as e:
        result["dns_error"] = str(e)

    return result

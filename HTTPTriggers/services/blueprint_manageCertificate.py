from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging
import os

from azure.iot.hub import IoTHubRegistryManager
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
from msrest.exceptions import HttpOperationError

router = APIRouter()
def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def build_iot_hub_connection_string() -> str:
    return (
        f"HostName={get_env('IOT_HUB_HOST_NAME')};"
        f"SharedAccessKeyName={get_env('IOT_HUB_SHARED_ACCESS_KEY_NAME')};"
        f"SharedAccessKey={get_env('IOT_HUB_SHARED_ACCESS_KEY')}"
    )


def build_storage_connection_string() -> str:
    return (
        f"DefaultEndpointsProtocol=https;"
        f"AccountName={get_env('STORAGE_ACCOUNT_NAME')};"
        f"AccountKey={get_env('STORAGE_ACCOUNT_KEY')};"
        f"EndpointSuffix=core.windows.net"
    )


def get_blob_service_client() -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(
        build_storage_connection_string()
    )

# Certificate functions
def load_root_ca_from_blob(blob_service, container, key_blob, cert_blob, passphrase):
    key_data = blob_service.get_blob_client(container, key_blob).download_blob().readall()
    cert_data = blob_service.get_blob_client(container, cert_blob).download_blob().readall()

    root_key = serialization.load_pem_private_key(key_data, password=passphrase)
    root_cert = x509.load_pem_x509_certificate(cert_data)

    return root_key, root_cert


def create_device_csr(device_id: str):
    device_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Karnataka"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Bangalore"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Wimera Systems"),
        x509.NameAttribute(NameOID.COMMON_NAME, device_id),
    ])

    csr = x509.CertificateSigningRequestBuilder().subject_name(
        subject
    ).sign(device_key, hashes.SHA256())

    return device_key, csr


def sign_device_cert(root_key, root_cert, csr):
    return (
        x509.CertificateBuilder()
        .subject_name(csr.subject)
        .issuer_name(root_cert.subject)
        .public_key(csr.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=365))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(root_key, hashes.SHA256())
    )


def upload_blob(blob_service, container, name, data):
    blob_service.get_blob_client(container, name).upload_blob(data, overwrite=True)


def delete_blob_safe(blob_service, container, name):
    try:
        blob_service.get_blob_client(container, name).delete_blob()
    except ResourceNotFoundError:
        logging.warning(f"Blob not found (skip delete): {name}")


@router.api_route("/certificate", methods=["POST", "DELETE"])
async def manage_certificate(req: Request):
    logging.info("Manage Machine Certificate Triggered")

    try:
        
        registry = IoTHubRegistryManager(
            build_iot_hub_connection_string()
        )

        blob_service = get_blob_service_client()

        root_container = get_env("ROOT_CERTS_CONTAINER_NAME")
        device_container = get_env("DEVICE_CERTS_CONTAINER_NAME")
        passphrase = get_env("ROOT_CA_PASSPHRASE").encode()

        if req.method == "POST":

            body = await req.json()
            device_id = body.get("deviceId")

            if not device_id:
                raise HTTPException(status_code=400, detail="deviceId is required")

            device_created = False
            device_already_exists = False
            certs_created = False

            try:
                registry.create_device_with_certificate_authority(
                    device_id=device_id,
                    status="enabled"
                )
                device_created = True
                logging.info(f"Device {device_id} created")

            except HttpOperationError as e:
                if e.response.status_code == 409:
                    device_already_exists = True
                    logging.warning(f"Device {device_id} already exists")
                else:
                    raise

            try:
                root_key, root_cert = load_root_ca_from_blob(
                    blob_service,
                    root_container,
                    "rootCA.key",
                    "rootCA.crt",
                    passphrase,
                )

                device_key, csr = create_device_csr(device_id)
                device_cert = sign_device_cert(root_key, root_cert, csr)

                cert_pem = device_cert.public_bytes(serialization.Encoding.PEM)
                key_pem = device_key.private_bytes(
                    serialization.Encoding.PEM,
                    serialization.PrivateFormat.TraditionalOpenSSL,
                    serialization.NoEncryption(),
                )

                upload_blob(blob_service, device_container, f"{device_id}.pem", cert_pem)
                upload_blob(blob_service, device_container, f"{device_id}.key", key_pem)

                certs_created = True

            except Exception:
                logging.exception("Certificate creation failed")

                if device_created:
                    try:
                        registry.delete_device(device_id)
                        logging.warning(f"Rolled back device {device_id}")
                    except Exception:
                        logging.exception("Rollback failed")

                raise

            return JSONResponse(
                status_code=200,
                content={
                    "device_id": device_id,
                    "device_created": device_created,
                    "device_already_exists": device_already_exists,
                    "certs_created": certs_created,
                },
            )
        #DELETE 
        elif req.method == "DELETE":
            device_id = req.query_params.get("deviceId")

            device_deleted = False
            certs_deleted = False

            try:
                registry.delete_device(device_id)
                device_deleted = True
            except HttpOperationError as e:
                if e.response.status_code != 404:
                    raise
                logging.warning(f"Device {device_id} does not exist")

            delete_blob_safe(blob_service, device_container, f"{device_id}.pem")
            delete_blob_safe(blob_service, device_container, f"{device_id}.key")
            certs_deleted = True

            return JSONResponse(
                status_code=200,
                content={
                    "device_id": device_id,
                    "device_deleted": device_deleted,
                    "certs_deleted": certs_deleted,
                },
            )

    except HTTPException:
        raise
    except Exception as exc:
        logging.exception("Manage certificate error")
        raise HTTPException(status_code=500, detail=str(exc))

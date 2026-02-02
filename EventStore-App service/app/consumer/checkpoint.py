from azure.eventhub.extensions.checkpointstoreblobaio import BlobCheckpointStore
from app.utils.config import *
if not STORAGE_CONN:
    raise RuntimeError("STORAGE_CONN not loaded")

if not CHECKPOINT_CONTAINER:
    raise RuntimeError("CHECKPOINT_CONTAINER not loaded")

checkpoint_store = BlobCheckpointStore.from_connection_string(
    STORAGE_CONN,
    CHECKPOINT_CONTAINER
)

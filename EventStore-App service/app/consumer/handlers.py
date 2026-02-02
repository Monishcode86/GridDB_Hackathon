import logging
import asyncio
import json

from app.worker.context import raw_semaphore, energy_semaphore
from app.consumer.processing import (
    process_rawEvent,
    process_energyEvent,
)

logger = logging.getLogger(__name__)

async def on_event(partition_context, event):

    try:
        if event is None:
            logger.debug("Empty EventHub callback")
            return
        
        body = event.body_as_str(encoding="UTF-8")

        if not body or not body.strip():
            return 
        try:
            payload = json.loads(body)
            tenant_id = payload.get("TenantID")
            if not tenant_id or "-" not in tenant_id:
                return

            PartitionKey = tenant_id.split("-")[-1]

        except json.JSONDecodeError:
            return

        # parallel
        async with raw_semaphore, energy_semaphore:
            await asyncio.gather(
                process_rawEvent(payload,PartitionKey),
                process_energyEvent(payload,PartitionKey),
            )

        await partition_context.update_checkpoint(event)

    except Exception:
        logger.exception(
            "Failed to process event (checkpoint NOT updated)"
        )

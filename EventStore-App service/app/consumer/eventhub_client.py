import asyncio
import logging

from azure.eventhub.aio import EventHubConsumerClient
from azure.eventhub import TransportType
from azure.eventhub.exceptions import EventHubError

from app.consumer.handlers import on_event
from app.consumer.checkpoint import checkpoint_store
from app.utils.config import *

logger = logging.getLogger(__name__)

async def start_eventhub_consumer():
    while True:
        try:
            logger.info("Connecting to EventHub...")

            client = EventHubConsumerClient.from_connection_string(
                conn_str=EVENTHUB_CONN,
                consumer_group=CONSUMER_GROUP,
                eventhub_name=EVENTHUB_NAME,
                checkpoint_store=checkpoint_store,
                transport_type=TransportType.AmqpOverWebsocket,
            )

            async with client:
                logger.info("EventHub connected. Listening...")
                await client.receive(
                    on_event=on_event,
                    starting_position="@latest",  # REAL-TIME ONLY
                    max_wait_time=1
                )

        except asyncio.CancelledError:
            logger.warning("EventHub consumer cancelled.")
            break

        except EventHubError:
            logger.exception("EventHub error. Retrying in 5s...")
            await asyncio.sleep(5)

        except Exception:
            logger.exception("Unexpected error. Retrying in 5s...")
            await asyncio.sleep(5)

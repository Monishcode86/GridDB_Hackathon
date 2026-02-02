# from dotenv import load_dotenv
# load_dotenv()

import asyncio
import logging
import signal
from app.consumer.eventhub_client import start_eventhub_consumer

logger = logging.getLogger(__name__)

stop_event = asyncio.Event()

def _shutdown():
    logger.warning(f"Shutdown signal received. Stopping consumer...")
    stop_event.set()

async def main():
    logger.info("Starting EventHub consumer service...")

    loop = asyncio.get_running_loop()

    try:
        # Linux
        loop.add_signal_handler(signal.SIGINT, _shutdown)
        loop.add_signal_handler(signal.SIGTERM, _shutdown)
    except NotImplementedError:
        # Windows
        signal.signal(signal.SIGINT, _shutdown)
        signal.signal(signal.SIGTERM, _shutdown)

    consumer_task = asyncio.create_task(start_eventhub_consumer())

    await stop_event.wait()

    logger.info("Shutdown initiated, cancelling consumer...")
    consumer_task.cancel()

    try:
        await consumer_task
    except asyncio.CancelledError:
        logger.info("Consumer stopped gracefully.")

if __name__ == "__main__":
    asyncio.run(main())

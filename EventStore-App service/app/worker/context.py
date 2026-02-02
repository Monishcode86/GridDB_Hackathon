import asyncio

raw_semaphore = asyncio.Semaphore(2)
energy_semaphore = asyncio.Semaphore(2)
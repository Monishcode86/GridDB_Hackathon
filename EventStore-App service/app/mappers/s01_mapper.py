from app.schemas.s01_schema import S01_SCHEMA
from app.utils.time_utils import epoch_ms_to_iso

def map_s01(S01: list, timezone: str) -> dict:
    if not isinstance(S01, list):
        raise ValueError("S01 must be a list")

    if len(S01) < max(S01_SCHEMA.values()) + 1:
        raise ValueError("S01 payload length mismatch")

    mapped = {}

    for key, idx in S01_SCHEMA.items():
        value = S01[idx]

        # positive value
        if isinstance(value, (int, float)):
            value = abs(value)

        mapped[key] = value

    mapped["TimeStamp"] = epoch_ms_to_iso(mapped.pop("Timestamp"), timezone)
    return mapped

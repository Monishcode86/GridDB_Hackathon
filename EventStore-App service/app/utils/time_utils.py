from datetime import datetime, timezone
import pytz

def epoch_ms_to_iso(ts_ms: int, tz_name: str) -> str:
    return (
        datetime
        .fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        .astimezone(pytz.timezone(tz_name))
        .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
        + "Z"
    )

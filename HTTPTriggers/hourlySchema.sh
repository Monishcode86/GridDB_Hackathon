
curl -i -X POST --location 'https://cloud8737.griddb.com/griddb/v2/gs_clustermfcloud8737/dbs/WTRoX0YC/containers' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic UzAxT2t0SjJ0Ry11c2Vyd2ltOldpbTkwOTAhQA==' \
--data '{
  "container_name": "HourlyTelemetry",
  "container_type": "COLLECTION",
  "rowkey": true,
  "columns": [
      { "name": "key",             "type": "STRING" },
      { "name": "deviceId",        "type": "STRING" },
      { "name": "deviceName",        "type": "STRING"},
      { "name": "date",            "type": "STRING" },
      { "name": "startHour",       "type": "STRING" },
      { "name": "endHour",         "type": "STRING" },

      { "name": "partCount",       "type": "INTEGER" },
      { "name": "ganttChart",      "type": "STRING" },

      { "name": "idle",            "type": "STRING" },
      { "name": "running",         "type": "STRING" },
      { "name": "breakdown",       "type": "STRING" },
      { "name": "interlock",       "type": "STRING" },
      { "name": "off",             "type": "STRING" },

      { "name": "realPower",       "type": "DOUBLE" },
      { "name": "reactivePower",   "type": "DOUBLE" },
      { "name": "apparentPower",   "type": "DOUBLE" },

      { "name": "energy",          "type": "DOUBLE" },
      { "name": "energyCost",      "type": "DOUBLE" },
      { "name": "revenueLoss",     "type": "DOUBLE" },

      { "name": "availability",    "type": "DOUBLE" },
      { "name": "performance",     "type": "DOUBLE" },
      { "name": "quality",         "type": "DOUBLE" },
      { "name": "oee",             "type": "DOUBLE" },

      { "name": "records",         "type": "INTEGER" }
    ]
}'
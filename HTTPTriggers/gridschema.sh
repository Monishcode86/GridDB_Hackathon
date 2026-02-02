curl -i -X POST --location 'https://cloud8737.griddb.com/griddb/v2/gs_clustermfcloud8737/dbs/WTRoX0YC/containers' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic UzAxT2t0SjJ0Ry11c2Vyd2ltOldpbTkwOTAhQA==' \
--data '{
  "container_name": "Telemetry",
  "container_type": "COLLECTION",
  "rowkey": true,
  "columns": [
    {
      "name": "deviceId",
      "type": "STRING"
    },
    {
      "name": "deviceName",
      "type": "STRING"
    },
    {
      "name": "deviceType",
      "type": "STRING"
    },
    {
      "name": "deviceController",
      "type": "STRING"
    },
    {
      "name": "deviceModal",
      "type": "STRING"
    },
    {
      "name": "deviceManufacture",
      "type": "STRING"
    },
    {
      "name": "deviceFrequency",
      "type": "STRING"
    },
    {
      "name": "devicephaseSequence",
      "type": "STRING"
    },
    {
      "name": "devicepgaGainConfig",
      "type": "INTEGER"
    },
    {
      "name": "deviceMode",
      "type": "STRING"
    },
    {
      "name": "createdAt",
      "type": "TIMESTAMP"
    },
    {
      "name": "updatedAt",
      "type": "TIMESTAMP"
    }
  ]
}'
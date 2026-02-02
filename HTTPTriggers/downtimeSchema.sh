curl -i -X POST --location 'https://cloud8737.griddb.com/griddb/v2/gs_clustermfcloud8737/dbs/WTRoX0YC/containers' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic UzAxT2t0SjJ0Ry11c2Vyd2ltOldpbTkwOTAhQA==' \
--data '{
  "container_name": "DowntimeTelemetry",
  "container_type": "COLLECTION",
  "rowkey": true,
  "columns": [
    {
      "name": "key",
      "type": "STRING"
    },
    {
      "name": "deviceId",
      "type": "STRING"
    },
    {
      "name": "date",
      "type": "STRING"
    },
    {
      "name": "fromTo",
      "type": "STRING"
    },
    {
      "name": "name",
      "type": "STRING"
    },
    {
      "name": "reason",
      "type": "STRING"
    },
    {
      "name": "updatedAt",
      "type": "STRING"
    }
  ]
}'
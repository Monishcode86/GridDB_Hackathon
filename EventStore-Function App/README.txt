# Register this blueprint by adding the following line of code 
# to your entry point file.  
# app.register_functions(blueprint_save_rawdata) 
# 
# Please refer to https://aka.ms/azure-functions-python-blueprints

import logging
import azure.functions as func
import os
from azure.data.tables import TableServiceClient
import json
import uuid


blueprint_save_rawdata = func.Blueprint()


@blueprint_save_rawdata.event_hub_message_trigger(arg_name="azeventhub", event_hub_name="k2telemetry_event_hub",
                               connection="k2telemetryeventhub_connection_string") 
def eventhub_trigger(azeventhub: func.EventHubEvent):

    #logging.info('Python EventHub trigger processed an event: %s', azeventhub.get_body().decode('utf-8'))

    try:
        # Initialize Azure Storage Table client
        connection_string = os.environ["storage_table_connection_string"]
        table_service_client = TableServiceClient.from_connection_string(connection_string)
        device_data_table_name = os.environ["device_data_table_name"]

        # Get a reference to the table for storing raw device data
        table_client = table_service_client.get_table_client(device_data_table_name)

        # Parse the event data
        json_data = azeventhub.get_body().decode('utf-8')
        data = json.loads(json_data)

        # Determine PartitionKey based on event data format
        partition_key = None
        if "MACID" in data:
            partition_key = data["MACID"].replace(":", "")  # Remove colons from MACID
        elif "TenantID" in data:
            tenant_id = data["TenantID"]
            partition_key = tenant_id.split("-")[-1]  # Extract the last segment after the last hyphen
        
        if not partition_key:
            logging.error('Could not determine PartitionKey from the event data')
            return

        # Generate RowKey
        row_key = str(uuid.uuid4())  # Use a GUID as the RowKey
        
        # Prepare the entity to insert
        entity = {
            'PartitionKey': partition_key,
            'RowKey': row_key,
            'JsonDocument': json_data  # Store the JSON document as a string
        }
        table_client.upsert_entity(entity=entity)
        logging.info('Data inserted into Table Storage successfully with PartitionKey: %s and RowKey: %s', partition_key, row_key)
    
    except ValueError as e:
            logging.info(e)


######################################

"logging": { 
    "logLevel": { 
        "default": "Warning", 
        "Host.Results": "Information", 
        "Function": "Information", 
        "Host.Aggregator": "Information" 
    } 
},
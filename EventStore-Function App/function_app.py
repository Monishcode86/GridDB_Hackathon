import azure.functions as func
from blueprint_save_rawdata import blueprint_save_rawdata

app = func.FunctionApp()
app.register_functions(blueprint_save_rawdata)
      
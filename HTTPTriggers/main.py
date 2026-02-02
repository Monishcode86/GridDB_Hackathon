
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from services.blueprint_device import router as device
from services.blueprint_manageCertificate import router as manage_certificate
from services.blueprint_masterDevice_OTAConfig import router as masterDevice_OTAConfig
from services.blueprint_test import router as test_router
from services.blueprint_hourly import router as hourlyjob
from services.blueprint_energyMetrics import router as energyMetrics
from services.blueprint_ganttChart import router as ganttChartMetrics
from services.blueprint_parameterMetrics import router as parameterMetrics
from services.blueprint_eventProcess import router as eventProcess
from services.blueprint_report import router as report
from services.blueprint_downtimeEntry import router as downtimeEntry

app = FastAPI()

app.include_router(test_router)
app.include_router(device)
app.include_router(manage_certificate)
app.include_router(masterDevice_OTAConfig)
app.include_router(hourlyjob)
app.include_router(energyMetrics)
app.include_router(ganttChartMetrics)
app.include_router(parameterMetrics)
app.include_router(eventProcess)
app.include_router(report)
app.include_router(downtimeEntry)
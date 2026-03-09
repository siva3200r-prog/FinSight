from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.models import InsightResponse
from app.database import get_db, Client
from app.services.insight_service import InsightService

router = APIRouter()

def get_insight_service(db: Client = Depends(get_db)):
    if not db:
       raise HTTPException(status_code=500, detail="Database connection not available")
    return InsightService(db)

@router.post("/generate")
def generate_insights(service: InsightService = Depends(get_insight_service)):
    try:
        return service.generate_insights()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[InsightResponse])
def get_insights(service: InsightService = Depends(get_insight_service)):
    try:
        return service.get_insights()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

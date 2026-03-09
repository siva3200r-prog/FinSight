from typing import List
from fastapi import APIRouter, Depends
from app.models import SubscriptionResponse, GmailImportRequest
from app.database import get_db, Client
from app.services.subscription_service import SubscriptionService
from app.services.gmail_service import GmailService

router = APIRouter()

def get_subscription_service(db: Client = Depends(get_db)):
    if not db:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return SubscriptionService(db)

def get_gmail_service():
    return GmailService()

def get_subscription_service(db: Client = Depends(get_db)):
    if not db:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return SubscriptionService(db)

@router.post("/detect")
def detect_subscriptions(service: SubscriptionService = Depends(get_subscription_service)):
    try:
        detected = service.detect_subscriptions()
        return detected # Returns the list
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[SubscriptionResponse])
def get_subscriptions(service: SubscriptionService = Depends(get_subscription_service)):
    try:
        return service.get_subscriptions()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import-gmail")
def import_gmail_subscriptions(request: GmailImportRequest, service: GmailService = Depends(get_gmail_service)):
    try:
        detected = service.detect_subscriptions(request.email)
        return detected
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

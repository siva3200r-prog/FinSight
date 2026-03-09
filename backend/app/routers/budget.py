from fastapi import APIRouter
from app.models import BudgetRequest, BudgetResponse
from app.services.budget_service import BudgetService

router = APIRouter()
budget_service = BudgetService()

@router.post("/generate", response_model=BudgetResponse)
def generate_budget(request: BudgetRequest):
    return budget_service.generate_budget(request)

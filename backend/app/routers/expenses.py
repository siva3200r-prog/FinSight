from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models import ExpenseCreate, ExpenseResponse
from app.database import get_db, Client
from app.services.expense_service import ExpenseService

router = APIRouter()

def get_expense_service(db: Client = Depends(get_db)):
    if not db:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return ExpenseService(db)

@router.post("", response_model=ExpenseResponse)
def create_expense(expense: ExpenseCreate, service: ExpenseService = Depends(get_expense_service)):
    try:
        data = service.add_expense(expense.dict())
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[ExpenseResponse])
def read_expenses(service: ExpenseService = Depends(get_expense_service)):
    try:
        data = service.get_expenses()
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, service: ExpenseService = Depends(get_expense_service)):
    try:
        success = service.delete_expense(expense_id)
        if not success:
            raise HTTPException(status_code=404, detail="Expense not found or unable to delete")
        return {"message": "Expense deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

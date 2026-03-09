from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: str
    date: str
    merchant_name: Optional[str] = None
    payment_method: Optional[str] = None
    location: Optional[str] = None
    mood: Optional[str] = None
    classification: Optional[str] = None
    is_subscription: Optional[bool] = False
    type: Optional[str] = "one-time"

class ExpenseResponse(ExpenseCreate):
    id: int
    user_id: int
    created_at: str

class SubscriptionCreate(BaseModel):
    service_name: str
    amount: float
    billing_cycle: str
    last_payment_date: str
    next_payment_date: str

class SubscriptionResponse(SubscriptionCreate):
    id: int
    user_id: int
    created_at: str

class GoalCreate(BaseModel):
    goal_name: str
    target_amount: float
    saved_amount: float
    deadline: str

class GoalResponse(GoalCreate):
    id: int
    user_id: int
    created_at: str

class BudgetRequest(BaseModel):
    monthly_income: float
    fixed_expenses: float
    savings_goal: float

class BudgetResponse(BaseModel):
    Food: float
    Transport: float
    Entertainment: float
    Savings: float

class InsightResponse(BaseModel):
    id: int
    insight_type: str
    message: str
    created_at: str

class GmailImportRequest(BaseModel):
    email: str

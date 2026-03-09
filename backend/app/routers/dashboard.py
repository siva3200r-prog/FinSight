from fastapi import APIRouter, Depends, HTTPException
import pandas as pd
from typing import Dict, Any
from app.database import get_db, Client
from datetime import datetime

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(db: Client = Depends(get_db)):
    if not db:
        raise HTTPException(status_code=500, detail="DB Connection unavailable")
    
    # Normally handle user auth here
    user_id = 1
    
    # 1. Total Expenses
    exp_res = db.table("expenses").select("amount, date").eq("user_id", user_id).execute()
    expenses = exp_res.data if exp_res.data else []
    
    # 2. Total Subscriptions
    sub_res = db.table("subscriptions").select("amount").eq("user_id", user_id).execute()
    subs = sub_res.data if sub_res.data else []
    
    # 3. Total Goals
    goal_res = db.table("goals").select("id").eq("user_id", user_id).execute()
    goals = len(goal_res.data) if goal_res.data else 0

    total_spent = sum([float(e["amount"]) for e in expenses])
    
    monthly_budget_used = 0
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    for e in expenses:
        try:
            d = datetime.strptime(e["date"], "%Y-%m-%d")
            if d.month == current_month and d.year == current_year:
                monthly_budget_used += float(e["amount"])
        except ValueError:
            pass

    return {
        "total_spent": total_spent,
        "monthly_spending": monthly_budget_used,
        "active_goals": goals,
        "subscription_count": len(subs)
    }

@router.get("/monthly-trend")
def get_monthly_trend(db: Client = Depends(get_db)):
    if not db:
        raise HTTPException(status_code=500, detail="DB Connection unavailable")
    user_id = 1
    
    exp_res = db.table("expenses").select("date, amount").eq("user_id", user_id).execute()
    if not exp_res.data:
        return []
        
    df = pd.DataFrame(exp_res.data)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df.dropna(subset=['amount', 'date'], inplace=True)
    
    # Example: group by Day for the current month
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    df_current = df[(df['date'].dt.month == current_month) & (df['date'].dt.year == current_year)]
    
    if df_current.empty:
        return []

    grouped = df_current.groupby(df_current['date'].dt.strftime('%b %d'))['amount'].sum().reset_index()
    grouped = grouped.rename(columns={'date': 'day', 'amount': 'total_spent'})
    
    return grouped.to_dict(orient="records")

@router.get("/category-breakdown")
def get_category_breakdown(db: Client = Depends(get_db)):
    if not db:
         raise HTTPException(status_code=500, detail="DB Connection unavailable")
    user_id = 1
    
    exp_res = db.table("expenses").select("category, amount").eq("user_id", user_id).execute()
    if not exp_res.data:
        return {}
        
    df = pd.DataFrame(exp_res.data)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
    df.dropna(subset=['amount'], inplace=True)
    
    if df.empty:
        return {}

    grouped = df.groupby('category')['amount'].sum()
    total = grouped.sum()
    
    if total == 0:
        return {}
        
    # Return percentages
    percentages = (grouped / total * 100).round(1).to_dict()
    return percentages

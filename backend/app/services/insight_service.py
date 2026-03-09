import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
from supabase import Client

class InsightService:
    def __init__(self, db: Client):
        self.db = db
        self.user_id = 1

    def generate_insights(self) -> List[Dict]:
        """
        Analyzes expense data to find trends, e.g. "Food spending increased 25% this month"
        """
        expense_res = self.db.table("expenses").select("category, amount, date").eq("user_id", self.user_id).execute()
        if not expense_res.data:
             return [{"message": "Not enough data to generate insights. Add more expenses!"}]
             
        df = pd.DataFrame(expense_res.data)
        if df.empty:
             return [{"message": "No expenses recorded yet."}]

        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df.dropna(subset=['amount', 'date'], inplace=True)

        current_date = datetime.now()
        
        # Current month data
        current_month_df = df[
            (df['date'].dt.month == current_date.month) & 
            (df['date'].dt.year == current_date.year)
        ]
        
        # Previous month data (approximate by subtracting 30 days or specifically previous calendar month)
        prev_month = current_date.month - 1 if current_date.month > 1 else 12
        prev_year = current_date.year if current_date.month > 1 else current_date.year - 1
        
        prev_month_df = df[
             (df['date'].dt.month == prev_month) &
             (df['date'].dt.year == prev_year)
        ]

        insights = []

        if not current_month_df.empty and not prev_month_df.empty:
            curr_grouped = current_month_df.groupby('category')['amount'].sum()
            prev_grouped = prev_month_df.groupby('category')['amount'].sum()

            for category in curr_grouped.index:
                curr_amt = curr_grouped[category]
                prev_amt = prev_grouped.get(category, 0)
                
                if prev_amt > 0:
                    pct_change = ((curr_amt - prev_amt) / prev_amt) * 100
                    
                    if pct_change > 20: # Overspending alert
                        savings_if_reduced = curr_amt - prev_amt
                        message = f"{category} spending increased {pct_change:.0f}% this month. Reducing it to last month's levels could save ₹{savings_if_reduced:.0f}."
                        insights.append({
                             "insight_type": "Overspending Alert",
                             "message": message
                        })
                    elif pct_change < -20: # Good behavior
                        message = f"Great job! {category} spending decreased {abs(pct_change):.0f}% compared to last month."
                        insights.append({
                             "insight_type": "Positive Trend",
                             "message": message
                        })

        if not insights:
             insights.append({
                 "insight_type": "General", 
                 "message": "Your spending is stable compared to last month. Keep tracking your expenses!"
             })

        # Persist to database (optional based on spec, but users requested storing it)
        for ins in insights:
            self.db.table("insights").insert({
                "user_id": self.user_id,
                "insight_type": ins["insight_type"],
                "message": ins["message"]
            }).execute()

        return insights

    def get_insights(self) -> List[Dict]:
        result = self.db.table("insights").select("*").eq("user_id", self.user_id).order("created_at", desc=True).limit(5).execute()
        return result.data if result.data else []

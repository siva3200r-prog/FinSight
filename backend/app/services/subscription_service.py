import pandas as pd
from typing import List, Dict
from datetime import datetime
from supabase import Client

class SubscriptionService:
    def __init__(self, db: Client):
        self.db = db
        self.user_id = 1

    def detect_subscriptions(self) -> List[Dict]:
        """
        Detects subscriptions based on the user's historical expenses
        by finding identical merchants and amounts occurring across multiple months.
        """
        # 1. Fetch user expenses
        expense_res = self.db.table("expenses").select("merchant, amount, date").eq("user_id", self.user_id).execute()
        
        if not expense_res.data:
            return []

        # 2. Convert to Pandas DataFrame
        df = pd.DataFrame(expense_res.data)
        if df.empty:
            return []

        # Ensure types
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df.dropna(subset=['amount', 'date'], inplace=True)
        
        # 3. Create a month-year column
        df['month_year'] = df['date'].dt.to_period('M')

        # 4. Group by Merchant and Amount
        grouped = df.groupby(['merchant', 'amount'])
        
        detected_subs = []
        
        for (merchant, amount), group in grouped:
            # Check if this precise merchant+amount combination appears in multiple distinct months
            unique_months = group['month_year'].nunique()
            
            # If it appears in 2 or more distinct months, we consider it a recurring subscription
            if unique_months >= 2:
                # Find the most recent payment date
                last_payment_date = group['date'].max()
                
                # Assume monthly billing cycle default for simple repeating payments
                billing_cycle = "Monthly"
                yearly_cost = float(amount) * 12

                # If the difference between min and max month is roughly equal to unique months - 1
                # it's a solid monthly sub. (Could enhance to detect yearly subscriptions here).

                # Calculate next expected date (+1 month approximation)
                next_month = last_payment_date.month + 1 if last_payment_date.month < 12 else 1
                next_year = last_payment_date.year if last_payment_date.month < 12 else last_payment_date.year + 1
                
                # Handling edge days like 31st safely (simple approach for MVP)
                day = min(last_payment_date.day, 28) 
                next_expected = datetime(next_year, next_month, day)

                detected_subs.append({
                    "service_name": merchant,
                    "amount": float(amount),
                    "billing_cycle": billing_cycle,
                    "last_payment_date": last_payment_date.strftime("%Y-%m-%d"),
                    "next_payment_date": next_expected.strftime("%Y-%m-%d"),
                    "category": "Subscription" # Fallback
                })

        # 5. Save the detected subscriptions if they do not exist
        # Fetch existing to avoid duplicates
        existing_res = self.db.table("subscriptions").select("service_name").eq("user_id", self.user_id).execute()
        existing_names = [sub["service_name"] for sub in existing_res.data] if existing_res.data else []

        new_inserts = []
        for sub in detected_subs:
            if sub["service_name"] not in existing_names:
                sub_copy = sub.copy()
                # Category isn't strictly in the subscriptions table based on prompt but needed for frontend logic
                sub_copy.pop("category", None) 
                sub_copy["user_id"] = self.user_id
                # Insert
                self.db.table("subscriptions").insert(sub_copy).execute()
                new_inserts.append(sub)
            else:
                new_inserts.append(sub) # We'll return it even if it was already known for the UI response

        return detected_subs

    def get_subscriptions(self) -> List[Dict]:
        result = self.db.table("subscriptions").select("*").eq("user_id", self.user_id).execute()
        return result.data if result.data else []

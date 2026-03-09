from supabase import Client
from typing import List, Dict, Any

class ExpenseService:
    def __init__(self, db: Client):
        self.db = db
        # We assume user_id 1 for now until auth is added
        self.user_id = 1

    def add_expense(self, expense_data: dict) -> dict:
        # Inject user_id
        expense_data["user_id"] = self.user_id
        
        # In a real scenario we'd use .execute() and check for errors,
        # but the supabase-py syntax typically is:
        result = self.db.table("expenses").insert(expense_data).execute()
        
        # result.data contains the inserted row(s)
        if result.data:
            return result.data[0]
        raise Exception("Failed to insert expense")

    def get_expenses(self) -> List[dict]:
        result = self.db.table("expenses").select("*").eq("user_id", self.user_id).order("date", desc=True).execute()
        return result.data if result.data else []

    def delete_expense(self, expense_id: int) -> bool:
        result = self.db.table("expenses").delete().eq("id", expense_id).eq("user_id", self.user_id).execute()
        return len(result.data) > 0 if result.data else False

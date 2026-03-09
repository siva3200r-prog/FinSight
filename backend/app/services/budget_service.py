from app.models import BudgetRequest, BudgetResponse

class BudgetService:
    def __init__(self):
        pass

    def generate_budget(self, data: BudgetRequest) -> BudgetResponse:
        """
        Calculates a budget based on the 50-30-20 rule slightly modified for the categories required by the frontend.
        Usually: 50% Needs, 30% Wants, 20% Savings.
        
        Formula defined by user:
        available_money = income - fixed_expenses - savings_goal
        
        We'll map this into the output example provided:
        Food, Transport, Entertainment, Savings
        """
        income = data.monthly_income
        fixed = data.fixed_expenses
        savings_target = data.savings_goal

        available_money = income - fixed - savings_target
        if available_money < 0:
            available_money = 0
            
        # Example Output Distribution for the available money (Wants/Variables):
        # 50% Food, 25% Transport, 25% Entertainment
        # (This adapts the available money to the specific required categories)
        food_budget = available_money * 0.50
        transport_budget = available_money * 0.25
        entertainment_budget = available_money * 0.25

        return BudgetResponse(
            Food=round(food_budget, 2),
            Transport=round(transport_budget, 2),
            Entertainment=round(entertainment_budget, 2),
            Savings=round(savings_target, 2)
        )

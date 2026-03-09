import { Expense, Goal } from "../types";

export const api = {
  async getExpenses(): Promise<Expense[]> {
    const res = await fetch("/api/expenses");
    return res.json();
  },
  async addExpense(expense: Omit<Expense, "id" | "created_at">): Promise<{ id: number }> {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    });
    return res.json();
  },
  async deleteExpense(id: number) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  },
  async getGoals(): Promise<Goal[]> {
    const res = await fetch("/api/goals");
    return res.json();
  },
  async addGoal(goal: Omit<Goal, "id" | "current_amount" | "created_at">): Promise<{ id: number }> {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goal),
    });
    return res.json();
  },
  async updateGoalProgress(id: number, current_amount: number) {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_amount }),
    });
  },
  async deleteGoal(id: number) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  },
  async signup(data: any) {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async login(data: any) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async detectSubscriptions() {
    const res = await fetch("/api/subscriptions/detect");
    return res.json();
  },
};

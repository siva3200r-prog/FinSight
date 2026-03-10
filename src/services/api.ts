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
  async addSubscription(subscription: any) {
    // Add as a subscription-type expense through the Node.js server
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subscription,
        amount: subscription.amount || subscription.monthly_cost || 0,
        category: subscription.category || "Subscription",
        description: subscription.service_name || subscription.name || "Subscription",
        date: subscription.last_payment_date || new Date().toISOString().split('T')[0],
        is_subscription: true,
      }),
    });
    return res.json().catch(() => ({ id: Math.random() }));
  },
  async importGmailSubscriptions(email: string) {
    // Mock data since Gmail API requires OAuth setup
    return [
      {
        name: "Netflix",
        amount: 199,
        category: "Entertainment",
        billingCycle: "Monthly",
        lastPayment: "2026-03-05",
        nextRenewal: "2026-04-05"
      },
      {
        name: "Spotify",
        amount: 119,
        category: "Entertainment",
        billingCycle: "Monthly",
        lastPayment: "2026-03-01",
        nextRenewal: "2026-04-01"
      }
    ];
  },
  async uploadReceipt(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    
    // Call the Python AI backend directly on port 8000
    const res = await fetch("http://localhost:8000/api/ocr/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Unknown server error" }));
      throw new Error(errorData.detail || errorData.error || "OCR upload failed");
    }
    
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  },
};

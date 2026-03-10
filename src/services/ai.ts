import { GoogleGenAI, Type } from "@google/genai";
import { Expense } from "../types";
import { api } from "./api";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function scanReceipt(file: File) {
  return api.uploadReceipt(file);
}

export async function getFinancialInsights(expenses: Expense[]) {
  const ai = getAI();
  const model = "gemini-1.5-flash-8b";
  const expenseSummary = expenses.map(e => `${e.date}: ${e.amount} on ${e.category} (${e.description})`).join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze these expenses (amounts are in Indian Rupees - INR) and provide 3-4 concise financial insights, saving suggestions, and detect potential recurring subscriptions. Format as Markdown.
    
    Expenses:
    ${expenseSummary}`,
  });

  return response.text;
}

export async function chatWithAdvisor(message: string, expenses: Expense[]) {
  const ai = getAI();
  const model = "gemini-1.5-flash-8b";
  const expenseSummary = expenses.map(e => `${e.date}: ${e.amount} on ${e.category} (${e.description})`).join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: {
      systemInstruction: `You are a professional financial advisor in India. Use the user's expense data (amounts are in Indian Rupees - INR) to provide personalized advice. Be encouraging and practical.
      
      User Expenses:
      ${expenseSummary}`,
    },
  });

  return response.text;
}

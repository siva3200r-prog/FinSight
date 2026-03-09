import { GoogleGenAI, Type } from "@google/genai";
import { Expense } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function scanReceipt(base64Image: string) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
          {
            text: "Extract expense details from this receipt. Return a JSON object with amount (number), category (one of: Food, Transport, Entertainment, Shopping, Utilities, Health, Education, Other), description (string), date (YYYY-MM-DD), merchant_name (string), payment_method (one of: UPI, Credit Card, Debit Card, Cash, Net Banking, Wallet), and classification (one of: Essential, Non-Essential).",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING },
          merchant_name: { type: Type.STRING },
          payment_method: { type: Type.STRING },
          classification: { type: Type.STRING },
        },
        required: ["amount", "category", "description", "date"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function getFinancialInsights(expenses: Expense[]) {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
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
  const model = "gemini-3-flash-preview";
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

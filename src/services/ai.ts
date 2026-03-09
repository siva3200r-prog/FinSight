import { GoogleGenAI, Type } from "@google/genai";
import { Expense } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function scanReceipt(base64Image: string) {
  const ai = getAI();
  const model = "gemini-2.0-flash";
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
            text: `You are an AI financial assistant.

Analyze the uploaded receipt image and extract the expense details clearly.

Return the information in structured JSON format with the following fields:

{
  "amount": (total amount as a number),
  "category": (one of: Food, Transport, Entertainment, Shopping, Utilities, Health, Education, Grocery, Bills, Other),
  "description": (brief summary of purchase, e.g. "Groceries at BigBazaar"),
  "date": (in YYYY-MM-DD format),
  "merchant_name": (shop or merchant name),
  "payment_method": (one of: UPI, Credit Card, Debit Card, Cash, Net Banking, Wallet, or null if unknown),
  "classification": (one of: Essential, Non-Essential),
  "currency": (currency symbol like ₹, $, €),
  "items": (array of {item_name, price} objects for each line item)
}

Instructions:
1. Identify the shop or merchant name.
2. Extract the purchase date. If only partial date, infer the full date.
3. Extract the total amount paid as a number (no currency symbol).
4. Detect the currency symbol (₹, $, €, etc.).
5. Extract purchased items with their individual prices.
6. Categorize the expense (Food, Grocery, Transport, Shopping, Bills, etc.).
7. If a field is missing in the receipt, return null for that field.
8. Only return valid JSON. Do not include explanations.`,
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
          currency: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item_name: { type: Type.STRING },
                price: { type: Type.NUMBER },
              },
            },
          },
        },
        required: ["amount", "category", "description", "date"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function getFinancialInsights(expenses: Expense[]) {
  const ai = getAI();
  const model = "gemini-2.0-flash";
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
  const model = "gemini-2.0-flash";
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

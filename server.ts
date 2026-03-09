import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("expenses.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    is_subscription BOOLEAN DEFAULT 0,
    merchant_name TEXT,
    payment_method TEXT,
    location TEXT,
    mood TEXT,
    classification TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add new columns to expenses if they don't exist
const columns = db.prepare("PRAGMA table_info(expenses)").all();
const columnNames = columns.map((c: any) => c.name);
const newColumns = [
  { name: "merchant_name", type: "TEXT" },
  { name: "payment_method", type: "TEXT" },
  { name: "location", type: "TEXT" },
  { name: "mood", type: "TEXT" },
  { name: "classification", type: "TEXT" }
];

newColumns.forEach(col => {
  if (!columnNames.includes(col.name)) {
    db.exec(`ALTER TABLE expenses ADD COLUMN ${col.name} ${col.type}`);
  }
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3005;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/expenses", (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
    const { amount, category, description, date, is_subscription, merchant_name, payment_method, location, mood, classification } = req.body;
    const info = db.prepare(
      "INSERT INTO expenses (amount, category, description, date, is_subscription, merchant_name, payment_method, location, mood, classification) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(amount, category, description, date, is_subscription ? 1 : 0, merchant_name, payment_method, location, mood, classification);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/expenses/:id", (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
    res.sendStatus(204);
  });

  app.get("/api/goals", (req, res) => {
    const goals = db.prepare("SELECT * FROM goals ORDER BY created_at DESC").all();
    res.json(goals);
  });

  app.post("/api/goals", (req, res) => {
    const { name, target_amount, deadline } = req.body;
    const info = db.prepare(
      "INSERT INTO goals (name, target_amount, deadline) VALUES (?, ?, ?)"
    ).run(name, target_amount, deadline);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/goals/:id", (req, res) => {
    const { current_amount } = req.body;
    db.prepare("UPDATE goals SET current_amount = ? WHERE id = ?").run(current_amount, req.params.id);
    res.sendStatus(204);
  });

  app.delete("/api/goals/:id", (req, res) => {
    db.prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);
    res.sendStatus(204);
  });

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const info = db.prepare(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
      ).run(name, email, password);
      res.json({ id: info.lastInsertRowid, name, email });
    } catch (error) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ id: user.id, name: user.name, email: user.email });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Subscription Detection Logic
  app.get("/api/subscriptions/detect", (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses").all();
    const groups: Record<string, any[]> = {};

    // Group by merchant_name (or description as fallback) and amount
    expenses.forEach((e: any) => {
      const merchant = e.merchant_name || e.description;
      const key = `${merchant.toLowerCase()}-${Math.round(e.amount)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    const subscriptions = Object.values(groups).filter(group => {
      if (group.length < 2) return false;
      // Check if dates are roughly monthly apart
      const dates = group.map(g => new Date(g.date).getTime()).sort();
      const intervals = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(dates[i] - dates[i - 1]);
      }
      // Roughly 25-35 days
      const isMonthly = intervals.every(int => int > 20 * 24 * 3600 * 1000 && int < 40 * 24 * 3600 * 1000);
      return isMonthly;
    }).map(group => {
      const lastDate = group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date;
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + 1);

      return {
        description: group[0].description,
        merchant_name: group[0].merchant_name || group[0].description,
        amount: group[0].amount,
        category: group[0].category,
        frequency: "Monthly",
        last_date: lastDate,
        next_expected_date: nextDate.toISOString().split('T')[0],
        yearly_cost: group[0].amount * 12
      };
    });

    res.json(subscriptions);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

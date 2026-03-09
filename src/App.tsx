import React, { useState, useEffect } from 'react';
import {
  Plus,
  Receipt,
  TrendingUp,
  Target,
  MessageSquare,
  Trash2,
  BrainCircuit,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  PieChart as LucidePieChart,
  ShoppingBag,
  MapPin,
  CreditCard,
  Smile
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { api } from './services/api';
import { scanReceipt, getFinancialInsights, chatWithAdvisor } from './services/ai';
import { Expense, Goal, Category, PaymentMethod, PurchaseLocation, Mood, Classification } from './types';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { GmailSubscriptionImport } from './components/GmailSubscriptionImport';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Health', 'Education', 'Other'];
const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];

const SAMPLE_EXPENSES: Expense[] = [
  {
    id: -1,
    amount: 1200,
    category: 'Food',
    description: 'Dinner at Restaurant',
    date: new Date().toISOString().split('T')[0],
    is_subscription: false,
    merchant_name: 'Local Diner',
    payment_method: 'UPI',
    location: 'Restaurant',
    mood: 'Celebration',
    classification: 'Non-Essential',
    created_at: new Date().toISOString()
  },
  {
    id: -2,
    amount: 600,
    category: 'Transport',
    description: 'Uber Ride',
    date: new Date().toISOString().split('T')[0],
    is_subscription: false,
    merchant_name: 'Uber',
    payment_method: 'Wallet',
    location: 'Online',
    mood: 'Regular',
    classification: 'Essential',
    created_at: new Date().toISOString()
  },
  {
    id: -3,
    amount: 2000,
    category: 'Shopping',
    description: 'New Shoes',
    date: new Date().toISOString().split('T')[0],
    is_subscription: false,
    merchant_name: 'Amazon',
    payment_method: 'Credit Card',
    location: 'Online',
    mood: 'Impulse purchase',
    classification: 'Non-Essential',
    created_at: new Date().toISOString()
  }
];

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'goals' | 'advisor' | 'subscriptions'>('dashboard');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingSubscription, setIsAddingSubscription] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningMode, setScanningMode] = useState<'expense' | 'subscription'>('expense');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [exp, gls, subs] = await Promise.all([
      api.getExpenses(),
      api.getGoals(),
      api.detectSubscriptions()
    ]);
    setExpenses(exp);
    setGoals(gls);
    setSubscriptions(subs);
  };

  const handleAddExpense = async (expense: Omit<Expense, "id" | "created_at">) => {
    await api.addExpense(expense);
    setIsAddingExpense(false);
    loadData();
  };

  const handleAddSubscription = async (sub: any) => {
    await api.addSubscription(sub);
    // Locally add it if the backend mock doesn't persist POSTs
    setSubscriptions(prev => [{ ...sub, id: Math.random() }, ...prev]);
    setIsAddingSubscription(false);
    // In a real app we'd just call loadData(), but since it's mocked let's do both
    loadData();
  };

  const handleGmailImportSuccess = (newSubs: any[]) => {
    setSubscriptions(prev => {
      const existingNames = new Set(prev.map(s => s.merchant_name));
      const filteredNew = newSubs.filter(s => !existingNames.has(s.merchant_name));
      return [...filteredNew, ...prev];
    });
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm("Delete this expense?")) {
      await api.deleteExpense(id);
      loadData();
    }
  };

  const handleUpdateGoal = async (id: number, current: number) => {
    const amount = prompt("Enter amount to add:", "0");
    if (amount) {
      await api.updateGoalProgress(id, current + Number(amount));
      loadData();
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      await api.deleteGoal(id);
      loadData();
    }
  };

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await api.addGoal({
      name: formData.get('name') as string,
      target_amount: Number(formData.get('target_amount')),
      deadline: formData.get('deadline') as string,
    });
    setIsAddingGoal(false);
    loadData();
  };

  const generateInsights = async () => {
    if (expenses.length === 0) return;
    setIsLoadingInsights(true);
    try {
      const text = await getFinancialInsights(expenses);
      setInsights(text || "No insights available yet.");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const displayExpenses = expenses.length > 0 ? expenses : SAMPLE_EXPENSES;

  const totalSpent = displayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlySpent = displayExpenses
    .filter(e => isWithinInterval(parseISO(e.date), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }))
    .reduce((sum, e) => sum + e.amount, 0);

  const categoryData = CATEGORIES.map(cat => ({
    name: cat,
    value: displayExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  })).filter(d => d.value > 0);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    return {
      date: format(d, 'MMM dd'),
      amount: displayExpenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0)
    };
  }).reverse();

  const paymentMethodData = Object.entries(
    displayExpenses.reduce((acc, e) => {
      if (e.payment_method) {
        acc[e.payment_method] = (acc[e.payment_method] || 0) + e.amount;
      }
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const classificationData = Object.entries(
    displayExpenses.reduce((acc, e) => {
      if (e.classification) {
        acc[e.classification] = (acc[e.classification] || 0) + e.amount;
      }
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FinSight AI</h1>
        </div>

        <div className="flex flex-col gap-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BrainCircuit size={20} />} label="Dashboard" />
          <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<Wallet size={20} />} label="Expenses" />
          <NavButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} icon={<Calendar size={20} />} label="Subscriptions" />
          <NavButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target size={20} />} label="Goals" />
          <NavButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquare size={20} />} label="AI Advisor" />
        </div>

        <div className="mt-auto">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Monthly Budget</p>
            <p className="text-lg font-bold">₹{monthlySpent.toLocaleString()}</p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-slate-900 h-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 md:px-10 flex items-center justify-end gap-4 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                onClick={() => setUser(null)}
                className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                title="Sign Out"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="btn-secondary text-sm py-2"
            >
              Sign In
            </button>
          )}
        </header>

        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Financial Overview</h2>
                    <p className="text-slate-500">Welcome back! Here's what's happening with your money.</p>
                  </div>
                  <button onClick={() => setIsAddingExpense(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> Add Expense
                  </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard title="Total Spent" value={`₹${totalSpent.toLocaleString()}`} trend="+12%" trendUp={false} icon={Wallet} />
                  <StatCard title="Monthly Spending" value={`₹${monthlySpent.toLocaleString()}`} trend="-5%" trendUp={true} icon={TrendingUp} />
                  <StatCard title="Active Goals" value={goals.length.toString()} trend="2 near completion" trendUp={true} icon={Target} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card p-8 bg-white/40 backdrop-blur-xl border-white/30 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-slate-900">Spending by Category</h3>
                      <LucidePieChart className="text-slate-400" />
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.8)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      {categoryData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-white/40">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-sm font-semibold text-slate-600">{d.name}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">₹{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="card p-8 bg-white/40 backdrop-blur-xl border-white/30 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-slate-900">Spending Trend</h3>
                      <TrendingUp className="text-slate-400" />
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0f172a" stopOpacity={1} />
                              <stop offset="100%" stopColor="#334155" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <Tooltip
                            cursor={{ fill: 'rgba(15, 23, 42, 0.05)', radius: 12 }}
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.8)' }}
                          />
                          <Bar dataKey="amount" fill="url(#barGradient)" radius={[12, 12, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <AlertCircle size={120} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertCircle size={20} className="text-rose-400" />
                          <h4 className="font-bold text-lg">Overspending Alert</h4>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">Your spending on <span className="text-white font-bold">Shopping</span> is 25% higher than last month. Consider reviewing your non-essential purchases to stay on track with your goals.</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6 bg-white/40 backdrop-blur-xl border-white/30"
                  >
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Payment Methods</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {paymentMethodData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {paymentMethodData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">{d.name}</span>
                          <span className="font-bold">₹{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6 bg-white/40 backdrop-blur-xl border-white/30"
                  >
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Need vs Want</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classificationData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0f172a" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card p-6 bg-white/40 backdrop-blur-xl border-white/30"
                  >
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Spending Moods</h3>
                    <div className="space-y-4">
                      {Object.entries(
                        displayExpenses.reduce((acc, e) => {
                          if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([mood, count]) => (
                        <div key={mood} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-600">{mood}</span>
                              <span className="text-slate-400">{count} times</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full">
                              <div
                                className="bg-slate-900 h-full rounded-full"
                                style={{ width: `${(Number(count) / displayExpenses.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="text-emerald-600" size={20} /> Smart Saving Suggestions
                    </h3>
                    <div className="space-y-4">
                      {categoryData.filter(d => d.value > totalSpent * 0.2).map(d => (
                        <div key={d.name} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-900">High spending in {d.name}</p>
                          <p className="text-xs text-emerald-700 mt-1">
                            You've spent ₹{d.value.toLocaleString()} on {d.name} this month.
                            Reducing this by 15% could save you ₹{Math.round(d.value * 0.15).toLocaleString()}!
                          </p>
                        </div>
                      ))}
                      {categoryData.length === 0 && (
                        <p className="text-slate-500 text-sm italic">Add more expenses to see personalized saving tips.</p>
                      )}
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-sm font-bold text-indigo-900">Subscription Optimization</p>
                        <p className="text-xs text-indigo-700 mt-1">
                          We detected {subscriptions.length} recurring subscriptions. Review them to find unused services.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <BrainCircuit className="text-slate-900" size={20} /> AI Financial Insights
                      </h3>
                      <button
                        onClick={generateInsights}
                        disabled={isLoadingInsights || expenses.length === 0}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        {isLoadingInsights ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                        Refresh Insights
                      </button>
                    </div>
                    {insights ? (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 whitespace-pre-wrap text-slate-600 leading-relaxed">
                        {insights}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <BrainCircuit className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">Click refresh to generate AI insights based on your spending patterns.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
                    <p className="text-slate-500">Manage and track all your transactions.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setScanningMode('expense'); setIsScanning(true); }} className="btn-secondary flex items-center gap-2">
                      <Receipt size={20} /> Scan Receipt
                    </button>
                    <button onClick={() => setIsAddingExpense(true)} className="btn-primary flex items-center gap-2">
                      <Plus size={20} /> Add Manual
                    </button>
                  </div>
                </header>

                <div className="card">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-bottom border-slate-100 bg-slate-50">
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Date</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Description</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Category</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Amount</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Type</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(expense => (
                        <tr key={expense.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm text-slate-600">{format(parseISO(expense.date), 'MMM dd, yyyy')}</td>
                          <td className="p-4 font-medium">{expense.description}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">{expense.category}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-900">₹{expense.amount.toLocaleString()}</td>
                          <td className="p-4">
                            {expense.is_subscription ? (
                              <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                                <Calendar size={12} /> Subscription
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">One-time</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button onClick={() => handleDeleteExpense(expense.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400">No expenses recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'subscriptions' && (
              <motion.div
                key="subscriptions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <header className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Recurring Subscriptions</h2>
                    <p className="text-slate-500">Automatically detected and manually added recurring payments.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setScanningMode('subscription'); setIsScanning(true); }} className="btn-secondary flex items-center gap-2">
                      <Receipt size={20} /> Scan Receipt
                    </button>
                    <button onClick={() => setIsAddingSubscription(true)} className="btn-primary flex items-center gap-2">
                      <Plus size={20} /> Add Subscription
                    </button>
                  </div>
                </header>

                <GmailSubscriptionImport onImportSuccess={handleGmailImportSuccess} />

                {subscriptions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <StatCard
                      title="Total Subscriptions"
                      value={subscriptions.length.toString()}
                      trend="Active"
                      trendUp={true}
                      icon={Calendar}
                    />
                    <StatCard
                      title="Monthly Subscription Cost"
                      value={`₹${subscriptions.reduce((acc, sub) => acc + sub.amount, 0).toLocaleString()}`}
                      trend="Per Month"
                      trendUp={false}
                      icon={Wallet}
                    />
                    <StatCard
                      title="Yearly Subscription Cost"
                      value={`₹${subscriptions.reduce((acc, sub) => acc + sub.yearly_cost, 0).toLocaleString()}`}
                      trend="Per Year"
                      trendUp={false}
                      icon={TrendingUp}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subscriptions.map((sub, i) => (
                    <div key={i} className="card p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                          <Calendar className="text-indigo-600" size={24} />
                        </div>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">Active</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{sub.merchant_name}</h4>
                        <p className="text-sm text-slate-500">₹{sub.amount}/month • {sub.category}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs text-slate-400">Last payment</p>
                            <p className="font-medium text-sm">{format(parseISO(sub.last_date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Next renewal</p>
                            <p className="font-medium text-sm text-slate-900">{format(parseISO(sub.next_expected_date), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs text-slate-400">Yearly cost</span>
                          <span className="text-sm font-bold text-slate-900">₹{sub.yearly_cost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {subscriptions.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                      <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-500">No recurring subscriptions detected yet. Add expenses like Netflix, Spotify, or other monthly payments to enable automatic subscription detection.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
                    <p className="text-slate-500">Set targets and watch your savings grow.</p>
                  </div>
                  <button onClick={() => setIsAddingGoal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> New Goal
                  </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {goals.map(goal => {
                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    return (
                      <div key={goal.id} className="card p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Target className="text-slate-900" size={24} />
                          </div>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{goal.name}</h4>
                          <p className="text-sm text-slate-500">Target: ₹{goal.target_amount.toLocaleString()}</p>
                          {goal.deadline && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar size={12} /> {format(parseISO(goal.deadline), 'MMM dd, yyyy')}</p>}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">₹{goal.current_amount.toLocaleString()} saved</span>
                            <span className="text-slate-500">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="bg-slate-900 h-full"
                            />
                          </div>
                        </div>
                        <button onClick={() => handleUpdateGoal(goal.id, goal.current_amount)} className="w-full btn-secondary text-sm">Add Funds</button>
                      </div>
                    );
                  })}
                  <button onClick={() => setIsAddingGoal(true)} className="card border-dashed border-slate-300 bg-transparent p-12 flex flex-col items-center justify-center gap-4 hover:bg-slate-50 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="text-slate-400" />
                    </div>
                    <span className="text-slate-500 font-medium">Create New Goal</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'advisor' && (
              <motion.div
                key="advisor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-[calc(100vh-120px)] flex flex-col"
              >
                <header className="mb-6">
                  <h2 className="text-3xl font-bold tracking-tight">AI Financial Advisor</h2>
                  <p className="text-slate-500">Ask anything about your finances or get planning advice.</p>
                </header>
                <ChatInterface expenses={expenses} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        <AddExpenseModal
          isOpen={isAddingExpense}
          onClose={() => setIsAddingExpense(false)}
          onAdd={handleAddExpense as any}
        />

        <AddSubscriptionModal
          isOpen={isAddingSubscription}
          onClose={() => setIsAddingSubscription(false)}
          onAdd={handleAddSubscription as any}
        />

        {isScanning && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Scan Receipt</h3>
                <button onClick={() => setIsScanning(false)} className="text-slate-400 hover:text-slate-900"><X /></button>
              </div>
              <ReceiptScanner
                onComplete={() => { setIsScanning(false); loadData(); }}
                isSubscriptionMode={scanningMode === 'subscription'}
              />
            </motion.div>
          </div>
        )}

        {isAddingGoal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">New Financial Goal</h3>
                <button onClick={() => setIsAddingGoal(false)} className="text-slate-400 hover:text-slate-900"><X /></button>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Goal Name</label>
                  <input name="name" type="text" required className="input" placeholder="e.g. New Car, Emergency Fund" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Amount (₹)</label>
                  <input name="target_amount" type="number" required className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Date (Optional)</label>
                  <input name="deadline" type="date" className="input" />
                </div>
                <button type="submit" className="w-full btn-primary py-3 mt-4">Create Goal</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAuthOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
                <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 hover:text-slate-900"><X /></button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                try {
                  const res = authMode === 'login'
                    ? await api.login(data)
                    : await api.signup(data);
                  setUser(res);
                  setIsAuthOpen(false);
                } catch (error: any) {
                  alert(error.message);
                }
              }} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input name="name" type="text" required className="input !pl-10" placeholder="John Doe" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input name="email" type="email" required className="input !pl-10" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input name="password" type="password" required className="input !pl-10" placeholder="••••••••" />
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary py-3 mt-4">
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="ml-1 font-bold text-slate-900 hover:underline"
                  >
                    {authMode === 'login' ? 'Sign Up' : 'Log In'}
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, trend, trendUp, icon: Icon }: { title: string, value: string, trend: string, trendUp: boolean, icon: any }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="card p-6 relative overflow-hidden group border-white/30 bg-white/40 backdrop-blur-xl"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={80} />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20">
          <Icon size={20} />
        </div>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {trend}
            </span>
            <span className="text-xs text-slate-400 font-semibold">vs last month</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReceiptScanner({ onComplete, isSubscriptionMode = false }: { onComplete: () => void, isSubscriptionMode?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    setFile(f);
    setScanError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleScan = async () => {
    if (!preview) return;
    setIsProcessing(true);
    setScanError(null);
    try {
      const data = await scanReceipt(preview);
      if (!data || (!data.amount && !data.description)) {
        setScanError("Could not extract data from this receipt. Please check your GEMINI_API_KEY in the .env file.");
      } else {
        setResult(data);
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || String(error);
      if (msg.includes("API key") || msg.includes("apiKey") || msg.includes("401") || msg.includes("403")) {
        setScanError("Gemini API key is missing or invalid. Please add your GEMINI_API_KEY to the .env file in the project root.");
      } else {
        setScanError(`AI analysis failed: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    if (isSubscriptionMode) {
      await api.addExpense({
        ...result,
        is_subscription: true,
        date: new Date().toISOString().split('T')[0],
        location: 'Other',
        mood: 'Regular',
      });
      // Also add it purely as a subscription model for the ui logic
      await api.addSubscription({
        service_name: result.merchant_name || 'Unknown Subscription',
        amount: result.amount || 0,
        billing_cycle: 'Monthly',
        last_payment_date: result.date || new Date().toISOString().split('T')[0],
        next_payment_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        category: result.category || 'Other'
      });
    } else {
      await api.addExpense({
        ...result,
        is_subscription: false,
        date: new Date().toISOString().split('T')[0],
        location: 'Other',
        mood: 'Regular',
      });
    }

    onComplete();
  };

  return (
    <div className="space-y-6">
      {!preview ? (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${isDragActive ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
          }`}>
          <input {...getInputProps()} />
          <Receipt className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-600 font-medium">Drag & drop a receipt image, or click to select</p>
          <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-64 bg-slate-100">
            <img src={preview} alt="Receipt" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            <button onClick={() => { setPreview(null); setResult(null); }} className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur rounded-full shadow-sm"><X size={16} /></button>
          </div>

          {scanError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
              <p className="font-bold mb-1">⚠️ Analysis Failed</p>
              <p>{scanError}</p>
            </div>
          )}

          {result ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-400">Extracted Data</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Success</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="font-bold text-lg">{result.currency || '₹'}{result.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-bold">{result.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Merchant</p>
                  <p className="font-bold">{result.merchant_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-bold">{result.date || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment Method</p>
                  <p className="font-bold">{result.payment_method || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Classification</p>
                  <p className="font-bold">{result.classification || 'Essential'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="font-bold">{result.description}</p>
                </div>
              </div>

              {result.items && result.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-bold uppercase text-slate-400 mb-2">Itemized Breakdown</p>
                  <div className="space-y-1">
                    {result.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-700">{item.item_name}</span>
                        <span className="font-medium text-slate-900">{result.currency || '₹'}{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleScan}
              disabled={isProcessing}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
              {isProcessing ? 'Analyzing Receipt...' : 'Analyze with AI'}
            </button>
          )}

          {result && (
            <button onClick={handleSave} className="w-full btn-primary py-3">Confirm & Save Expense</button>
          )}
        </div>
      )}
    </div>
  );
}

function ChatInterface({ expenses }: { expenses: Expense[] }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Hello! I'm your FinSight AI Advisor. How can I help you with your finances today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await chatWithAdvisor(userMsg, expenses);
      setMessages(prev => [...prev, { role: 'ai', content: response || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-xl rounded-3xl border border-white/30 overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-5 rounded-3xl shadow-sm ${msg.role === 'user'
              ? 'bg-slate-900 text-white rounded-tr-none'
              : 'bg-white/80 text-slate-900 rounded-tl-none border border-white/50'
              }`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/80 p-4 rounded-3xl rounded-tl-none flex gap-1 border border-white/50">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="p-6 bg-white/20 border-t border-white/30 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending, saving tips, or financial planning..."
          className="flex-1 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-sm"
        />
        <button type="submit" disabled={!input.trim() || isTyping} className="btn-primary p-4 rounded-2xl shadow-lg shadow-slate-900/20">
          <ArrowUpRight />
        </button>
      </form>
    </div>
  );
}

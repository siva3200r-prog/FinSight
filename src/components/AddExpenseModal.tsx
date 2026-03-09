import React from 'react';
import { X, Wallet, Calendar, Plus } from 'lucide-react';
import { Category } from '../types';
import { motion } from 'framer-motion';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Health', 'Education', 'Other'];

export function AddExpenseModal({
    isOpen,
    onClose,
    onAdd
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (expense: any) => Promise<void>;
}) {
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const expense = {
            amount: Number(formData.get('amount')),
            category: formData.get('category') as Category,
            description: formData.get('description') as string,
            date: formData.get('date') as string,
            is_subscription: false, // Normal expense
            classification: formData.get('classification') || 'Non-Essential',
            merchant_name: formData.get('description') as string, // Fallback for merchant
        };
        await onAdd(expense);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold">Add Manual Expense</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₹)</label>
                        <div className="relative">
                            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input name="amount" type="number" step="0.01" required className="input !pl-12 w-full border border-slate-200 rounded-xl px-4 py-3" placeholder="0.00" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                        <select name="category" className="input w-full border border-slate-200 rounded-xl px-4 py-3 appearance-none">
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <input name="description" type="text" required className="input w-full border border-slate-200 rounded-xl px-4 py-3" placeholder="What did you buy?" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input name="date" type="date" required className="input !pl-12 w-full border border-slate-200 rounded-xl px-4 py-3" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                            <input type="text" disabled value="One-time" className="input w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-slate-500 cursor-not-allowed" />
                        </div>
                    </div>

                    <button type="submit" className="w-full btn-primary py-4 mt-4 text-lg bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold flex justify-center items-center gap-2">
                        <Plus size={20} /> Save Expense
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

import React from 'react';
import { X, Calendar, Wallet, Plus } from 'lucide-react';
import { Category, Subscription } from '../types';
import { motion } from 'framer-motion';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Health', 'Education', 'Other'];

export function AddSubscriptionModal({
    isOpen,
    onClose,
    onAdd
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (sub: Subscription) => Promise<void>;
}) {
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const amount = Number(formData.get('amount'));
        const billingCycle = formData.get('billing_cycle') as 'Monthly' | 'Yearly';
        const yearlyCost = billingCycle === 'Monthly' ? amount * 12 : amount;

        const subscription: Subscription = {
            merchant_name: formData.get('merchant_name') as string,
            category: formData.get('category') as string,
            amount,
            billing_cycle: billingCycle,
            last_date: formData.get('last_payment') as string,
            next_expected_date: formData.get('next_renewal') as string,
            yearly_cost: yearlyCost
        };
        await onAdd(subscription);
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
                    <h3 className="text-2xl font-bold">Add Subscription</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Subscription Name</label>
                        <input name="merchant_name" type="text" required className="input w-full border border-slate-200 rounded-xl px-4 py-3" placeholder="e.g. Netflix, Spotify" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                            <select name="category" className="input w-full border border-slate-200 rounded-xl px-4 py-3 appearance-none">
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Cost (₹)</label>
                            <div className="relative">
                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input name="amount" type="number" step="0.01" required className="input !pl-12 w-full border border-slate-200 rounded-xl px-4 py-3" placeholder="0.00" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Billing Cycle</label>
                        <select name="billing_cycle" className="input w-full border border-slate-200 rounded-xl px-4 py-3 appearance-none">
                            <option value="Monthly">Monthly</option>
                            <option value="Yearly">Yearly</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Last Payment Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input name="last_payment" type="date" required className="input !pl-12 w-full border border-slate-200 rounded-xl px-4 py-3" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Next Renewal Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input name="next_renewal" type="date" required className="input !pl-12 w-full border border-slate-200 rounded-xl px-4 py-3" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full btn-primary py-4 mt-4 text-lg bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold flex justify-center items-center gap-2">
                        <Plus size={20} /> Add Subscription
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

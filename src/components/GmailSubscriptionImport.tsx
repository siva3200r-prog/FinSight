import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Subscription } from '../types';

export function GmailSubscriptionImport({
    onImportSuccess
}: {
    onImportSuccess: (subscriptions: Subscription[]) => void;
}) {
    const [email, setEmail] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsImporting(true);
        setSuccessMessage(null);

        try {
            const result = await api.importGmailSubscriptions(email);
            // Map API response to our Subscription type
            const newSubscriptions: Subscription[] = result.map((item: any) => ({
                merchant_name: item.name,
                amount: item.amount,
                category: item.category,
                billing_cycle: item.billingCycle,
                last_date: item.lastPayment,
                next_expected_date: item.nextRenewal,
                yearly_cost: item.billingCycle === 'Monthly' ? item.amount * 12 : item.amount
            }));

            onImportSuccess(newSubscriptions);
            setSuccessMessage(`Successfully imported ${newSubscriptions.length} subscriptions from Gmail`);
            setEmail('');

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error) {
            console.error('Failed to import from Gmail:', error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="card p-6 bg-indigo-50/50 border-indigo-100 mt-8">
            <div className="flex items-center gap-3 mb-4">
                <Mail className="text-indigo-600" size={24} />
                <h3 className="text-xl font-bold text-slate-900">Import Subscriptions from Gmail</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
                Securely scan your email receipts to automatically detect and add your active subscriptions.
            </p>

            {successMessage ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                    <p className="text-sm font-medium text-emerald-900">{successMessage}</p>
                </div>
            ) : (
                <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@gmail.com"
                        required
                        className="input flex-1 border border-indigo-200 rounded-xl px-4 py-3 bg-white"
                        disabled={isImporting}
                    />
                    <button
                        type="submit"
                        disabled={isImporting || !email}
                        className="btn-primary py-3 px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold flex justify-center items-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" /> Fetching...
                            </>
                        ) : (
                            'Fetch Subscriptions'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}

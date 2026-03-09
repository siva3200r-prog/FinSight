export interface Expense {
  id: number;
  amount: number;
  category: Category;
  description: string;
  date: string;
  is_subscription: boolean;
  merchant_name: string;
  payment_method?: PaymentMethod;
  location?: PurchaseLocation;
  mood?: Mood;
  classification?: Classification;
  created_at: string;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
}

export type Category = 
  | 'Food' 
  | 'Transport' 
  | 'Entertainment' 
  | 'Shopping' 
  | 'Utilities' 
  | 'Health' 
  | 'Education' 
  | 'Other';

export type PaymentMethod = 'UPI' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Net Banking' | 'Wallet';
export type PurchaseLocation = 'Online' | 'Supermarket' | 'Restaurant' | 'Fuel Station' | 'Other';
export type Mood = 'Stress shopping' | 'Celebration' | 'Hunger' | 'Impulse purchase' | 'Regular' | 'Other';
export type Classification = 'Essential' | 'Non-Essential';

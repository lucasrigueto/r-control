import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type CategoryType = "INCOME" | "EXPENSE" | "BOTH";
export type AccountType = "CHECKING" | "SAVINGS" | "CASH" | "CREDIT";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  status: PaymentStatus;
  categoryId?: string;
  accountId?: string;
  userId: string;
  notes?: string;
  source: string;
  category?: { name: string; icon: string; color: string };
  account?: { name: string };
  user?: { name: string };
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category: Category;
  spent?: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  imageUrl?: string;
  status: GoalStatus;
}

export interface DashboardSummary {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingAmount: number;
  incomeChange: number;
  expenseChange: number;
  cashflow: { month: string; income: number; expenses: number }[];
  recentTransactions: Transaction[];
}

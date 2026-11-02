export interface BudgetProgress {
  budgetId: number;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

import { Component, OnInit, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { BudgetProgress } from '../../models/budget-progress';
import { Transaction } from '../../models/transaction';
import { TransactionSummary } from '../../models/transaction-summary';
import { BudgetService } from '../../services/budget';
import { TransactionService } from '../../services/transaction';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-transaction-list',
  imports: [DatePipe, CurrencyPipe, NgClass, RouterLink, Button, ConfirmDialog],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.css',
})
export class TransactionList implements OnInit {
  transactions = signal<Transaction[]>([]);
  summary = signal<TransactionSummary>({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });

  // 'YYYY-MM' from <input type="month">; empty string means all time
  selectedMonth = signal('');

  // Budgets are monthly, so with "all time" selected the progress shows the current month.
  budgetProgress = signal<BudgetProgress[]>([]);
  progressLabel = computed(() => {
    const value = this.selectedMonth();
    if (!value) {
      return 'this month';
    }
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  page = signal(1);
  pageSize = 10;
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  confirmDialogOpen = signal(false);
  private pendingDeleteTransaction: Transaction | null = null;

  constructor(
    private transactionService: TransactionService,
    private budgetService: BudgetService,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
    this.loadSummary();
    this.loadProgress();
  }

  editTransaction(transaction: Transaction): void {
    if (transaction.id) {
      this.router.navigate(['/edit', transaction.id]);
    }
  }

  deleteTransaction(transaction: Transaction): void {
    if (!transaction.id) {
      return;
    }

    this.pendingDeleteTransaction = transaction;
    this.confirmDialogOpen.set(true);
  }

  confirmDelete(): void {
    this.confirmDialogOpen.set(false);
    const transaction = this.pendingDeleteTransaction;
    this.pendingDeleteTransaction = null;
    if (!transaction?.id) {
      return;
    }

    this.transactionService.delete(transaction.id).subscribe({
      next: () => {
        this.toastService.success('Transaction deleted.');
        this.loadTransactions();
        this.loadSummary();
        this.loadProgress();
      },
      error: (error) => {
        this.toastService.error('Failed to delete transaction. Please try again.');
        console.log(error);
      },
    });
  }

  cancelDelete(): void {
    this.confirmDialogOpen.set(false);
    this.pendingDeleteTransaction = null;
  }

  loadTransactions(): void {
    const { year, month } = this.monthParts();
    this.transactionService.getAll(this.page(), this.pageSize, year, month).subscribe((result) => {
      this.transactions.set(result.items);
      this.totalCount.set(result.totalCount);
    });
  }

  loadSummary(): void {
    const { year, month } = this.monthParts();
    this.transactionService.getSummary(year, month).subscribe((summary) => {
      this.summary.set(summary);
    });
  }

  loadProgress(): void {
    const { year, month } = this.monthParts();
    this.budgetService.getProgress(year, month).subscribe({
      next: (progress) => this.budgetProgress.set(progress),
      // Budgets are secondary to the dashboard: if they fail to load, keep the rest working.
      error: () => this.budgetProgress.set([]),
    });
  }

  barColor(progress: BudgetProgress): string {
    if (progress.percentUsed >= 100) {
      return 'bg-rose-500';
    }
    return progress.percentUsed >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  }

  onMonthChange(value: string): void {
    this.selectedMonth.set(value);
    this.page.set(1);
    this.loadTransactions();
    this.loadSummary();
    this.loadProgress();
  }

  private monthParts(): { year?: number; month?: number } {
    const value = this.selectedMonth();
    if (!value) {
      return {};
    }
    const [year, month] = value.split('-').map(Number);
    return { year, month };
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.loadTransactions();
  }

  get totalIncome(): number {
    return this.summary().totalIncome;
  }

  get totalExpenses(): number {
    return this.summary().totalExpenses;
  }

  get netBalance(): number {
    return this.summary().netBalance;
  }
}

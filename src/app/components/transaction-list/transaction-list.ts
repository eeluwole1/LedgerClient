import { Component, OnInit, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { Transaction } from '../../models/transaction';
import { TransactionSummary } from '../../models/transaction-summary';
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

  page = signal(1);
  pageSize = 10;
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  confirmDialogOpen = signal(false);
  private pendingDeleteTransaction: Transaction | null = null;

  constructor(
    private transactionService: TransactionService,
    private router: Router,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
    this.loadSummary();
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

  onMonthChange(value: string): void {
    this.selectedMonth.set(value);
    this.page.set(1);
    this.loadTransactions();
    this.loadSummary();
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

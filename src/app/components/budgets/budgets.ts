import { Component, OnInit, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { Card } from '../shared/card/card';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';
import { Budget } from '../../models/budget';
import { EXPENSE_CATEGORIES } from '../../models/categories';
import { BudgetService } from '../../services/budget';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-budgets',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, Button, Card, ConfirmDialog],
  templateUrl: './budgets.html',
  styleUrl: './budgets.css',
})
export class Budgets implements OnInit {
  budgets = signal<Budget[]>([]);
  availableCategories = computed(() =>
    EXPENSE_CATEGORIES.filter((c) => !this.budgets().some((b) => b.category.toLowerCase() === c.toLowerCase())),
  );

  saving = signal(false);
  editingId = signal<number | null>(null);
  confirmDialogOpen = signal(false);
  private pendingDelete: Budget | null = null;

  budgetForm: FormGroup;
  editLimit = new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]);

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private toastService: ToastService,
  ) {
    this.budgetForm = this.fb.group({
      category: ['', Validators.required],
      monthlyLimit: ['', [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.budgetService.getAll().subscribe((budgets) => this.budgets.set(budgets));
  }

  add(): void {
    if (this.budgetForm.invalid) {
      return;
    }

    const { category, monthlyLimit } = this.budgetForm.value;
    this.saving.set(true);
    this.budgetService.create(category, monthlyLimit).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success('Budget added.');
        this.budgetForm.reset({ category: '', monthlyLimit: '' });
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.toastService.error(
          error.status === 409
            ? 'You already have a budget for that category.'
            : 'Failed to add budget. Please try again.',
        );
      },
    });
  }

  startEdit(budget: Budget): void {
    this.editingId.set(budget.id);
    this.editLimit.setValue(budget.monthlyLimit);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(budget: Budget): void {
    if (this.editLimit.invalid || this.editLimit.value === null) {
      return;
    }

    this.budgetService.update(budget.id, this.editLimit.value).subscribe({
      next: () => {
        this.editingId.set(null);
        this.toastService.success('Budget updated.');
        this.load();
      },
      error: () => this.toastService.error('Failed to update budget. Please try again.'),
    });
  }

  remove(budget: Budget): void {
    this.pendingDelete = budget;
    this.confirmDialogOpen.set(true);
  }

  confirmDelete(): void {
    this.confirmDialogOpen.set(false);
    const budget = this.pendingDelete;
    this.pendingDelete = null;
    if (!budget) {
      return;
    }

    this.budgetService.delete(budget.id).subscribe({
      next: () => {
        this.toastService.success('Budget deleted.');
        this.load();
      },
      error: () => this.toastService.error('Failed to delete budget. Please try again.'),
    });
  }

  cancelDelete(): void {
    this.confirmDialogOpen.set(false);
    this.pendingDelete = null;
  }
}

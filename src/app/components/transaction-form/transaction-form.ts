import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { Card } from '../shared/card/card';
import { Transaction } from '../../models/transaction';
import { TransactionService } from '../../services/transaction';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, RouterLink, Button, Card],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.css',
})
export class TransactionForm implements OnInit {
  transactionForm: FormGroup;

  incomeCategories = ['Salary', 'Freelance', 'Investment', 'Rental', 'Business', 'Gift', 'Other Income'];
  expenseCategories = ['Food', 'Transportation', 'Entertainment'];

  availableCategories = signal<string[]>([]);

  editMode = false;
  transactionId?: number;
  saving = signal(false);

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastService: ToastService,
  ) {
    this.transactionForm = this.fb.group({
      type: ['Expense', Validators.required],
      category: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      createdAt: [this.today(), Validators.required],
    });
  }

  ngOnInit(): void {
    this.updateAvailableCategories(this.transactionForm.get('type')?.value);

    this.transactionForm.get('type')?.valueChanges.subscribe((type: string) => {
      this.updateAvailableCategories(type);
      this.transactionForm.patchValue({ category: '' });
    });

    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.transactionId = +id;
      this.loadTransaction(this.transactionId);
    }
  }

  loadTransaction(id: number): void {
    this.transactionService.getById(id).subscribe({
      next: (transaction) => {
        this.updateAvailableCategories(transaction.type);
        // emitEvent: false — otherwise patching `type` here fires the type.valueChanges
        // handler below, which resets `category` back to '' right after we set it.
        this.transactionForm.patchValue(
          {
            type: transaction.type,
            category: transaction.category,
            amount: transaction.amount,
            createdAt: this.toDateInputValue(transaction.createdAt),
          },
          { emitEvent: false },
        );
      },
      error: (error) => {
        console.log(error);
      },
    });
  }

  private updateAvailableCategories(type: string): void {
    this.availableCategories.set(type === 'Expense' ? this.expenseCategories : this.incomeCategories);
  }

  private today(): string {
    return this.toDateInputValue(new Date());
  }

  private toDateInputValue(date: Date | string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      return;
    }

    const { type, category, amount, createdAt } = this.transactionForm.value;
    const payload: Transaction = {
      id: this.transactionId ?? 0,
      type,
      category,
      amount,
      createdAt,
      updatedAt: new Date(),
    };

    this.saving.set(true);

    if (this.editMode && this.transactionId) {
      this.transactionService.update(this.transactionId, payload).subscribe({
        next: () => {
          this.toastService.success('Transaction updated.');
          this.router.navigate(['/transactions']);
        },
        error: (error) => {
          this.saving.set(false);
          this.toastService.error('Failed to save transaction. Please try again.');
          console.log(error);
        },
      });
    } else {
      this.transactionService.create(payload).subscribe({
        next: () => {
          this.toastService.success('Transaction added.');
          this.router.navigate(['/transactions']);
        },
        error: (error) => {
          this.saving.set(false);
          this.toastService.error('Failed to save transaction. Please try again.');
          console.log(error);
        },
      });
    }
  }
}

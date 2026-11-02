import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Budget } from '../models/budget';
import { BudgetProgress } from '../models/budget-progress';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private apiUrl = environment.apiUrl + '/Budgets';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Budget[]> {
    return this.http.get<Budget[]>(this.apiUrl + '/All');
  }

  getProgress(year?: number, month?: number): Observable<BudgetProgress[]> {
    let params = new HttpParams();
    if (year && month) {
      params = params.set('year', year).set('month', month);
    }
    return this.http.get<BudgetProgress[]>(this.apiUrl + '/Progress', { params });
  }

  create(category: string, monthlyLimit: number): Observable<Budget> {
    return this.http.post<Budget>(this.apiUrl + '/Create', { category, monthlyLimit });
  }

  update(id: number, monthlyLimit: number): Observable<Budget> {
    return this.http.put<Budget>(this.apiUrl + '/Update/' + id, { monthlyLimit });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/Delete/' + id);
  }
}

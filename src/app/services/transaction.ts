import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PagedResult } from '../models/paged-result';
import { Transaction } from '../models/transaction';
import { TransactionSummary } from '../models/transaction-summary';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {

  private apiUrl = environment.apiUrl + '/Transactions'

  constructor(private http: HttpClient) { }

  getAll(page: number = 1, pageSize: number = 10): Observable<PagedResult<Transaction>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<Transaction>>(this.apiUrl + '/All', { params });
  }

  getSummary(): Observable<TransactionSummary> {
    return this.http.get<TransactionSummary>(this.apiUrl + '/Summary');
  }

  getById(id: number) : Observable<Transaction> {
    return this.http.get<Transaction>(this.apiUrl+"/Details/"+id);
  }

  create(transaction: Transaction) : Observable<Transaction> {
    return this.http.post<Transaction>(this.apiUrl+"/Create", transaction);
  }
  
  update(id: number, transaction: Transaction) : Observable<Transaction> {
    return this.http.put<Transaction>(this.apiUrl+"/Update/"+id, transaction);
  } 

  delete(id: number) : Observable<void> {
    return this.http.delete<void>(this.apiUrl+"/Delete/"+id);
  }
}

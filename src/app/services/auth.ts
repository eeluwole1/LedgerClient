import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from '../models/auth-response';
import { User } from '../models/user';

const TOKEN_KEY = 'token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private apiUrl = environment.apiUrl + '/Auth'

  private currentUserSubject = new BehaviorSubject<string | null>(null);
  currentUser = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (this.isAuthenticated()) {
      this.currentUserSubject.next('user');
    }
  }

  login(credentials: User, rememberMe = true): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + "/Login", credentials).pipe(
      tap((response) => {
        this.storeToken(response.token, rememberMe);
        this.currentUserSubject.next('user');
      })
    );
  }

  register(credentials: User, rememberMe = true): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + "/Register", credentials).pipe(
      tap((response) => {
        this.storeToken(response.token, rememberMe);
        this.currentUserSubject.next('user');
      })
    );
  }

  logout(): void {
    this.clearToken();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    if (this.isTokenExpired(token)) {
      this.clearToken();
      return false;
    }
    return true;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) {
        return false;
      }
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private storeToken(token: string, rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

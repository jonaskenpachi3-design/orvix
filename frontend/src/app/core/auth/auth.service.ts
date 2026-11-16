import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly API_URL = '/api/auth';
  private readonly TOKEN_KEY = 'orvix_token';
  private readonly USER_KEY = 'orvix_user';

  // Signals reativos
  readonly #token = signal<string | null>(null);
  readonly #user = signal<User | null>(null);
  readonly #loading = signal(false);

  // Computed públicos
  readonly token = this.#token.asReadonly();
  readonly user = this.#user.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly isAuthenticated = computed(() => !!this.#token());

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);

      if (token && userStr) {
        this.#token.set(token);
        this.#user.set(JSON.parse(userStr));
      }
    } catch {
      // Ignorar erros de parsing
      this.clearStorage();
    }
  }

  private saveToStorage(token: string, user: User): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {
      // Ignorar (modo privado, quota excedida, etc)
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch {
      // Ignorar
    }
  }

  /** Login do usuário */
  login(credentials: LoginCredentials) {
    this.#loading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        this.#token.set(response.token);
        this.#user.set(response.user);
        this.saveToStorage(response.token, response.user);
      }),
      catchError((err) => {
        this.#loading.set(false);
        return throwError(() => err);
      })
    );
  }

  /** Cadastro de novo usuário */
  register(data: RegisterData) {
    this.#loading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/register`, data).pipe(
      tap((response) => {
        this.#token.set(response.token);
        this.#user.set(response.user);
        this.saveToStorage(response.token, response.user);
      }),
      catchError((err) => {
        this.#loading.set(false);
        return throwError(() => err);
      })
    );
  }

  /** Obter usuário atual (valida token) */
  me() {
    return this.http.get<User>(`${this.API_URL}/me`).pipe(
      tap((user) => this.#user.set(user)),
      catchError((err) => {
        // Se 401, o interceptor já faz logout
        return throwError(() => err);
      })
    );
  }

  /** Logout */
  logout(): void {
    this.#token.set(null);
    this.#user.set(null);
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  /** Atualiza dados do usuário */
  updateUser(user: Partial<User>): void {
    const current = this.#user();
    if (current) {
      const updated = { ...current, ...user };
      this.#user.set(updated);
      this.saveToStorage(this.#token()!, updated);
    }
  }
}
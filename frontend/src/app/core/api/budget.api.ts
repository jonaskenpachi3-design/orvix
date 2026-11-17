import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { mapBudgets, mapBudgetUsage } from './api-mappers';

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  month: string;
  category?: {
    id: string;
    name: string;
  };
  spent?: number;
  remaining?: number;
  percentage?: number;
}

export interface CreateBudgetDto {
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM-01
}

export interface BudgetUsage {
  budget_id: string;
  category_id: string;
  category_name: string;
  budget_amount: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface BudgetsResponse {
  budgets: Budget[];
}

export interface BudgetUsageResponse {
  usage: BudgetUsage[];
}

@Injectable({ providedIn: 'root' })
export class BudgetApi extends ApiService {
  getAll(month: string): Observable<BudgetsResponse> {
    return this.get<unknown>('/budgets', { month }).pipe(map((raw) => ({ budgets: mapBudgets(raw) })));
  }

  getUsage(month: string): Observable<BudgetUsageResponse> {
    return this.get<unknown>('/budgets/usage', { month }).pipe(map((raw) => ({ usage: mapBudgetUsage(raw) })));
  }

  create(dto: CreateBudgetDto): Observable<Budget> {
    return this.post<{ budget: Budget }>('/budgets', dto).pipe(map((r) => r.budget));
  }

  update(id: string, dto: Partial<CreateBudgetDto>): Observable<Budget> {
    return this.put<{ budget: Budget }>(`/budgets/${id}`, dto).pipe(map((r) => r.budget));
  }

  deleteBudget(id: string): Observable<void> {
    return this.delete<void>(`/budgets/${id}`);
  }
}
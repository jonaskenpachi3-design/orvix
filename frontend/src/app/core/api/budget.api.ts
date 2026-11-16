import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
    return this.get<BudgetsResponse>('/budgets', { month });
  }

  getUsage(month: string): Observable<BudgetUsageResponse> {
    return this.get<BudgetUsageResponse>('/budgets/usage', { month });
  }

  create(dto: CreateBudgetDto): Observable<Budget> {
    return this.post<Budget>('/budgets', dto);
  }

  update(id: string, dto: Partial<CreateBudgetDto>): Observable<Budget> {
    return this.put<Budget>(`/budgets/${id}`, dto);
  }

  deleteBudget(id: string): Observable<void> {
    return this.delete<void>(`/budgets/${id}`);
  }
}
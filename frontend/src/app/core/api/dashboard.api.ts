import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type DashboardPeriod = 'month' | 'previous_month' | '3_months' | '6_months' | 'year';

export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
  transactions_count: number;
}

export interface EvolutionPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
  type: 'income' | 'expense';
}

export interface MainInsight {
  type: 'positive' | 'negative' | 'warning' | 'info';
  icon: string;
  title: string;
  message: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  evolution: EvolutionPoint[];
  category_breakdown: CategoryBreakdown[];
  main_insight: MainInsight;
  saving_rate: number;
  top_category: CategoryBreakdown | null;
  financial_status: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardApi extends ApiService {
  getDashboard(period: DashboardPeriod = 'month'): Observable<DashboardResponse> {
    return this.get<DashboardResponse>('/dashboard', { period });
  }
}
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ReportSummary {
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

export interface ReportResponse {
  summary: ReportSummary;
  evolution: EvolutionPoint[];
  category_breakdown: CategoryBreakdown[];
  period: {
    start_date: string;
    end_date: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ReportApi extends ApiService {
  getFinancialReport(startDate: string, endDate: string): Observable<ReportResponse> {
    return this.get<ReportResponse>('/reports/financial', {
      start_date: startDate,
      end_date: endDate,
    });
  }
}
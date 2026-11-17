import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { mapInsights, RawInsights } from './api-mappers';

export interface InsightSummary {
  income: number;
  expense: number;
  balance: number;
  transactions: number;
}

export interface Insight {
  type: 'positive' | 'negative' | 'warning' | 'info' | 'excellent';
  icon: string;
  title: string;
  message: string;
}

export interface TopCategory {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
}

export interface InsightsResponse {
  summary: InsightSummary;
  insights: Insight[];
  top_categories: TopCategory[];
  period: {
    start_date: string;
    end_date: string;
  };
}

@Injectable({ providedIn: 'root' })
export class InsightApi extends ApiService {
  getFinancialInsights(startDate: string, endDate: string): Observable<InsightsResponse> {
    return this.get<RawInsights>('/insights/financial', {
      start_date: startDate,
      end_date: endDate,
    }).pipe(map(mapInsights));
  }
}
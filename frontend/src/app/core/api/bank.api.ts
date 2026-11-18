import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface BankConnection {
  id: string;
  provider: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface BankStatus {
  configured: boolean;
  connections: BankConnection[];
}

export interface CategorizationResult {
  considered: number;
  byRules: number;
  byAI: number;
  createdCategories: string[];
  pending: number;
  aiStatus: 'not_needed' | 'ok' | 'not_configured' | 'rate_limited' | 'error';
}

export interface BankSyncResult {
  imported: number;
  updated: number;
  skipped: number;
  cards: number;
  bankAccounts: number;
  categorization: CategorizationResult | null;
}

@Injectable({ providedIn: 'root' })
export class BankApi extends ApiService {
  getStatus(): Observable<BankStatus> {
    return this.get<BankStatus>('/bank/status');
  }

  connect(itemId: string): Observable<BankConnection & { cards: number; bankAccounts: number }> {
    return this.post<BankConnection & { cards: number; bankAccounts: number }>('/bank/connections', { itemId });
  }

  sync(): Observable<BankSyncResult> {
    return this.post<BankSyncResult>('/bank/sync', {});
  }

  categorize(): Observable<CategorizationResult> {
    return this.post<CategorizationResult>('/bank/categorize', {});
  }

  disconnect(id: string): Observable<void> {
    return this.delete<void>(`/bank/connections/${id}`);
  }
}

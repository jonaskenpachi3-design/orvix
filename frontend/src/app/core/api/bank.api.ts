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

export interface BankSyncResult {
  imported: number;
  updated: number;
  skipped: number;
  cards: number;
}

@Injectable({ providedIn: 'root' })
export class BankApi extends ApiService {
  getStatus(): Observable<BankStatus> {
    return this.get<BankStatus>('/bank/status');
  }

  connect(itemId: string): Observable<BankConnection & { cards: number }> {
    return this.post<BankConnection & { cards: number }>('/bank/connections', { itemId });
  }

  sync(): Observable<BankSyncResult> {
    return this.post<BankSyncResult>('/bank/sync', {});
  }

  disconnect(id: string): Observable<void> {
    return this.delete<void>(`/bank/connections/${id}`);
  }
}

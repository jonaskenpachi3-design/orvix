import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { mapTransaction, RawTransaction } from './api-mappers';

export interface Transaction {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  status: 'paid' | 'scheduled';
  plan_id: string | null;
  installment_number: number | null;
  category?: {
    id: string;
    name: string;
    type: string;
    icon: string;
    color: string;
  };
}

export interface CreateTransactionDto {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
  transactionDate: string;
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

export interface TransactionsResponse {
  transactions: Transaction[];
}

@Injectable({ providedIn: 'root' })
export class TransactionApi extends ApiService {
  getAll(params?: { startDate?: string; endDate?: string; type?: string; categoryId?: string }): Observable<TransactionsResponse> {
    return this.get<{ transactions: RawTransaction[] }>('/transactions', params).pipe(
      map((r) => ({ transactions: (r.transactions ?? []).map(mapTransaction) })),
    );
  }

  create(dto: CreateTransactionDto): Observable<Transaction> {
    return this.post<{ transaction: RawTransaction }>('/transactions', dto).pipe(map((r) => mapTransaction(r.transaction)));
  }

  update(id: string, dto: UpdateTransactionDto): Observable<Transaction> {
    return this.put<{ transaction: RawTransaction }>(`/transactions/${id}`, dto).pipe(map((r) => mapTransaction(r.transaction)));
  }

  deleteTransaction(id: string): Observable<void> {
    return this.delete<void>(`/transactions/${id}`);
  }
}
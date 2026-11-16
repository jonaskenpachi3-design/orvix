import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
    return this.get<TransactionsResponse>('/transactions', params);
  }

  getById(id: string): Observable<Transaction> {
    return this.get<Transaction>(`/transactions/${id}`);
  }

  create(dto: CreateTransactionDto): Observable<Transaction> {
    return this.post<Transaction>('/transactions', dto);
  }

  update(id: string, dto: UpdateTransactionDto): Observable<Transaction> {
    return this.put<Transaction>(`/transactions/${id}`, dto);
  }

  deleteTransaction(id: string): Observable<void> {
    return this.delete<void>(`/transactions/${id}`);
  }
}
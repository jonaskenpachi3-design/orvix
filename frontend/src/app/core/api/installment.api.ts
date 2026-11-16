import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface InstallmentPlan {
  id: string;
  description: string;
  total_amount: number;
  installments_total: number;
  installments_paid: number;
  installments_pending: number;
  first_due_date: string;
  category_id: string | null;
  category?: {
    id: string;
    name: string;
    type: string;
  };
  created_at: string;
  transactions?: InstallmentTransaction[];
}

export interface InstallmentTransaction {
  id: string;
  plan_id: string;
  installment_number: number;
  amount: number;
  transaction_date: string;
  status: 'paid' | 'scheduled';
  description: string;
}

export interface CreateInstallmentPlanDto {
  description: string;
  totalAmount: number;
  installmentsTotal: number;
  firstDueDate: string;
  categoryId?: string;
}

export interface InstallmentPlansResponse {
  plans: InstallmentPlan[];
}

export interface UpcomingInstallment {
  month: string; // YYYY-MM
  total: number;
}

export interface UpcomingInstallmentsResponse {
  installments: UpcomingInstallment[];
}

export interface PayInstallmentResponse {
  message: string;
  transaction: InstallmentTransaction;
}

@Injectable({ providedIn: 'root' })
export class InstallmentApi extends ApiService {
  getAll(): Observable<InstallmentPlansResponse> {
    return this.get<InstallmentPlansResponse>('/installments');
  }

  getById(id: string): Observable<InstallmentPlan> {
    return this.get<InstallmentPlan>(`/installments/${id}`);
  }

  getUpcoming(startDate: string, endDate: string): Observable<UpcomingInstallmentsResponse> {
    return this.get<UpcomingInstallmentsResponse>('/installments/upcoming', {
      startDate,
      endDate,
    });
  }

  create(dto: CreateInstallmentPlanDto): Observable<{ plan: InstallmentPlan; transactions: InstallmentTransaction[] }> {
    return this.post<{ plan: InstallmentPlan; transactions: InstallmentTransaction[] }>('/installments', dto);
  }

  payInstallment(transactionId: string): Observable<PayInstallmentResponse> {
    return this.put<PayInstallmentResponse>(`/installments/${transactionId}/pay`, {});
  }

  deletePlan(planId: string): Observable<void> {
    return this.delete<void>(`/installments/${planId}`);
  }
}
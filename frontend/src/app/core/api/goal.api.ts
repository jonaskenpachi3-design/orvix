import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { mapGoal, RawGoal } from './api-mappers';

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
  progress?: number;
}

export interface CreateGoalDto {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
}

export interface GoalsResponse {
  goals: Goal[];
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  description: string | null;
  contribution_date: string;
  installment_number: number | null;
  installments_total: number | null;
  type: 'manual' | 'recurring' | 'installment';
  created_at: string;
}

export interface AddContributionDto {
  amount: number;
  description?: string;
  contributionDate?: string;
  installmentNumber?: number;
  installmentsTotal?: number;
  type?: 'manual' | 'recurring' | 'installment';
}

export interface AddRecurringContributionsDto {
  amount: number;
  description?: string;
  firstDate: string;
  installmentsTotal: number;
  frequencyMonths?: number;
}

export interface ContributionsResponse {
  contributions: GoalContribution[];
}

// O PostgreSQL devolve NUMERIC como string; converte para número para somas e formatação
function mapContribution(raw: GoalContribution): GoalContribution {
  return { ...raw, amount: Number(raw.amount) };
}

@Injectable({ providedIn: 'root' })
export class GoalApi extends ApiService {
  getAll(): Observable<GoalsResponse> {
    return this.get<{ goals: RawGoal[] }>('/goals').pipe(map((r) => ({ goals: (r.goals ?? []).map(mapGoal) })));
  }

  getById(id: string): Observable<Goal> {
    return this.get<{ goal: RawGoal }>(`/goals/${id}`).pipe(map((r) => mapGoal(r.goal)));
  }

  create(dto: CreateGoalDto): Observable<Goal> {
    return this.post<{ goal: RawGoal }>('/goals', dto).pipe(map((r) => mapGoal(r.goal)));
  }

  update(id: string, dto: Partial<CreateGoalDto>): Observable<Goal> {
    return this.put<{ goal: RawGoal }>(`/goals/${id}`, dto).pipe(map((r) => mapGoal(r.goal)));
  }

  deleteGoal(id: string): Observable<void> {
    return this.delete<void>(`/goals/${id}`);
  }

  // =========================
  // CONTRIBUTIONS
  // =========================

  addContribution(goalId: string, dto: AddContributionDto): Observable<{ contribution: GoalContribution }> {
    return this.post<{ contribution: GoalContribution }>(`/goals/${goalId}/contributions`, dto).pipe(
      map((r) => ({ contribution: mapContribution(r.contribution) })),
    );
  }

  getContributions(goalId: string): Observable<ContributionsResponse> {
    return this.get<ContributionsResponse>(`/goals/${goalId}/contributions`).pipe(
      map((r) => ({ contributions: (r.contributions ?? []).map(mapContribution) })),
    );
  }

  updateContribution(goalId: string, contributionId: string, dto: Partial<AddContributionDto>): Observable<{ contribution: GoalContribution }> {
    return this.put<{ contribution: GoalContribution }>(`/goals/${goalId}/contributions/${contributionId}`, dto).pipe(
      map((r) => ({ contribution: mapContribution(r.contribution) })),
    );
  }

  deleteContribution(goalId: string, contributionId: string): Observable<void> {
    return this.delete<void>(`/goals/${goalId}/contributions/${contributionId}`);
  }

  addRecurringContributions(goalId: string, dto: AddRecurringContributionsDto): Observable<{ contributions: GoalContribution[] }> {
    return this.post<{ contributions: GoalContribution[] }>(`/goals/${goalId}/contributions/recurring`, dto).pipe(
      map((r) => ({ contributions: (r.contributions ?? []).map(mapContribution) })),
    );
  }
}
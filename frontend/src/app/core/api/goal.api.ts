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
}
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
    return this.get<GoalsResponse>('/goals');
  }

  getById(id: string): Observable<Goal> {
    return this.get<Goal>(`/goals/${id}`);
  }

  create(dto: CreateGoalDto): Observable<Goal> {
    return this.post<Goal>('/goals', dto);
  }

  update(id: string, dto: Partial<CreateGoalDto>): Observable<Goal> {
    return this.put<Goal>(`/goals/${id}`, dto);
  }

  deleteGoal(id: string): Observable<void> {
    return this.delete<void>(`/goals/${id}`);
  }
}
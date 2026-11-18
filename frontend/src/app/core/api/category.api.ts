import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  transaction_count?: number;
}

export interface CreateCategoryDto {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

@Injectable({ providedIn: 'root' })
export class CategoryApi extends ApiService {
  getAll(): Observable<CategoriesResponse> {
    return this.get<CategoriesResponse>('/categories');
  }

  create(dto: CreateCategoryDto): Observable<Category> {
    return this.post<{ category: Category }>('/categories', dto).pipe(map((r) => r.category));
  }

  update(id: string, dto: Partial<CreateCategoryDto>): Observable<Category> {
    return this.put<{ category: Category }>(`/categories/${id}`, dto).pipe(map((r) => r.category));
  }

  deleteCategory(id: string): Observable<void> {
    return this.delete<void>(`/categories/${id}`);
  }
}
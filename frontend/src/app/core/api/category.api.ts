import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  transaction_count?: number;
}

export interface CreateCategoryDto {
  name: string;
  type: 'income' | 'expense';
}

export interface CategoriesResponse {
  categories: Category[];
}

@Injectable({ providedIn: 'root' })
export class CategoryApi extends ApiService {
  getAll(): Observable<CategoriesResponse> {
    return this.get<CategoriesResponse>('/categories');
  }

  getById(id: string): Observable<Category> {
    return this.get<Category>(`/categories/${id}`);
  }

  create(dto: CreateCategoryDto): Observable<Category> {
    return this.post<Category>('/categories', dto);
  }

  update(id: string, dto: Partial<CreateCategoryDto>): Observable<Category> {
    return this.put<Category>(`/categories/${id}`, dto);
  }

  deleteCategory(id: string): Observable<void> {
    return this.delete<void>(`/categories/${id}`);
  }
}
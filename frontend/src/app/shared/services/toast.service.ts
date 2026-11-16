import { Injectable, signal, computed } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  icon: string;
  delay?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly #toasts = signal<Toast[]>([]);

  readonly toasts = this.#toasts.asReadonly();

  private readonly icons: Record<ToastType, string> = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  show(message: string, type: ToastType = 'info', delay = 5000): string {
    const id = this.generateId();
    const toast: Toast = {
      id,
      type,
      message,
      icon: this.icons[type],
      delay,
    };

    this.#toasts.update(current => [...current, toast]);
    return id;
  }

  success(message: string, delay?: number): string {
    return this.show(message, 'success', delay);
  }

  error(message: string, delay?: number): string {
    return this.show(message, 'error', delay);
  }

  warning(message: string, delay?: number): string {
    return this.show(message, 'warning', delay);
  }

  info(message: string, delay?: number): string {
    return this.show(message, 'info', delay);
  }

  remove(id: string): void {
    this.#toasts.update(current => current.filter(t => t.id !== id));
  }

  clear(): void {
    this.#toasts.set([]);
  }

  private generateId(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
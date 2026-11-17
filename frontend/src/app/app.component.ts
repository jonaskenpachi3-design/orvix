import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from './shared/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NgbToastModule],
  template: `
    <router-outlet></router-outlet>

    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <ngb-toast
        *ngFor="let toast of toastService.toasts()"
        [class]="'toast-' + toast.type"
        [autohide]="true"
        [delay]="toast.delay || 5000"
        (hidden)="toastService.remove(toast.id)"
      >
        <div class="d-flex align-items-center gap-2">
          <i [class]="'bi ' + toast.icon" [attr.aria-hidden]="true"></i>
          <div class="flex-grow-1">{{ toast.message }}</div>
          <button type="button" class="btn-close btn-close-white" (click)="toastService.remove(toast.id)" aria-label="Fechar"></button>
        </div>
      </ngb-toast>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .toast-container {
      pointer-events: none;
    }

    ngb-toast {
      pointer-events: auto;
      min-width: min(300px, calc(100vw - 32px));
      max-width: 420px;
      box-shadow: var(--orvix-shadow-floating);
      border: 1px solid var(--orvix-border);
    }

    .toast-success { background-color: var(--orvix-positive); color: white; }
    .toast-error { background-color: var(--orvix-negative); color: white; }
    .toast-warning { background-color: var(--orvix-warning); color: white; }
    .toast-info { background-color: var(--orvix-primary); color: white; }
  `]
})
export class AppComponent {
  constructor(public toastService: ToastService) {}
}
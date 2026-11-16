import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from './shared/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ShellComponent, NgbToastModule],
  template: `
    <app-shell>
      <ng-content select="[topbar-title]" />
      <ng-content select="[topbar-actions]" />
    </app-shell>

    <!-- Global Toasts -->
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
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }

    ngb-toast {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 1050;
      min-width: 300px;
      max-width: 420px;
      box-shadow: var(--orvix-shadow-floating);
      border: 1px solid var(--orvix-border);
    }

    @media (max-width: 575.98px) {
      ngb-toast {
        left: 16px;
        right: 16px;
        min-width: auto;
        max-width: none;
      }
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
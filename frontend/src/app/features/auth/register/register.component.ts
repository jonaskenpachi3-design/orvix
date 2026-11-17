import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbAlertModule],
  template: `
    <main class="auth-shell">
      <section class="auth-visual" aria-hidden="true">
        <div class="brand auth-visual-brand">
          <img class="brand-logo-image" src="/assets/images/logo-orvix.png" alt=""/>
        </div>
        <div class="auth-visual-inner">
          <span class="auth-badge">FINANCIAL INTELLIGENCE PLATFORM</span>
          <h2>Comece sua jornada financeira hoje.</h2>
          <p>Crie sua conta gratuita e tenha controle total das suas finanças em minutos.</p>
          <div class="auth-highlight-list">
            <span><i class="bi bi-check-circle me-2" aria-hidden="true"></i> 100% gratuito para começar</span>
            <span><i class="bi bi-check-circle me-2" aria-hidden="true"></i> Dados seguros e criptografados</span>
            <span><i class="bi bi-check-circle me-2" aria-hidden="true"></i> Acesso em qualquer dispositivo</span>
            <span><i class="bi bi-check-circle me-2" aria-hidden="true"></i> IA contábil incluída</span>
          </div>
        </div>
      </section>

      <section class="auth-card" role="main">
        <div class="brand">
          <img class="brand-logo-image" src="/assets/images/logo-orvix.png" alt="Orvix"/>
        </div>

        <div class="auth-header">
          <h1 class="auth-title">Criar sua conta</h1>
          <p class="auth-description">Preencha os dados abaixo para começar.</p>
        </div>

        @if (errorMessage()) {
          <ngb-alert type="danger" (close)="errorMessage.set(null)" class="mb-4" [dismissible]="true">
            {{ errorMessage() }}
          </ngb-alert>
        }

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="form-group mb-3">
            <label for="name" class="form-label">Nome completo</label>
            <input
              type="text"
              id="name"
              class="form-control"
              formControlName="name"
              placeholder="Seu nome"
              autocomplete="name"
              [class.is-invalid]="name.invalid && (name.dirty || name.touched)"
              aria-describedby="name-error"
            />
            @if (name.invalid && (name.dirty || name.touched)) {
              <div id="name-error" class="form-error">
                @if (name.errors?.['required']) { Nome é obrigatório. }
                @else if (name.errors?.['minlength']) { Nome deve ter pelo menos 2 caracteres. }
              </div>
            }
          </div>

          <div class="form-group mb-3">
            <label for="email" class="form-label">E-mail</label>
            <input
              type="email"
              id="email"
              class="form-control"
              formControlName="email"
              placeholder="seu@email.com"
              autocomplete="email"
              [class.is-invalid]="email.invalid && (email.dirty || email.touched)"
              aria-describedby="email-error"
            />
            @if (email.invalid && (email.dirty || email.touched)) {
              <div id="email-error" class="form-error">
                @if (email.errors?.['required']) { E-mail é obrigatório. }
                @else if (email.errors?.['email']) { E-mail inválido. }
              </div>
            }
          </div>

          <div class="form-group mb-3">
            <label for="password" class="form-label">Senha</label>
            <input
              type="password"
              id="password"
              class="form-control"
              formControlName="password"
              placeholder="Mínimo 6 caracteres"
              autocomplete="new-password"
              [class.is-invalid]="password.invalid && (password.dirty || password.touched)"
              aria-describedby="password-error"
            />
            @if (password.invalid && (password.dirty || password.touched)) {
              <div id="password-error" class="form-error">
                @if (password.errors?.['required']) { Senha é obrigatória. }
                @else if (password.errors?.['minlength']) { A senha deve ter pelo menos 6 caracteres. }
              </div>
            }
          </div>

          <div class="form-group mb-4">
            <label for="confirmPassword" class="form-label">Confirmar senha</label>
            <input
              type="password"
              id="confirmPassword"
              class="form-control"
              formControlName="confirmPassword"
              placeholder="Repita a senha"
              autocomplete="new-password"
              [class.is-invalid]="registerForm.hasError('passwordMismatch') && confirmPassword.touched"
              aria-describedby="confirm-error"
            />
            @if (registerForm.hasError('passwordMismatch') && confirmPassword.touched) {
              <div id="confirm-error" class="form-error">
                As senhas não coincidem.
              </div>
            }
          </div>

          <button
            type="submit"
            id="register-button"
            class="btn btn-primary w-100 auth-button"
            [disabled]="registerForm.invalid || loading()"
          >
            @if (loading()) {
              <span class="spinner spinner-sm me-2" aria-hidden="true"></span>
              Criando conta...
            } @else {
              Criar conta
            }
          </button>
        </form>

        <p class="auth-footer">
          Já possui uma conta?
          <a routerLink="/login">Entrar</a>
        </p>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .auth-shell {
      display: grid;
      grid-template-columns: 1fr;
      min-height: 100vh;

      @media (min-width: 992px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .auth-visual {
      display: none;
      background: linear-gradient(135deg, var(--orvix-primary) 0%, #4A3BE6 100%);
      color: white;
      padding: var(--space-7) var(--space-6);
      position: relative;
      overflow: hidden;

      @media (min-width: 992px) {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        opacity: 0.5;
      }
    }

    .auth-visual-inner {
      position: relative;
      max-width: 480px;
      margin: 0 auto;
    }

    .auth-visual-brand {
      position: absolute;
      top: var(--space-6);
      left: var(--space-6);
      z-index: 1;
      margin: 0;
    }

    .auth-badge {
      display: inline-block;
      font-size: var(--font-size-caption);
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.15);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--border-radius-pill);
      margin-bottom: var(--space-5);
    }

    .auth-visual h2 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 var(--space-4);
    }

    .auth-visual p {
      font-size: var(--font-size-body);
      line-height: 1.6;
      opacity: 0.9;
      margin: 0 0 var(--space-6);
      max-width: 400px;
    }

    .auth-highlight-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .auth-highlight-list span {
      display: flex;
      align-items: center;
      font-size: var(--font-size-small);
      opacity: 0.95;
    }

    .auth-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--space-7) var(--space-6);
      background: var(--orvix-bg);

      @media (min-width: 992px) {
        padding: var(--space-7) var(--space-8);
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .brand-logo-image {
      width: 156px;
      height: 50px;
    }

    .auth-header {
      margin-bottom: var(--space-6);
    }

    .auth-title {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-h1);
      font-weight: 700;
      color: var(--orvix-text);
    }

    .auth-description {
      margin: 0;
      color: var(--orvix-text-secondary);
      font-size: var(--font-size-body);
    }

    .auth-form {
      margin-bottom: var(--space-5);
    }

    .auth-button {
      height: 48px;
      font-size: var(--font-size-body);
      font-weight: 600;
    }

    .spinner-sm {
      width: 18px;
      height: 18px;
      border-width: 2px;
    }

    .auth-footer {
      margin: 0;
      text-align: center;
      color: var(--orvix-text-secondary);
      font-size: var(--font-size-small);
    }

    .auth-footer a {
      color: var(--orvix-primary);
      font-weight: 500;
      text-decoration: none;
    }

    .auth-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly loading = this.authService.loading;
  readonly errorMessage = signal<string | null>(null);

  readonly registerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator });

  get name() { return this.registerForm.controls.name; }
  get email() { return this.registerForm.controls.email; }
  get password() { return this.registerForm.controls.password; }
  get confirmPassword() { return this.registerForm.controls.confirmPassword; }

  private passwordMatchValidator(control: import('@angular/forms').AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);

    const { confirmPassword, ...data } = this.registerForm.getRawValue();

    try {
      await this.authService.register(data).toPromise();
      this.toastService.success('Conta criada com sucesso! Bem-vindo ao Orvix.');
      this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      const error = err as { error?: { error?: string } };
      this.errorMessage.set(error.error?.error || 'Erro ao criar conta. Tente novamente.');
    }
  }
}
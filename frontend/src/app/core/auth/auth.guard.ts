import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';

/** Guard para rotas que requerem autenticação */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirecionar para login com URL de retorno
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/** Guard para rotas que devem ser acessadas apenas por usuários NÃO autenticados (login, register) */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Se já logado, redirecionar para dashboard
  router.navigate(['/dashboard']);
  return false;
};
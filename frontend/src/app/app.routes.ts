import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },

  // Rotas públicas (não autenticadas)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Entrar - Orvix',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'Cadastrar - Orvix',
  },

  // Rotas protegidas (autenticadas) - usando ShellComponent como layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard - Orvix',
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
        title: 'Transações - Orvix',
      },
      {
        path: 'installments',
        loadComponent: () => import('./features/installments/installments.component').then(m => m.InstallmentsComponent),
        title: 'Parcelamentos - Orvix',
      },
      {
        path: 'goals',
        loadComponent: () => import('./features/goals/goals.component').then(m => m.GoalsComponent),
        title: 'Metas - Orvix',
      },
      {
        path: 'budgets',
        loadComponent: () => import('./features/budgets/budgets.component').then(m => m.BudgetsComponent),
        title: 'Orçamentos - Orvix',
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent),
        title: 'Categorias - Orvix',
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        title: 'Relatórios - Orvix',
      },
      {
        path: 'insights',
        loadComponent: () => import('./features/insights/insights.component').then(m => m.InsightsComponent),
        title: 'Insights - Orvix',
      },
    ],
  },

  // 404
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NgbDropdownModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { ThemeService } from '../theme/theme.service';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbDropdownModule, NgbCollapseModule],
  template: `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside id="sidebar" class="sidebar" [class.show]="sidebarOpen()" role="navigation" aria-label="Menu principal">
        <div class="sidebar-header">
          <a routerLink="/dashboard" class="brand" aria-label="Orvix - Página inicial">
            <img class="brand-logo-image" src="/assets/images/logo-orvix.png" alt="Orvix"/>
          </a>
        </div>

        <nav class="nav-menu" aria-label="Navegação">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
              class="nav-item"
              (click)="closeSidebarOnMobile()"
              [attr.aria-current]="router.url === item.path || (item.path !== '/dashboard' && router.url.startsWith(item.path)) ? 'page' : null"
            >
              <i [class]="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar" aria-hidden="true">{{ userInitial() }}</div>
            <div class="user-info">
              <strong class="user-name">{{ authService.user()?.name || 'Usuário' }}</strong>
              <span class="user-email">{{ authService.user()?.email || 'Conta pessoal' }}</span>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-logout w-100"
            (click)="logout()"
            type="button"
          >
            <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <!-- Overlay para mobile -->
      @if (sidebarOpen()) {
        <div class="sidebar-overlay" (click)="closeSidebar()" aria-hidden="true"></div>
      }

      <!-- Main Content -->
      <main class="main-content">
        <!-- Topbar -->
        <header class="topbar" role="banner">
          <div class="topbar-title">
            <button
              class="mobile-menu-toggle"
              type="button"
              (click)="toggleSidebar()"
              aria-label="Abrir menu"
              [attr.aria-expanded]="sidebarOpen()"
              aria-controls="sidebar"
            >
              <i class="bi bi-list" aria-hidden="true"></i>
            </button>
            <a routerLink="/dashboard" class="brand topbar-brand" aria-label="Orvix - Página inicial">
              <img class="brand-logo-image" src="/assets/images/logo-orvix.png" alt="Orvix"/>
            </a>
            <ng-content select="[topbar-title]"></ng-content>
          </div>

          <div class="topbar-actions">
            <ng-content select="[topbar-actions]"></ng-content>

            <!-- Theme Toggle -->
            <div class="dropdown" ngbDropdown>
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                ngbDropdownToggle
                [attr.aria-label]="'Tema atual: ' + themeService.getThemeLabel()"
              >
                <i [class]="themeService.getThemeIcon()" aria-hidden="true" style="font-size: 1.25rem;"></i>
              </button>
              <div class="dropdown-menu dropdown-menu-end" ngbDropdownMenu>
                <button
                  class="dropdown-item"
                  type="button"
                  (click)="themeService.setPreference('light')"
                >
                  <i class="bi bi-sun me-2" aria-hidden="true"></i> Claro
                </button>
                <button
                  class="dropdown-item"
                  type="button"
                  (click)="themeService.setPreference('dark')"
                >
                  <i class="bi bi-moon-stars me-2" aria-hidden="true"></i> Escuro
                </button>
                <button
                  class="dropdown-item"
                  type="button"
                  (click)="themeService.setPreference('auto')"
                >
                  <i class="bi bi-circle-half me-2" aria-hidden="true"></i> Automático
                </button>
              </div>
            </div>

            <!-- User Menu -->
            <div class="dropdown" ngbDropdown>
              <button class="topbar-user" type="button" ngbDropdownToggle aria-haspopup="true" aria-expanded="false">
                <div class="topbar-user-avatar" aria-hidden="true">{{ userInitial() }}</div>
                <div class="topbar-user-info">
                  <span class="topbar-user-name">{{ authService.user()?.name || 'Usuário' }}</span>
                  <span class="topbar-user-label">Minha conta</span>
                </div>
              </button>
              <div class="dropdown-menu dropdown-menu-end" ngbDropdownMenu>
                <div class="dropdown-header px-3 py-2 text-muted small">
                  <i class="bi bi-person me-2" aria-hidden="true"></i> Conta
                </div>
                <a class="dropdown-item" href="#" (click)="$event.preventDefault()">
                  <i class="bi bi-gear me-2" aria-hidden="true"></i> Configurações
                </a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item text-danger" type="button" (click)="logout()">
                  <i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i> Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 20, 36, 0.5);
      z-index: 99;
      display: none;
    }

    @media (max-width: 991.98px) {
      .sidebar-overlay {
        display: block;
      }
    }

    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class ShellComponent {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly routerUrl = signal(this.router.url);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', icon: 'bi bi-grid-1x2', label: 'Dashboard' },
    { path: '/transactions', icon: 'bi bi-arrow-left-right', label: 'Transações' },
    { path: '/installments', icon: 'bi bi-calendar2-range', label: 'Parcelamentos' },
    { path: '/goals', icon: 'bi bi-bullseye', label: 'Metas' },
    { path: '/budgets', icon: 'bi bi-pie-chart', label: 'Orçamentos' },
    { path: '/categories', icon: 'bi bi-tags', label: 'Categorias' },
    { path: '/reports', icon: 'bi bi-bar-chart-line', label: 'Relatórios' },
    { path: '/insights', icon: 'bi bi-stars', label: 'Insights' },
  ];

  readonly userInitial = computed(() => {
    const name = this.authService.user()?.name || 'Usuário';
    return name.trim().charAt(0).toUpperCase();
  });

  constructor() {
    // Atualizar URL do router para destacar item ativo
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.routerUrl.set(event.urlAfterRedirects);
    });

    // Fechar sidebar ao redimensionar para desktop
    effect(() => {
      if (this.sidebarOpen() && window.innerWidth >= 992) {
        this.sidebarOpen.set(false);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 992 && this.sidebarOpen()) {
      this.sidebarOpen.set(false);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth < 992) {
      this.sidebarOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
  }
}
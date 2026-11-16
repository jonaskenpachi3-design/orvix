import { Injectable, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly STORAGE_KEY = 'orvix_theme';
  private mediaQuery: MediaQueryList | null = null;

  // Signal reativo com o tema atual resolvido (light | dark)
  readonly currentTheme = signal<'light' | 'dark'>('light');
  // Signal com a preferência do usuário (light | dark | auto)
  readonly preference = signal<ThemeMode>('auto');

  constructor() {
    // Inicializar o tema ANTES do primeiro render (evita flash)
    this.initTheme();
  }

  private initTheme(): void {
    // 1. Ler preferência salva
    let savedPreference: ThemeMode = 'auto';
    try {
      const stored = this.document.defaultView?.localStorage.getItem(this.STORAGE_KEY);
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        savedPreference = stored as ThemeMode;
      }
    } catch {
      // localStorage não disponível (SSR, private mode, etc)
    }

    this.preference.set(savedPreference);

    // 2. Configurar media query para 'auto'
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener?.('change', this.onSystemThemeChange.bind(this));
    }

    // 3. Aplicar tema inicial
    this.applyTheme(savedPreference);
  }

  private onSystemThemeChange(event: MediaQueryListEvent): void {
    // Só reagir se preferência for 'auto'
    if (this.preference() === 'auto') {
      this.applyTheme('auto');
    }
  }

  /** Define a preferência do usuário e persiste no localStorage */
  setPreference(mode: ThemeMode): void {
    this.preference.set(mode);
    try {
      this.document.defaultView?.localStorage.setItem(this.STORAGE_KEY, mode);
    } catch {
      // ignorar
    }
    this.applyTheme(mode);
  }

  /** Alterna entre light/dark/auto ciclicamente */
  toggleTheme(): void {
    const current = this.preference();
    const next: ThemeMode = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    this.setPreference(next);
  }

  /** Aplica o tema no document.documentElement */
  private applyTheme(mode: ThemeMode): void {
    let resolved: 'light' | 'dark';

    if (mode === 'auto') {
      resolved = this.mediaQuery?.matches ? 'dark' : 'light';
    } else {
      resolved = mode;
    }

    // Atualizar signal (notifica componentes)
    this.currentTheme.set(resolved);

    // Aplicar no HTML para Bootstrap 5.3 data-bs-theme
    this.document.documentElement.setAttribute('data-bs-theme', resolved);
  }

  /** Verifica se o tema atual é escuro */
  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }

  /** Ícone para o botão de tema (sol/lua/auto) */
  getThemeIcon(): string {
    const pref = this.preference();
    if (pref === 'light') return 'bi-sun';
    if (pref === 'dark') return 'bi-moon-stars';
    return 'bi-circle-half'; // auto
  }

  /** Label para o botão de tema */
  getThemeLabel(): string {
    const pref = this.preference();
    if (pref === 'light') return 'Claro';
    if (pref === 'dark') return 'Escuro';
    return 'Automático';
  }
}
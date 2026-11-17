import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbAlertModule, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Chart, registerables, ChartType } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { DashboardApi, DashboardResponse, DashboardPeriod, DashboardSummary, EvolutionPoint, CategoryBreakdown, MainInsight } from '@core/api/dashboard.api';
import { ThemeService } from '@core/theme/theme.service';
import { ToastService } from '@shared/services/toast.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbModule,
    NgbAlertModule,
    NgbTooltipModule,
    NgbDropdownModule,
  ],
  template: `
    <div class="dashboard-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">DASHBOARD</span>
          <h1>Visão geral</h1>
          <p class="text-muted">Resumo da sua vida financeira em um só lugar.</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="btn-group btn-group-sm" role="group" aria-label="Período do dashboard">
            @for (period of periods; track period.value) {
              <input
                type="radio"
                class="btn-check"
                name="dashboardPeriod"
                [id]="'dash-' + period.value"
                [value]="period.value"
                [checked]="selectedPeriod() === period.value"
                (change)="onPeriodChange(period.value)"
                autocomplete="off"
              />
              <label class="btn btn-outline" [for]="'dash-' + period.value">{{ period.label }}</label>
            }
          </div>
        </div>
      </div>

      <!-- Messages -->
      @if (errorMessage()) {
        <ngb-alert type="danger" (close)="errorMessage.set(null)" class="mb-4" [dismissible]="true">
          {{ errorMessage() }}
        </ngb-alert>
      }

      <!-- Loading State -->
      @if (loadingDashboard()) {
        <div class="loading-state text-center py-5">
          <div class="spinner mx-auto"></div>
          <p class="mt-2 text-muted">Carregando dashboard...</p>
        </div>
      } @else if (dashboardData()) {
        <!-- Main Insight Banner -->
        <section class="card mb-4 insight-banner" [class]="'border-' + getInsightColor(dashboardData()!.main_insight.type)">
          <div class="card-body">
            <div class="d-flex align-items-start gap-3">
              <div class="insight-icon" [class]="'bg-' + getInsightColor(dashboardData()!.main_insight.type) + '-subtle text-' + getInsightColor(dashboardData()!.main_insight.type)">
                <i [class]="dashboardData()!.main_insight.icon" aria-hidden="true"></i>
              </div>
              <div class="flex-grow-1">
                <h5 class="mb-1">{{ dashboardData()!.main_insight.title }}</h5>
                <p class="mb-0">{{ dashboardData()!.main_insight.message }}</p>
              </div>
              <span class="badge" [class]="'bg-' + getFinancialStatusColor(dashboardData()!.financial_status)">
                {{ getFinancialStatusLabel(dashboardData()!.financial_status) }}
              </span>
            </div>
          </div>
        </section>

        <!-- Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-md-6 col-xl-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <p class="text-muted mb-1 small">Receitas</p>
                    <h3 class="mb-0 text-success tabular-nums">{{ formatCurrency(dashboardData()!.summary.income) }}</h3>
                  </div>
                  <div class="avatar-circle bg-success bg-opacity-10 text-success" style="width: 48px; height: 48px; border-radius: 12px;">
                    <i class="bi bi-arrow-down-circle" style="font-size: 1.5rem;" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <p class="text-muted mb-1 small">Despesas</p>
                    <h3 class="mb-0 text-danger tabular-nums">{{ formatCurrency(dashboardData()!.summary.expense) }}</h3>
                  </div>
                  <div class="avatar-circle bg-danger bg-opacity-10 text-danger" style="width: 48px; height: 48px; border-radius: 12px;">
                    <i class="bi bi-arrow-up-circle" style="font-size: 1.5rem;" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <section class="card summary-card h-100" [class.border-success]="dashboardData()!.summary.balance >= 0" [class.border-danger]="dashboardData()!.summary.balance < 0">
              <div class="card-body">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <p class="text-muted mb-1 small">Saldo</p>
                    <h3 class="mb-0 tabular-nums" [class.text-success]="dashboardData()!.summary.balance >= 0" [class.text-danger]="dashboardData()!.summary.balance < 0">
                      {{ formatCurrency(dashboardData()!.summary.balance) }}
                    </h3>
                  </div>
                  <div class="avatar-circle" [class.bg-primary-bg]="dashboardData()!.summary.balance >= 0" [class.bg-danger-bg]="dashboardData()!.summary.balance < 0" [class.text-primary]="dashboardData()!.summary.balance >= 0" [class.text-danger]="dashboardData()!.summary.balance < 0" style="width: 48px; height: 48px; border-radius: 12px;">
                    <i class="bi bi-currency-dollar" style="font-size: 1.5rem;" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <p class="text-muted mb-1 small">Taxa de poupança</p>
                    <h3 class="mb-0 tabular-nums text-primary">{{ dashboardData()!.saving_rate.toFixed(1) }}%</h3>
                  </div>
                  <div class="avatar-circle bg-primary bg-opacity-10 text-primary" style="width: 48px; height: 48px; border-radius: 12px;">
                    <i class="bi bi-piggy-bank" style="font-size: 1.5rem;" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <!-- Evolution Chart + Top Categories -->
        <div class="row g-4 mb-4">
          <!-- Evolution Chart -->
          <div class="col-12 col-xl-8">
            <section class="card h-100">
              <div class="card-header d-flex align-items-center justify-content-between">
                <h5 class="mb-0"><i class="bi bi-graph-up me-2" aria-hidden="true"></i> Evolução Financeira</h5>
                <div class="btn-group btn-group-sm" role="group" aria-label="Tipo de gráfico">
                  @for (type of chartTypes; track type.value) {
                    <input
                      type="radio"
                      class="btn-check"
                      name="dashEvoChartType"
                      [id]="'dash-evo-' + type.value"
                      [value]="type.value"
                      [checked]="evolutionChartType() === type.value"
                      (change)="evolutionChartType.set(type.value)"
                      autocomplete="off"
                    />
                    <label class="btn btn-outline" [for]="'dash-evo-' + type.value">{{ type.label }}</label>
                  }
                </div>
              </div>
              <div class="card-body">
                <div class="chart-container" style="height: 300px;">
                  <canvas #evolutionChart></canvas>
                </div>
              </div>
            </section>
          </div>

          <!-- Top Categories -->
          <div class="col-12 col-xl-4">
            <section class="card h-100">
              <div class="card-header d-flex align-items-center justify-content-between">
                <h5 class="mb-0"><i class="bi bi-trophy me-2" aria-hidden="true"></i> Top Categorias</h5>
              </div>
              <div class="card-body">
                @if (topCategories().length === 0) {
                  <div class="empty-state text-center py-4">
                    <i class="bi bi-bar-chart empty-icon" aria-hidden="true"></i>
                    <p class="text-muted mb-0">Sem dados para o período</p>
                  </div>
                } @else {
                  <div class="d-flex flex-column gap-3">
                    @for (cat of topCategories(); track cat.category_id; let i = $index) {
                      <div class="top-category-item">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                          <div class="d-flex align-items-center gap-2">
                            <span class="badge fs-6" [style.background-color]="getCategoryColor(cat.category_id)" style="color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">{{ i + 1 }}</span>
                            <span class="fw-medium">{{ cat.category_name }}</span>
                          </div>
                          <span class="badge" [class.bg-success-subtle]="cat.type === 'income'" [class.text-success]="cat.type === 'income'" [class.bg-danger-subtle]="cat.type === 'expense'" [class.text-danger]="cat.type === 'expense'">
                            {{ cat.type === 'income' ? 'Receita' : 'Despesa' }}
                          </span>
                        </div>
                        <div class="progress" style="height: 6px;">
                          <div class="progress-bar" [style.background-color]="getCategoryColor(cat.category_id)" [style.width.%]="cat.percentage"></div>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                          <small class="text-muted">{{ formatCurrency(cat.total) }}</small>
                          <small class="fw-medium">{{ cat.percentage }}%</small>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </section>
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <section class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-lightning me-2" aria-hidden="true"></i> Ações rápidas</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/transactions" class="action-card">
                  <div class="action-icon bg-success bg-opacity-10 text-success">
                    <i class="bi bi-plus-circle" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Nova transação</h6>
                    <p class="text-muted small mb-0">Registrar receita ou despesa</p>
                  </div>
                </a>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/installments" class="action-card">
                  <div class="action-icon bg-primary bg-opacity-10 text-primary">
                    <i class="bi bi-calendar2-range" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Parcelamentos</h6>
                    <p class="text-muted small mb-0">Gerenciar compras parceladas</p>
                  </div>
                </a>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/goals" class="action-card">
                  <div class="action-icon bg-warning bg-opacity-10 text-warning">
                    <i class="bi bi-bullseye" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Metas</h6>
                    <p class="text-muted small mb-0">Acompanhar objetivos</p>
                  </div>
                </a>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/budgets" class="action-card">
                  <div class="action-icon bg-info bg-opacity-10 text-info">
                    <i class="bi bi-wallet2" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Orçamentos</h6>
                    <p class="text-muted small mb-0">Controlar gastos por categoria</p>
                  </div>
                </a>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/categories" class="action-card">
                  <div class="action-icon bg-secondary bg-opacity-10 text-secondary">
                    <i class="bi bi-tags" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Categorias</h6>
                    <p class="text-muted small mb-0">Organizar suas finanças</p>
                  </div>
                </a>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/insights" class="action-card">
                  <div class="action-icon bg-danger bg-opacity-10 text-danger">
                    <i class="bi bi-robot" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Insights & IA</h6>
                    <p class="text-muted small mb-0">Análise inteligente</p>
                  </div>
                </a>
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <a routerLink="/reports" class="action-card">
                  <div class="action-icon bg-dark bg-opacity-10 text-dark">
                    <i class="bi bi-file-earmark-bar-graph" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">Relatórios</h6>
                    <p class="text-muted small mb-0">Exportar e visualizar</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Financial Health Indicators -->
        <section class="card">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-heart-pulse me-2" aria-hidden="true"></i> Saúde financeira</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-12 col-md-4">
                <div class="health-indicator">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="fw-medium">Saldo mensal</span>
                    <span class="fw-bold" [class.text-success]="dashboardData()!.summary.balance >= 0" [class.text-danger]="dashboardData()!.summary.balance < 0">
                      {{ formatCurrency(dashboardData()!.summary.balance) }}
                    </span>
                  </div>
                  <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-success" [style.width.%]="Math.max(0, Math.min(100, 50 + (dashboardData()!.summary.balance / Math.max(1, dashboardData()!.summary.income)) * 50))"></div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="health-indicator">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="fw-medium">Taxa de poupança</span>
                    <span class="fw-bold text-primary">{{ dashboardData()!.saving_rate.toFixed(1) }}%</span>
                  </div>
                  <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-primary" [style.width.%]="Math.min(dashboardData()!.saving_rate, 100)"></div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="health-indicator">
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="fw-medium">Transações no período</span>
                    <span class="fw-bold text-muted">{{ dashboardData()!.summary.transactions_count }}</span>
                  </div>
                  <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-info" [style.width.%]="Math.min((dashboardData()!.summary.transactions_count / 50) * 100, 100)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      animation: fadeIn var(--transition-normal) ease;
    }

    .summary-card {
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      border-left: 4px solid transparent;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--orvix-shadow-lg);
    }

    .avatar-circle {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .insight-banner {
      border-left-width: 4px;
      border-left-style: solid;
    }

    .insight-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--border-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.5;
    }

    .empty-state p {
      margin-top: 1rem;
    }

    .loading-state .spinner {
      width: 2.5rem;
      height: 2.5rem;
    }

    .chart-container {
      position: relative;
    }

    .top-category-item {
      padding: 0.5rem;
      border-radius: var(--border-radius-sm);
      background-color: var(--orvix-surface);
      border: 1px solid var(--orvix-border);
      transition: transform var(--transition-fast);
    }

    .top-category-item:hover {
      transform: translateX(4px);
    }

    .progress {
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-bar {
      transition: width 0.3s ease;
      border-radius: 3px;
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--orvix-border);
      border-radius: var(--border-radius-md);
      text-decoration: none;
      color: var(--orvix-text);
      transition: all var(--transition-fast);
    }

    .action-card:hover {
      border-color: var(--orvix-primary);
      box-shadow: var(--orvix-shadow-md);
      transform: translateY(-2px);
      color: var(--orvix-text);
      text-decoration: none;
    }

    .action-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--border-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .action-card h6 {
      font-size: 0.9375rem;
      margin-bottom: 0.25rem;
    }

    .health-indicator {
      padding: 1rem;
      border: 1px solid var(--orvix-border);
      border-radius: var(--border-radius-md);
      background-color: var(--orvix-surface);
    }

    .btn-group .btn {
      padding: 0.375rem 0.75rem;
    }

    @media (max-width: 767.98px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .page-header > div {
        text-align: center;
      }

      .page-header .btn-group {
        justify-content: center;
      }

      .action-card {
        flex-direction: column;
        text-align: center;
        gap: 0.75rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardApi = inject(DashboardApi);
  private readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);

  // Signals
  readonly dashboardData = signal<DashboardResponse | null>(null);
  readonly loadingDashboard = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedPeriod = signal<DashboardPeriod>('month');
  readonly evolutionChartType = signal<'line' | 'bar'>('line');

  @ViewChild('evolutionChart') evolutionChartRef!: ElementRef<HTMLCanvasElement>;

  private evolutionChartInstance: Chart | null = null;

  readonly periods = [
    { value: 'month', label: 'Mês atual' },
    { value: 'previous_month', label: 'Mês anterior' },
    { value: '3_months', label: '3 meses' },
    { value: '6_months', label: '6 meses' },
    { value: 'year', label: 'Ano atual' },
  ] as const;

  readonly chartTypes = [
    { value: 'line', label: 'Linha' },
    { value: 'bar', label: 'Barras' },
  ] as const;

  private readonly categoryColors = [
    '#5B4BFF', '#8B80FF', '#12A150', '#2FD07A', '#E8890C', '#F5A524',
    '#E5384F', '#FF6B7D', '#6C5CE7', '#A29BFE', '#00B894', '#55EFC4',
  ];

  private categoryColorMap = new Map<string, string>();

  constructor() {
    // effect() precisa rodar em contexto de injeção (construtor), não em ngOnInit
    effect(() => {
      this.themeService.currentTheme();
      this.updateChart();
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.evolutionChartInstance?.destroy();
  }

  onPeriodChange(period: DashboardPeriod): void {
    this.selectedPeriod.set(period);
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loadingDashboard.set(true);
    this.errorMessage.set(null);

    this.dashboardApi.getDashboard(this.selectedPeriod()).subscribe({
      next: (response) => {
        this.dashboardData.set(response);
        this.assignCategoryColors(response.category_breakdown);
        this.loadingDashboard.set(false);
        this.createEvolutionChart();
      },
      error: (err) => {
        console.error('Erro ao carregar dashboard:', err);
        this.errorMessage.set('Não foi possível carregar o dashboard.');
        this.loadingDashboard.set(false);
      },
    });
  }

  private assignCategoryColors(categories: CategoryBreakdown[]): void {
    this.categoryColorMap.clear();
    categories.forEach((cat, index) => {
      this.categoryColorMap.set(cat.category_id, this.categoryColors[index % this.categoryColors.length]);
    });
  }

  getCategoryColor(categoryId: string): string {
    return this.categoryColorMap.get(categoryId) ?? '#5B4BFF';
  }

  private createEvolutionChart(): void {
    const ctx = this.evolutionChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.dashboardData()) return;

    this.evolutionChartInstance?.destroy();

    const data = this.dashboardData()!.evolution;
    const colors = this.getChartColors();

    this.evolutionChartInstance = new Chart(ctx, {
      type: this.evolutionChartType() as ChartType,
      data: {
        labels: data.map(d => this.formatMonthLabel(d.month)),
        datasets: [
          {
            label: 'Receitas',
            data: data.map(d => d.income),
            borderColor: '#12A150',
            backgroundColor: 'rgba(18, 161, 80, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Despesas',
            data: data.map(d => d.expense),
            borderColor: '#E5384F',
            backgroundColor: 'rgba(229, 56, 79, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Saldo',
            data: data.map(d => d.balance),
            borderColor: '#5B4BFF',
            backgroundColor: 'rgba(91, 75, 255, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: colors.text, usePointStyle: true } },
          tooltip: {
            backgroundColor: 'rgba(15, 20, 36, 0.9)',
            titleColor: '#F5F7FA',
            bodyColor: '#F5F7FA',
            padding: 12,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
          y: {
            grid: { color: colors.grid },
            ticks: {
              color: colors.text,
              callback: (value) => this.formatCurrency(value as number),
            },
          },
        },
      },
    });
  }

  private updateChart(): void {
    if (this.evolutionChartInstance) {
      this.evolutionChartInstance.update();
    }
  }

  private getChartColors(): { text: string; grid: string } {
    const isDark = this.themeService.currentTheme() === 'dark';
    return {
      text: isDark ? '#A3ADBF' : '#5A6278',
      grid: isDark ? '#222D3A' : '#E4E7EF',
    };
  }

  // Computed
  readonly topCategories = computed(() => {
    const data = this.dashboardData()?.category_breakdown ?? [];
    return [...data].sort((a, b) => b.total - a.total).slice(0, 5);
  });

  getInsightColor(type: MainInsight['type']): string {
    const colors: Record<MainInsight['type'], string> = {
      positive: 'success',
      negative: 'danger',
      warning: 'warning',
      info: 'info',
    };
    return colors[type] || 'info';
  }

  getFinancialStatusColor(status: string): string {
    const colors: Record<string, string> = {
      excellent: 'success',
      good: 'info',
      attention: 'warning',
      critical: 'danger',
    };
    return colors[status] || 'secondary';
  }

  getFinancialStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      excellent: 'Excelente',
      good: 'Bom',
      attention: 'Atenção',
      critical: 'Crítico',
    };
    return labels[status] || status;
  }

  private formatMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  Math = Math;
}
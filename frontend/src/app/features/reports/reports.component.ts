import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbAlertModule, NgbTooltipModule, NgbDatepickerModule, NgbInputDatepicker, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Chart, registerables, ChartType } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ReportApi, ReportResponse, EvolutionPoint, CategoryBreakdown } from '@core/api/report.api';
import { ToastService } from '@shared/services/toast.service';
import { ThemeService } from '@core/theme/theme.service';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbAlertModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    NgbInputDatepicker,
    NgbDropdownModule,
  ],
  template: `
    <div class="reports-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">RELATÓRIOS</span>
          <h1>Relatórios financeiros</h1>
          <p class="text-muted">Visualize a evolução das suas finanças e exporte relatórios.</p>
        </div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-outline-secondary" (click)="exportCSV()" [disabled]="!reportData()">
            <i class="bi bi-file-earmark-spreadsheet me-1" aria-hidden="true"></i> CSV
          </button>
          <button type="button" class="btn btn-outline-secondary" (click)="exportPDF()" [disabled]="!reportData()">
            <i class="bi bi-file-earmark-pdf me-1" aria-hidden="true"></i> PDF
          </button>
        </div>
      </div>

      <!-- Messages -->
      @if (errorMessage()) {
        <ngb-alert type="danger" (close)="errorMessage.set(null)" class="mb-4" [dismissible]="true">
          {{ errorMessage() }}
        </ngb-alert>
      }

      <!-- Period Selector -->
      <section class="card mb-4">
        <div class="card-body">
          <form [formGroup]="periodForm" class="row g-3 align-items-end">
            <div class="col-12 col-md-4">
              <label for="startDate" class="form-label">Data inicial</label>
              <div class="input-group">
                <input
                  type="text"
                  id="startDate"
                  class="form-control"
                  formControlName="startDate"
                  placeholder="DD/MM/AAAA"
                  ngbDatepicker
                  #dpStart="ngbDatepicker"
                />
                <button class="btn btn-outline" type="button" (click)="dpStart.toggle()" aria-label="Abrir calendário">
                  <i class="bi bi-calendar3" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <label for="endDate" class="form-label">Data final</label>
              <div class="input-group">
                <input
                  type="text"
                  id="endDate"
                  class="form-control"
                  formControlName="endDate"
                  placeholder="DD/MM/AAAA"
                  ngbDatepicker
                  #dpEnd="ngbDatepicker"
                />
                <button class="btn btn-outline" type="button" (click)="dpEnd.toggle()" aria-label="Abrir calendário">
                  <i class="bi bi-calendar3" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-primary flex-grow-1" (click)="loadReport()" [disabled]="loadingReport()">
                  @if (loadingReport()) {
                    <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Gerar
                  } @else {
                    <i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i> Gerar relatório
                  }
                </button>
                <div ngbDropdown class="dropdown">
                  <button class="btn btn-outline-secondary" ngbDropdownToggle>
                    <i class="bi bi-calendar me-1" aria-hidden="true"></i> Rápido
                  </button>
                  <ul ngbDropdownMenu class="dropdown-menu-end">
                    @for (preset of presets; track preset.label) {
                      <li>
                        <button class="dropdown-item" (click)="applyPreset(preset)">
                          {{ preset.label }}
                        </button>
                      </li>
                    }
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      <!-- Report Content -->
      @if (loadingReport()) {
        <div class="loading-state text-center py-5">
          <div class="spinner mx-auto"></div>
          <p class="mt-2 text-muted">Gerando relatório...</p>
        </div>
      } @else if (reportData()) {
        <!-- Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Receitas</p>
                <h3 class="mb-0 text-success tabular-nums">{{ formatCurrency(reportData()!.summary.income) }}</h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Despesas</p>
                <h3 class="mb-0 text-danger tabular-nums">{{ formatCurrency(reportData()!.summary.expense) }}</h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100" [class.border-success]="reportData()!.summary.balance >= 0" [class.border-danger]="reportData()!.summary.balance < 0">
              <div class="card-body">
                <p class="text-muted mb-1 small">Saldo</p>
                <h3 class="mb-0 tabular-nums" [class.text-success]="reportData()!.summary.balance >= 0" [class.text-danger]="reportData()!.summary.balance < 0">
                  {{ formatCurrency(reportData()!.summary.balance) }}
                </h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Transações</p>
                <h3 class="mb-0 tabular-nums">{{ reportData()!.summary.transactions_count }}</h3>
              </div>
            </section>
          </div>
        </div>

        <!-- Evolution Chart -->
        <section class="card mb-4">
          <div class="card-header d-flex align-items-center justify-content-between">
            <h5 class="mb-0"><i class="bi bi-graph-up me-2" aria-hidden="true"></i> Evolução Mensal</h5>
            <div class="btn-group btn-group-sm" role="group" aria-label="Tipo de gráfico">
              @for (type of chartTypes; track type.value) {
                <input
                  type="radio"
                  class="btn-check"
                  name="evolutionChartType"
                  [id]="'evo-' + type.value"
                  [value]="type.value"
                  [checked]="evolutionChartType() === type.value"
                  (change)="evolutionChartType.set(type.value)"
                  autocomplete="off"
                />
                <label class="btn btn-outline" [for]="'evo-' + type.value">{{ type.label }}</label>
              }
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height: 350px;">
              <canvas #evolutionChart></canvas>
            </div>
          </div>
        </section>

        <!-- Category Breakdown Charts -->
        <div class="row g-4 mb-4">
          <!-- Income Categories -->
          <div class="col-12 col-lg-6">
            <section class="card h-100">
              <div class="card-header bg-success-subtle border-success">
                <h5 class="mb-0"><i class="bi bi-pie-chart me-2" aria-hidden="true"></i> Receitas por Categoria</h5>
              </div>
              <div class="card-body">
                @if (incomeCategories().length === 0) {
                  <div class="empty-state text-center py-4">
                    <i class="bi bi-arrow-down-circle empty-icon text-success" aria-hidden="true"></i>
                    <p class="text-muted mb-0">Nenhuma receita no período</p>
                  </div>
                } @else {
                  <div class="d-flex justify-content-center" style="height: 300px;">
                    <canvas #incomeChart style="max-width: 100%;"></canvas>
                  </div>
                  <div class="mt-3">
                    <div class="d-flex flex-wrap gap-2 justify-content-center">
                      @for (cat of incomeCategories(); track cat.category_id) {
                        <span class="badge" [style.background-color]="getCategoryColor(cat.category_id)" [style.color]="'white'">
                          {{ cat.category_name }} {{ cat.percentage }}%
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>

          <!-- Expense Categories -->
          <div class="col-12 col-lg-6">
            <section class="card h-100">
              <div class="card-header bg-danger-subtle border-danger">
                <h5 class="mb-0"><i class="bi bi-pie-chart me-2" aria-hidden="true"></i> Despesas por Categoria</h5>
              </div>
              <div class="card-body">
                @if (expenseCategories().length === 0) {
                  <div class="empty-state text-center py-4">
                    <i class="bi bi-arrow-up-circle empty-icon text-danger" aria-hidden="true"></i>
                    <p class="text-muted mb-0">Nenhuma despesa no período</p>
                  </div>
                } @else {
                  <div class="d-flex justify-content-center" style="height: 300px;">
                    <canvas #expenseChart style="max-width: 100%;"></canvas>
                  </div>
                  <div class="mt-3">
                    <div class="d-flex flex-wrap gap-2 justify-content-center">
                      @for (cat of expenseCategories(); track cat.category_id) {
                        <span class="badge" [style.background-color]="getCategoryColor(cat.category_id)" [style.color]="'white'">
                          {{ cat.category_name }} {{ cat.percentage }}%
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>
        </div>

        <!-- Category Details Table -->
        <section class="card">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-table me-2" aria-hidden="true"></i> Detalhamento por Categoria</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col">Categoria</th>
                    <th scope="col" style="width: 100px;">Tipo</th>
                    <th scope="col" style="width: 140px;" class="text-end">Total</th>
                    <th scope="col" style="width: 100px;" class="text-end">%</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cat of allCategories(); track cat.category_id) {
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge rounded-pill" [style.background-color]="getCategoryColor(cat.category_id)" style="color: white; font-size: 0.65rem; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;"></span>
                          {{ cat.category_name }}
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class.bg-success-subtle]="cat.type === 'income'" [class.text-success]="cat.type === 'income'" [class.bg-danger-subtle]="cat.type === 'expense'" [class.text-danger]="cat.type === 'expense'">
                          {{ cat.type === 'income' ? 'Receita' : 'Despesa' }}
                        </span>
                      </td>
                      <td class="text-end fw-medium tabular-nums" [class.text-success]="cat.type === 'income'" [class.text-danger]="cat.type === 'expense'">
                        {{ formatCurrency(cat.total) }}
                      </td>
                      <td class="text-end fw-medium">{{ cat.percentage }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Period Info -->
        <div class="text-center text-muted small mt-4 mb-2">
          Período: {{ formatDate(reportData()!.period.start_date) }} - {{ formatDate(reportData()!.period.end_date) }}
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-page {
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

    .btn-group .btn {
      padding: 0.375rem 0.75rem;
    }

    .table th {
      font-weight: 600;
      font-size: var(--font-size-small);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--orvix-text-secondary);
      border-bottom: 2px solid var(--orvix-border);
    }

    .table td {
      vertical-align: middle;
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
    }
  `]
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly reportApi = inject(ReportApi);
  private readonly toastService = inject(ToastService);
  private readonly themeService = inject(ThemeService);

  // Signals
  readonly reportData = signal<ReportResponse | null>(null);
  readonly loadingReport = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly evolutionChartType = signal<'line' | 'bar'>('line');

  @ViewChild('evolutionChart') evolutionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('incomeChart') incomeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseChart') expenseChartRef!: ElementRef<HTMLCanvasElement>;

  private evolutionChartInstance: Chart | null = null;
  private incomeChartInstance: Chart | null = null;
  private expenseChartInstance: Chart | null = null;

  readonly periodForm = this.fb.nonNullable.group({
    startDate: ['' as string | { year: number; month: number; day: number }],
    endDate: ['' as string | { year: number; month: number; day: number }],
  });

  readonly presets = [
    { label: 'Este mês', start: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: () => new Date() },
    { label: 'Mês passado', start: () => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: () => new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
    { label: 'Últimos 3 meses', start: () => new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1), end: () => new Date() },
    { label: 'Últimos 6 meses', start: () => new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1), end: () => new Date() },
    { label: 'Este ano', start: () => new Date(new Date().getFullYear(), 0, 1), end: () => new Date() },
  ];

  readonly chartTypes = [
    { value: 'line', label: 'Linha' },
    { value: 'bar', label: 'Barras' },
  ] as const;

  // Category colors for charts
  private readonly categoryColors = [
    '#5B4BFF', '#8B80FF', '#12A150', '#2FD07A', '#E8890C', '#F5A524',
    '#E5384F', '#FF6B7D', '#6C5CE7', '#A29BFE', '#00B894', '#55EFC4',
    '#FDCB6E', '#FFEAA7', '#FF7675', '#D63031',
  ];

  private categoryColorMap = new Map<string, string>();

  ngOnInit(): void {
    this.setDefaultPeriod();
    this.loadReport();
    // Listen for theme changes to update charts
    effect(() => {
      this.themeService.currentTheme();
      this.updateCharts();
    });
  }

  ngAfterViewInit(): void {
    // Charts will be created in loadReport after data is available
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private setDefaultPeriod(): void {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.periodForm.patchValue({
      startDate: {
        year: startOfMonth.getFullYear(),
        month: startOfMonth.getMonth() + 1,
        day: startOfMonth.getDate(),
      },
      endDate: {
        year: endOfMonth.getFullYear(),
        month: endOfMonth.getMonth() + 1,
        day: endOfMonth.getDate(),
      },
    });
  }

  private formatDateForApi(dateValue: string | { year: number; month: number; day: number }): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
  }

  private formatDateForInput(date: Date): { year: number; month: number; day: number } {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  applyPreset(preset: { label: string; start: () => Date; end: () => Date }): void {
    this.periodForm.patchValue({
      startDate: this.formatDateForInput(preset.start()),
      endDate: this.formatDateForInput(preset.end()),
    });
    this.loadReport();
  }

  loadReport(): void {
    const startDate = this.formatDateForApi(this.periodForm.controls.startDate.value);
    const endDate = this.formatDateForApi(this.periodForm.controls.endDate.value);

    if (!startDate || !endDate) {
      this.toastService.warning('Selecione o período.');
      return;
    }

    this.loadingReport.set(true);
    this.errorMessage.set(null);

    this.reportApi.getFinancialReport(startDate, endDate).subscribe({
      next: (response) => {
        this.reportData.set(response);
        this.assignCategoryColors(response.category_breakdown);
        this.loadingReport.set(false);
        this.createCharts();
      },
      error: (err) => {
        console.error('Erro ao gerar relatório:', err);
        this.errorMessage.set('Não foi possível gerar o relatório.');
        this.loadingReport.set(false);
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

  // Computed
  readonly incomeCategories = computed(() =>
    this.reportData()?.category_breakdown.filter(c => c.type === 'income') ?? []
  );

  readonly expenseCategories = computed(() =>
    this.reportData()?.category_breakdown.filter(c => c.type === 'expense') ?? []
  );

  readonly allCategories = computed(() =>
    this.reportData()?.category_breakdown ?? []
  );

  private createCharts(): void {
    this.destroyCharts();
    this.createEvolutionChart();
    this.createIncomeChart();
    this.createExpenseChart();
  }

  private updateCharts(): void {
    if (this.evolutionChartInstance) this.evolutionChartInstance.update();
    if (this.incomeChartInstance) this.incomeChartInstance.update();
    if (this.expenseChartInstance) this.expenseChartInstance.update();
  }

  private destroyCharts(): void {
    this.evolutionChartInstance?.destroy();
    this.incomeChartInstance?.destroy();
    this.expenseChartInstance?.destroy();
    this.evolutionChartInstance = null;
    this.incomeChartInstance = null;
    this.expenseChartInstance = null;
  }

  private getChartColors(): { text: string; grid: string } {
    const isDark = this.themeService.currentTheme() === 'dark';
    return {
      text: isDark ? '#A3ADBF' : '#5A6278',
      grid: isDark ? '#222D3A' : '#E4E7EF',
    };
  }

  private createEvolutionChart(): void {
    const ctx = this.evolutionChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.reportData()) return;

    const data = this.reportData()!.evolution;
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

  private createIncomeChart(): void {
    const ctx = this.incomeChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.reportData()) return;

    const data = this.incomeCategories();
    if (data.length === 0) return;

    const colors = this.getChartColors();

    this.incomeChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.category_name),
        datasets: [{
          data: data.map(d => d.total),
          backgroundColor: data.map(d => this.getCategoryColor(d.category_id)),
          borderWidth: 2,
          borderColor: colors.grid,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 20, 36, 0.9)',
            titleColor: '#F5F7FA',
            bodyColor: '#F5F7FA',
            padding: 12,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  private createExpenseChart(): void {
    const ctx = this.expenseChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.reportData()) return;

    const data = this.expenseCategories();
    if (data.length === 0) return;

    const colors = this.getChartColors();

    this.expenseChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.category_name),
        datasets: [{
          data: data.map(d => d.total),
          backgroundColor: data.map(d => this.getCategoryColor(d.category_id)),
          borderWidth: 2,
          borderColor: colors.grid,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 20, 36, 0.9)',
            titleColor: '#F5F7FA',
            bodyColor: '#F5F7FA',
            padding: 12,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  private formatMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  exportCSV(): void {
    const data = this.reportData();
    if (!data) return;

    const rows = [
      ['Relatório Financeiro', ''],
      ['Período', `${this.formatDate(data.period.start_date)} a ${this.formatDate(data.period.end_date)}`],
      ['', ''],
      ['Resumo', ''],
      ['Receitas', this.formatCurrency(data.summary.income)],
      ['Despesas', this.formatCurrency(data.summary.expense)],
      ['Saldo', this.formatCurrency(data.summary.balance)],
      ['Transações', data.summary.transactions_count.toString()],
      ['', ''],
      ['Evolução Mensal', ''],
      ['Mês', 'Receitas', 'Despesas', 'Saldo'],
      ...data.evolution.map(d => [
        this.formatMonthLabel(d.month),
        this.formatCurrency(d.income),
        this.formatCurrency(d.expense),
        this.formatCurrency(d.balance),
      ]),
      ['', ''],
      ['Categorias', ''],
      ['Categoria', 'Tipo', 'Total', '%'],
      ...data.category_breakdown.map(c => [
        c.category_name,
        c.type === 'income' ? 'Receita' : 'Despesa',
        this.formatCurrency(c.total),
        `${c.percentage}%`,
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    this.downloadFile(csv, `relatorio-${data.period.start_date}-${data.period.end_date}.csv`, 'text/csv');
  }

  exportPDF(): void {
    // For PDF, we'll create a simple HTML-based print
    const data = this.reportData();
    if (!data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.error('Permita pop-ups para gerar PDF.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; color: #0F1424; }
          h1 { color: #5B4BFF; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
          .card { border: 1px solid #E4E7EF; border-radius: 12px; padding: 16px; }
          .card h3 { margin: 0; font-size: 1.5rem; }
          .card p { margin: 4px 0 0; color: #5A6278; font-size: 0.875rem; }
          .income { color: #12A150; }
          .expense { color: #E5384F; }
          .balance.positive { color: #12A150; }
          .balance.negative { color: #E5384F; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #E4E7EF; padding: 8px; text-align: left; }
          th { background: #F0F2F8; font-weight: 600; }
          .text-end { text-align: right; }
        </style>
      </head>
      <body>
        <h1>Relatório Financeiro</h1>
        <p>Período: ${this.formatDate(data.period.start_date)} a ${this.formatDate(data.period.end_date)}</p>
        <div class="summary">
          <div class="card"><p>Receitas</p><h3 class="income">${this.formatCurrency(data.summary.income)}</h3></div>
          <div class="card"><p>Despesas</p><h3 class="expense">${this.formatCurrency(data.summary.expense)}</h3></div>
          <div class="card"><p>Saldo</p><h3 class="balance ${data.summary.balance >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(data.summary.balance)}</h3></div>
          <div class="card"><p>Transações</p><h3>${data.summary.transactions_count}</h3></div>
        </div>
        <h2>Evolução Mensal</h2>
        <table>
          <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead>
          <tbody>
            ${data.evolution.map(d => `
              <tr>
                <td>${this.formatMonthLabel(d.month)}</td>
                <td class="text-end income">${this.formatCurrency(d.income)}</td>
                <td class="text-end expense">${this.formatCurrency(d.expense)}</td>
                <td class="text-end ${d.balance >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(d.balance)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <h2>Categorias</h2>
        <table>
          <thead><tr><th>Categoria</th><th>Tipo</th><th>Total</th><th>%</th></tr></thead>
          <tbody>
            ${data.category_breakdown.map(c => `
              <tr>
                <td>${c.category_name}</td>
                <td>${c.type === 'income' ? 'Receita' : 'Despesa'}</td>
                <td class="text-end ${c.type === 'income' ? 'income' : 'expense'}">${this.formatCurrency(c.total)}</td>
                <td class="text-end">${c.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
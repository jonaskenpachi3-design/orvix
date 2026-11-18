import { Component, signal, computed, effect, inject, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModalModule, NgbModal, NgbDatepickerModule, NgbInputDatepicker, NgbDateStruct, NgbAlertModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { InstallmentApi, InstallmentPlan, InstallmentTransaction, CreateInstallmentPlanDto, UpcomingInstallment } from '@core/api/installment.api';
import { CategoryApi, Category } from '@core/api/category.api';
import { ThemeService } from '@core/theme/theme.service';
import { ToastService } from '@shared/services/toast.service';

Chart.register(...registerables);

interface InstallmentPreviewItem {
  number: number;
  dueDate: string;
  amount: number;
}

@Component({
  selector: 'app-installments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModalModule,
    NgbDatepickerModule,
    NgbAlertModule,
    NgbTooltipModule,
  ],
  template: `
    <div class="installments-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">PARCELAMENTOS</span>
          <h1>Parcelamentos</h1>
          <p class="text-muted">Gerencie suas compras parceladas e visualize previsão de gastos.</p>
        </div>
      </div>

      <!-- Messages -->
      @if (errorMessage()) {
        <ngb-alert type="danger" (close)="errorMessage.set(null)" class="mb-4" [dismissible]="true">
          {{ errorMessage() }}
        </ngb-alert>
      }
      @if (successMessage()) {
        <ngb-alert type="success" (close)="successMessage.set(null)" class="mb-4" [dismissible]="true">
          {{ successMessage() }}
        </ngb-alert>
      }

      <!-- Form Card -->
      <section class="card mb-4">
        <div class="card-header">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">NOVO PARCELAMENTO</span>
              <h2 class="section-title">Cadastrar compra parcelada</h2>
            </div>
          </div>
        </div>

        <div class="card-body">
          <form [formGroup]="installmentForm" (ngSubmit)="onSubmit()" novalidate>
            <div class="row g-3 mb-3">
              <!-- Descrição -->
              <div class="col-md-6">
                <label for="description" class="form-label">Descrição</label>
                <input
                  type="text"
                  id="description"
                  class="form-control"
                  formControlName="description"
                  placeholder='Ex: TV 55", iPhone, Curso...'
                  [class.is-invalid]="description.invalid && (description.dirty || description.touched)"
                />
                @if (description.invalid && (description.dirty || description.touched)) {
                  <div class="form-error">Descrição é obrigatória.</div>
                }
              </div>

              <!-- Valor Total -->
              <div class="col-md-3">
                <label for="totalAmount" class="form-label">Valor total</label>
                <input
                  type="number"
                  id="totalAmount"
                  class="form-control"
                  formControlName="totalAmount"
                  placeholder="0,00"
                  step="0.01"
                  min="0.01"
                  [class.is-invalid]="totalAmount.invalid && (totalAmount.dirty || totalAmount.touched)"
                />
                @if (totalAmount.invalid && (totalAmount.dirty || totalAmount.touched)) {
                  <div class="form-error">Informe um valor válido.</div>
                }
              </div>

              <!-- Parcelas -->
              <div class="col-md-3">
                <label for="installmentsTotal" class="form-label">Parcelas</label>
                <input
                  type="number"
                  id="installmentsTotal"
                  class="form-control"
                  formControlName="installmentsTotal"
                  placeholder="10"
                  min="1"
                  max="60"
                  [class.is-invalid]="installmentsTotal.invalid && (installmentsTotal.dirty || installmentsTotal.touched)"
                />
                @if (installmentsTotal.invalid && (installmentsTotal.dirty || installmentsTotal.touched)) {
                  <div class="form-error">Informe o número de parcelas (1-60).</div>
                }
              </div>

              <!-- 1º Vencimento -->
              <div class="col-md-6">
                <label for="firstDueDate" class="form-label">1º vencimento</label>
                <div class="input-group">
                  <input
                    type="text"
                    id="firstDueDate"
                    class="form-control"
                    formControlName="firstDueDate"
                    placeholder="DD/MM/AAAA"
                    ngbDatepicker
                    #dp="ngbDatepicker"
                    [class.is-invalid]="firstDueDate.invalid && (firstDueDate.dirty || firstDueDate.touched)"
                  />
                  <button
                    class="btn btn-outline"
                    type="button"
                    (click)="dp.toggle()"
                    aria-label="Abrir calendário"
                  >
                    <i class="bi bi-calendar3" aria-hidden="true"></i>
                  </button>
                </div>
                @if (firstDueDate.invalid && (firstDueDate.dirty || firstDueDate.touched)) {
                  <div class="form-error">Data do primeiro vencimento é obrigatória.</div>
                }
              </div>

              <!-- Categoria -->
              <div class="col-md-6">
                <label for="categoryId" class="form-label">Categoria</label>
                <select
                  id="categoryId"
                  class="form-select"
                  formControlName="categoryId"
                >
                  <option value="">Sem categoria</option>
                  @for (cat of expenseCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Preview das Parcelas -->
            @if (showPreview()) {
              <div class="alert alert-light border mb-3 preview-card">
                <h6 class="mb-3"><i class="bi bi-list-ol me-2" aria-hidden="true"></i> Prévia das parcelas</h6>
                <div class="preview-list" style="max-height: 250px; overflow-y: auto;">
                  @for (item of previewItems(); track item.number) {
                    <div class="preview-item d-flex align-items-center justify-content-between py-2 px-3 rounded border-bottom">
                      <span class="badge bg-primary-subtle text-primary fw-semibold">{{ item.number }}/{{ installmentsTotal.value }}</span>
                      <div class="ms-3 flex-grow-1">
                        <div class="fw-medium">{{ description.value || 'Descrição' }}</div>
                        <small class="text-muted">{{ formatDate(item.dueDate) }}</small>
                      </div>
                      <span class="fw-semibold text-danger tabular-nums">{{ formatCurrency(item.amount) }}</span>
                    </div>
                  }
                </div>
                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                  <span class="fw-medium">Total</span>
                  <span class="fw-bold text-danger tabular-nums">{{ formatCurrency(totalAmount.value || 0) }}</span>
                </div>
              </div>
            }

            <div class="d-flex justify-content-end">
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="installmentForm.invalid || submitting()"
              >
                @if (submitting()) {
                  <span class="spinner spinner-sm me-2" aria-hidden="true"></span>
                  Criando...
                } @else {
                  <i class="bi bi-plus-circle me-2" aria-hidden="true"></i> Criar parcelamento
                }
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- Forecast Chart -->
      <section class="card mb-4">
        <div class="card-header">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">PREVISÃO</span>
              <h2 class="section-title">Previsão de gastos futuros</h2>
              <p class="section-description">Parcelas agendadas agrupadas por mês</p>
            </div>
            <div class="section-actions">
              <div class="btn-group btn-group-sm" role="group" aria-label="Período da previsão">
                @for (period of forecastPeriods; track period.value) {
                  <input
                    type="radio"
                    class="btn-check"
                    name="forecastPeriod"
                    [id]="'forecast-' + period.value"
                    [value]="period.value"
                    [checked]="forecastPeriod() === period.value"
                    (change)="onForecastPeriodChange(period.value)"
                    autocomplete="off"
                  />
                  <label class="btn btn-outline" [for]="'forecast-' + period.value">{{ period.label }}</label>
                }
              </div>
            </div>
          </div>
        </div>
        <div class="card-body">
          @if (loadingForecast()) {
            <div class="loading-state">
              <div class="spinner"></div>
              Carregando previsão...
            </div>
          } @else if (forecastData().length === 0) {
            <div class="empty-state">
              <i class="bi bi-graph-up-empty empty-icon" aria-hidden="true"></i>
              <h3 class="empty-title">Sem previsão de parcelas</h3>
              <p class="empty-description">Crie parcelamentos para ver a previsão de gastos futuros.</p>
            </div>
          } @else {
            <div class="chart-container" style="height: 300px;">
              <canvas #forecastChart></canvas>
            </div>
          }
        </div>
      </section>

      <!-- Plans List -->
      <section class="card">
        <div class="card-header">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">SEUS PLANOS</span>
              <h2 class="section-title">Parcelamentos ativos</h2>
            </div>
            <span class="badge bg-secondary-subtle text-secondary fw-medium px-3 py-2">{{ plans().length }} plano{{ plans().length !== 1 ? 's' : '' }}</span>
          </div>
        </div>
        <div class="card-body p-0">
          @if (loadingPlans()) {
            <div class="loading-state m-5">
              <div class="spinner"></div>
              Carregando parcelamentos...
            </div>
          } @else if (plans().length === 0) {
            <div class="empty-state m-5">
              <i class="bi bi-calendar2-range empty-icon" aria-hidden="true"></i>
              <h3 class="empty-title">Nenhum parcelamento cadastrado</h3>
              <p class="empty-description">Crie seu primeiro parcelamento acima para começar a acompanhar.</p>
            </div>
          } @else {
            <div class="list-group list-group-flush">
              @for (plan of plans(); track plan.id) {
                <div class="list-group-item border-0 px-4 py-3 installment-plan-item">
                  <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                    <div class="d-flex align-items-center gap-3 flex-grow-1 min-w-0">
                      <div class="avatar-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px; border-radius: 12px;">
                        <i class="bi bi-calendar2-range" style="font-size: 1.5rem;" aria-hidden="true"></i>
                      </div>
                      <div class="min-w-0">
                        <h5 class="mb-1 text-truncate">{{ plan.description }}</h5>
                        <div class="d-flex align-items-center gap-3 text-muted small">
                          @if (plan.category?.name || plan.category_name) {
                            <span><i class="bi bi-tag me-1" aria-hidden="true"></i>{{ plan.category?.name || plan.category_name }}</span>
                          }
                          <span>{{ formatCurrency(plan.total_amount) }} total</span>
                        </div>
                      </div>
                    </div>

                    <!-- Progress -->
                    <div class="d-flex align-items-center gap-3 flex-shrink-0">
                      <div style="width: 140px;">
                        <div class="progress" style="height: 8px;">
                          <div
                            class="progress-bar"
                            role="progressbar"
                            [style.width.%]="progressPercent(plan)"
                            [attr.aria-valuenow]="plan.installments_paid"
                            aria-valuemin="0"
                            [attr.aria-valuemax]="plan.installments_total"
                          ></div>
                        </div>
                      </div>
                      <span class="fw-semibold text-nowrap">{{ plan.installments_paid }}/{{ plan.installments_total }}</span>
                    </div>
                  </div>

                  <!-- Details Grid -->
                  <div class="row g-3 mb-3 text-muted small">
                    <div class="col-6 col-md-3">
                      <div class="fw-semibold text-muted">Valor total</div>
                      <div class="fw-medium">{{ formatCurrency(plan.total_amount) }}</div>
                    </div>
                    <div class="col-6 col-md-3">
                      <div class="fw-semibold text-muted">Parcelas</div>
                      <div class="fw-medium">{{ plan.installments_total }}x</div>
                    </div>
                    <div class="col-6 col-md-3">
                      <div class="fw-semibold text-muted">1º vencimento</div>
                      <div class="fw-medium">{{ formatDate(plan.first_due_date) }}</div>
                    </div>
                    <div class="col-6 col-md-3">
                      <div class="fw-semibold text-muted">Pendentes</div>
                      <div class="fw-medium text-warning">{{ plan.installments_pending }}</div>
                    </div>
                  </div>

                  <!-- Installments -->
                  <div class="pt-3 border-top installments-list">
                    @if (expandedPlanId() === plan.id) {
                      @if (isPlanLoading(plan.id)) {
                        <div class="d-flex justify-content-center py-3">
                          <div class="spinner spinner-sm"></div>
                        </div>
                      } @else {
                        <div class="d-flex flex-wrap gap-2">
                          @for (tx of getPlanTransactions(plan.id); track tx.id) {
                            <div class="installment-item d-flex align-items-center justify-content-between flex-grow-1 px-3 py-2 rounded border"
                              [class]="tx.status === 'paid' ? 'bg-success-subtle border-success opacity-75' : 'bg-warning-subtle border-warning'"
                              style="min-width: 160px;">
                              <span class="badge rounded-pill"
                                [class]="tx.status === 'paid' ? 'bg-success text-white' : 'bg-warning text-dark'"
                                style="font-size: 0.7rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                                {{ tx.installment_number }}
                              </span>
                              <div class="ms-2 flex-grow-1 min-w-0">
                                <small class="text-muted">{{ formatDate(tx.transaction_date) }}</small>
                                <div class="fw-semibold text-danger tabular-nums">{{ formatCurrency(tx.amount) }}</div>
                              </div>
                              <div class="ms-2">
                                @if (tx.status === 'scheduled') {
                                  <button
                                    class="btn btn-primary btn-sm"
                                    (click)="payInstallment(tx.id)"
                                    [disabled]="payingInstallmentId() === tx.id"
                                    [attr.aria-label]="'Marcar parcela ' + tx.installment_number + ' como paga'"
                                  >
                                    @if (payingInstallmentId() === tx.id) {
                                      <span class="spinner spinner-sm" aria-hidden="true"></span>
                                    } @else {
                                      <i class="bi bi-check" aria-hidden="true"></i>
                                    }
                                  </button>
                                } @else {
                                  <span class="badge bg-success-subtle text-success">
                                    <i class="bi bi-check me-1" aria-hidden="true"></i> Paga
                                  </span>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    } @else {
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        (click)="togglePlanDetails(plan.id)"
                      >
                        <i class="bi bi-chevron-down me-1" aria-hidden="true"></i> Ver parcelas
                      </button>
                    }
                  </div>

                  <!-- Delete Button -->
                  <div class="pt-3 border-top d-flex justify-content-end">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm text-danger"
                      (click)="confirmDeletePlan(plan)"
                      [disabled]="deletingPlanId() === plan.id"
                    >
                      @if (deletingPlanId() === plan.id) {
                        <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
                      } @else {
                        <i class="bi bi-trash me-1" aria-hidden="true"></i> Excluir plano
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>
    </div>

    <!-- Delete Confirmation Modal -->
    <ng-template #deleteModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Excluir parcelamento</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p>Tem certeza que deseja excluir o parcelamento <strong>{{ planToDelete()?.description }}</strong>?</p>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          As parcelas <strong>pagas permanecerão</strong> como transações normais. Apenas as parcelas agendadas serão removidas.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button type="button" class="btn btn-danger" (click)="deletePlan(modal)" [disabled]="deletingPlanId() === planToDelete()?.id">
          @if (deletingPlanId() === planToDelete()?.id) {
            <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
          } @else {
            Excluir
          }
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .installments-page {
      animation: fadeIn var(--transition-normal) ease;
    }

    .preview-card {
      background-color: var(--orvix-surface-2);
    }

    .preview-item {
      transition: background-color var(--transition-fast);
    }

    .preview-item:hover {
      background-color: var(--orvix-border);
    }

    .installment-plan-item {
      transition: background-color var(--transition-fast);
    }

    .installment-plan-item:hover {
      background-color: var(--orvix-surface-2);
    }

    .installment-item {
      transition: all var(--transition-fast);
    }

    .installment-item:hover {
      transform: translateX(2px);
    }

    .avatar-circle {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-group-sm .btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }

    .chart-container {
      position: relative;
    }

    @media (max-width: 767.98px) {
      .section-heading {
        flex-direction: column;
        align-items: stretch;
      }

      .section-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class InstallmentsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly installmentApi = inject(InstallmentApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(NgbModal);

  // Signals
  readonly plans = signal<InstallmentPlan[]>([]);
  readonly loadingPlans = signal(false);
  readonly loadingPlanDetails = signal<Record<string, boolean>>({});
  readonly planTransactions = signal<Record<string, InstallmentTransaction[]>>({});
  readonly expandedPlanId = signal<string | null>(null);
  readonly deletingPlanId = signal<string | null>(null);
  readonly planToDelete = signal<InstallmentPlan | null>(null);
  readonly payingInstallmentId = signal<string | null>(null);

  // Forecast
  readonly forecastData = signal<UpcomingInstallment[]>([]);
  readonly loadingForecast = signal(false);
  readonly forecastPeriod = signal<'3m' | '6m' | '12m'>('6m');
  readonly forecastPeriods = [
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '12m', label: '12 meses' },
  ] as const;
  readonly chartInstance = signal<Chart | null>(null);

  @ViewChild('forecastChart', { static: false }) forecastCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('deleteModal', { static: false }) deleteModalRef!: any;

  // Categories
  readonly categories = signal<Category[]>([]);
  readonly expenseCategories = computed(() =>
    this.categories().filter(c => c.type === 'expense')
  );

  // Form
  readonly submitting = signal(false);
  readonly showPreview = signal(false);
  readonly previewItems = signal<InstallmentPreviewItem[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly installmentForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(150)]],
    totalAmount: [0, [Validators.required, Validators.min(0.01)]],
    installmentsTotal: [1, [Validators.required, Validators.min(1), Validators.max(60)]],
    firstDueDate: ['', [Validators.required]],
    categoryId: [''],
  });

  get description() { return this.installmentForm.controls.description; }
  get totalAmount() { return this.installmentForm.controls.totalAmount; }
  get installmentsTotal() { return this.installmentForm.controls.installmentsTotal; }
  get firstDueDate() { return this.installmentForm.controls.firstDueDate; }

  ngOnInit(): void {
    this.loadCategories();
    this.loadPlans();
    this.loadForecast();
    this.setupPreviewListener();
  }

  ngOnDestroy(): void {
    const chart = this.chartInstance();
    if (chart) {
      chart.destroy();
    }
  }

  private setupPreviewListener(): void {
    // Atualizar preview quando campos mudarem
    const previewFields = ['totalAmount', 'installmentsTotal', 'firstDueDate', 'description'];
    previewFields.forEach(field => {
      this.installmentForm.get(field)?.valueChanges.subscribe(() => this.updatePreview());
    });
  }

  private formatNgbDateForApi(dateValue: string | NgbDateStruct): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
  }

  private formatNgbDateForCalc(dateValue: string | NgbDateStruct): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
  }

  private updatePreview(): void {
    const totalAmount = this.totalAmount.value;
    const installmentsTotal = this.installmentsTotal.value;
    const firstDueDateRaw = this.firstDueDate.value;
    const firstDueDate = this.formatNgbDateForCalc(firstDueDateRaw);

    if (!totalAmount || !installmentsTotal || !firstDueDate || totalAmount <= 0 || installmentsTotal <= 0) {
      this.showPreview.set(false);
      return;
    }

    const amounts = this.calculateInstallmentAmounts(totalAmount, installmentsTotal);
    const items: InstallmentPreviewItem[] = [];

    for (let i = 1; i <= installmentsTotal; i++) {
      const dueDate = this.calculateDueDate(firstDueDate, i);
      items.push({
        number: i,
        dueDate,
        amount: amounts[i - 1],
      });
    }

    this.previewItems.set(items);
    this.showPreview.set(true);
  }

  private calculateInstallmentAmounts(totalAmount: number, installmentsTotal: number): number[] {
    const baseAmount = Math.floor((totalAmount * 100) / installmentsTotal) / 100;
    const remainder = Math.round((totalAmount - baseAmount * installmentsTotal) * 100) / 100;
    const amounts: number[] = [];

    for (let i = 1; i <= installmentsTotal; i++) {
      if (i === installmentsTotal) {
        amounts.push(Number((baseAmount + remainder).toFixed(2)));
      } else {
        amounts.push(Number(baseAmount.toFixed(2)));
      }
    }
    return amounts;
  }

  private calculateDueDate(firstDueDate: string, installmentIndex: number): string {
    const ngbDate = this.parseNgbDate(firstDueDate);
    if (!ngbDate) return firstDueDate;

    const date = new Date(Date.UTC(ngbDate.year, ngbDate.month - 1, ngbDate.day));
    date.setUTCMonth(date.getUTCMonth() + (installmentIndex - 1));

    const originalDay = ngbDate.day;
    if (date.getUTCDate() !== originalDay) {
      date.setUTCDate(0);
    }

    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseNgbDate(value: string): NgbDateStruct | null {
    // Formato esperado: YYYY-MM-DD
    const parts = value.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10),
      };
    }
    return null;
  }

  private async loadCategories(): Promise<void> {
    try {
      const response = await this.categoryApi.getAll().toPromise();
      this.categories.set(response?.categories || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }

  private async loadPlans(): Promise<void> {
    this.loadingPlans.set(true);
    try {
      const response = await this.installmentApi.getAll().toPromise();
      this.plans.set(response?.plans || []);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
      this.errorMessage.set('Não foi possível carregar os parcelamentos.');
    } finally {
      this.loadingPlans.set(false);
    }
  }

  private async loadForecast(): Promise<void> {
    this.loadingForecast.set(true);
    try {
      const { startDate, endDate } = this.getForecastDateRange();
      const response = await this.installmentApi.getUpcoming(startDate, endDate).toPromise();
      this.forecastData.set(response?.installments || []);
      this.renderForecastChart();
    } catch (err) {
      console.error('Erro ao carregar previsão:', err);
    } finally {
      this.loadingForecast.set(false);
    }
  }

  private getForecastDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    let months = 6;

    switch (this.forecastPeriod()) {
      case '3m': months = 3; break;
      case '6m': months = 6; break;
      case '12m': months = 12; break;
    }

    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(today.getFullYear(), today.getMonth() + months, 0);
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${endDate.getDate()}`;

    return { startDate, endDate: endDateStr };
  }

  onForecastPeriodChange(period: '3m' | '6m' | '12m'): void {
    this.forecastPeriod.set(period);
    this.loadForecast();
  }

  private renderForecastChart(): void {
    // Usar ViewChild para acessar o canvas
    const canvas = this.forecastCanvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico anterior
    const existingChart = this.chartInstance();
    if (existingChart) {
      existingChart.destroy();
    }

    const labels = this.forecastData().map(item => this.formatMonthYear(item.month));
    const values = this.forecastData().map(item => item.total);
    const isDark = this.themeService.isDark();

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Parcelas futuras',
          data: values,
          backgroundColor: 'rgba(91, 75, 255, 0.8)',
          borderColor: 'rgb(91, 75, 255)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 20, 36, 0.9)',
            titleColor: isDark ? '#F5F7FA' : '#0F1424',
            bodyColor: isDark ? 'rgba(245, 247, 250, 0.9)' : 'rgba(15, 20, 36, 0.9)',
            padding: 12,
            callbacks: {
              label: (context) => `Parcelas: ${this.formatCurrency(context.raw as number)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? 'rgba(163, 173, 191, 0.8)' : 'rgba(90, 98, 120, 0.8)',
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: isDark ? 'rgba(163, 173, 191, 0.1)' : 'rgba(90, 98, 120, 0.1)',
              display: true,
            },
            ticks: {
              color: isDark ? 'rgba(163, 173, 191, 0.8)' : 'rgba(90, 98, 120, 0.8)',
              font: { size: 11 },
              callback: (value) => this.formatCurrency(value as number),
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    });

    this.chartInstance.set(chart);
  }

  async onSubmit(): Promise<void> {
    if (this.installmentForm.invalid) {
      this.installmentForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.installmentForm.getRawValue();
      const dto: CreateInstallmentPlanDto = {
        description: formValue.description,
        totalAmount: formValue.totalAmount,
        installmentsTotal: formValue.installmentsTotal,
        firstDueDate: this.formatNgbDateForApi(formValue.firstDueDate),
        categoryId: formValue.categoryId || undefined,
      };

      await this.installmentApi.create(dto).toPromise();
      this.successMessage.set('Parcelamento criado com sucesso!');
      this.installmentForm.reset();
      this.setDefaultFirstDueDate();
      this.showPreview.set(false);
      await this.loadPlans();
      await this.loadForecast();
    } catch (err: unknown) {
      const error = err as { error?: { error?: string } };
      this.errorMessage.set(error.error?.error || 'Não foi possível criar o parcelamento.');
    } finally {
      this.submitting.set(false);
    }
  }

  private setDefaultFirstDueDate(): void {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const ngbDate: NgbDateStruct = {
      year: nextMonth.getFullYear(),
      month: nextMonth.getMonth() + 1,
      day: nextMonth.getDate(),
    };
    this.firstDueDate.setValue(this.formatNgbDate(ngbDate));
  }

  private formatNgbDate(date: NgbDateStruct): string {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  async togglePlanDetails(planId: string): Promise<void> {
    if (this.expandedPlanId() === planId) {
      this.expandedPlanId.set(null);
      return;
    }

    // Carregar detalhes se não tiver
    if (!this.planTransactions()[planId]) {
      this.loadingPlanDetails.update(current => ({ ...current, [planId]: true }));
      try {
        const response = await this.installmentApi.getById(planId).toPromise();
        this.planTransactions.update(current => ({
          ...current,
          [planId]: response?.plan?.transactions || [],
        }));
      } catch (err) {
        console.error('Erro ao carregar parcelas:', err);
        this.toastService.error('Erro ao carregar parcelas do plano.');
      } finally {
        this.loadingPlanDetails.update(current => ({ ...current, [planId]: false }));
      }
    }

    this.expandedPlanId.set(planId);
  }

  async payInstallment(transactionId: string): Promise<void> {
    this.payingInstallmentId.set(transactionId);
    try {
      await this.installmentApi.payInstallment(transactionId).toPromise();
      this.toastService.success('Parcela marcada como paga.');
      await this.loadPlans();
      await this.loadForecast();

      // Atualizar transações do plano expandido
      const expandedId = this.expandedPlanId();
      if (expandedId) {
        this.planTransactions.update(current => ({ ...current, [expandedId]: [] }));
        await this.togglePlanDetails(expandedId);
      }
    } catch (err) {
      console.error('Erro ao pagar parcela:', err);
      this.toastService.error('Não foi possível pagar a parcela.');
    } finally {
      this.payingInstallmentId.set(null);
    }
  }

  confirmDeletePlan(plan: InstallmentPlan): void {
    this.planToDelete.set(plan);
    this.modalService.open(this.deleteModalRef, { centered: true });
  }

  async deletePlan(modal: any): Promise<void> {
    const plan = this.planToDelete();
    if (!plan) return;

    this.deletingPlanId.set(plan.id);
    try {
      await this.installmentApi.deletePlan(plan.id).toPromise();
      this.toastService.success('Parcelamento excluído com sucesso.');
      modal.close();
      await this.loadPlans();
      await this.loadForecast();
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
      this.toastService.error('Não foi possível excluir o parcelamento.');
    } finally {
      this.deletingPlanId.set(null);
      this.planToDelete.set(null);
    }
  }

  progressPercent(plan: InstallmentPlan): number {
    if (plan.installments_total === 0) return 0;
    return (plan.installments_paid / plan.installments_total) * 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  // Helper methods for template access to signal object properties
  isPlanLoading(planId: string): boolean {
    return this.loadingPlanDetails()[planId] ?? false;
  }

  getPlanTransactions(planId: string): InstallmentTransaction[] {
    return this.planTransactions()[planId] ?? [];
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }

  formatMonthYear(monthStr: string): string {
    if (!monthStr) return '—';
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month, 10) - 1]}/${year}`;
  }
}
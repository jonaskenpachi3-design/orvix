import { Component, signal, computed, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModalModule, NgbModal, NgbAlertModule, NgbTooltipModule, NgbDatepickerModule, NgbInputDatepicker, NgbDropdownModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { BudgetApi, Budget, CreateBudgetDto, BudgetUsage, BudgetsResponse, BudgetUsageResponse } from '@core/api/budget.api';
import { CategoryApi, Category } from '@core/api/category.api';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbAlertModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    NgbInputDatepicker,
    NgbDropdownModule,
    NgbPaginationModule,
  ],
  template: `
    <div class="budgets-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">ORÇAMENTOS</span>
          <h1>Orçamentos</h1>
          <p class="text-muted">Controle seus gastos por categoria e acompanhe o orçamento mensal.</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="input-group" style="width: 200px;">
            <label for="budgetMonth" class="input-group-text"><i class="bi bi-calendar3" aria-hidden="true"></i></label>
            <input
              type="text"
              id="budgetMonth"
              class="form-control"
              placeholder="MM/AAAA"
              ngbDatepicker
              container="body"
              #dpMonth="ngbDatepicker"
              [formControl]="monthControl"
              (dateSelect)="onMonthChange($event)"
            />
            <button class="btn btn-outline" type="button" (click)="dpMonth.toggle()" aria-label="Abrir calendário">
              <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
          </div>
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <i class="bi bi-plus-circle me-2" aria-hidden="true"></i> Novo orçamento
          </button>
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

      <!-- Summary Cards -->
      @if (!loadingBudgets()) {
        <div class="row g-3 mb-4">
          <div class="col-12 col-md-4">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Total orçado</p>
                <h3 class="mb-0 tabular-nums">{{ formatCurrency(totalBudgeted()) }}</h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-4">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Total gasto</p>
                <h3 class="mb-0 tabular-nums text-warning">{{ formatCurrency(totalSpent()) }}</h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-4">
            <section class="card summary-card h-100" [class.border-success]="totalRemaining() >= 0" [class.border-danger]="totalRemaining() < 0">
              <div class="card-body">
                <p class="text-muted mb-1 small">Saldo do orçamento</p>
                <h3 class="mb-0 tabular-nums" [class.text-success]="totalRemaining() >= 0" [class.text-danger]="totalRemaining() < 0">
                  {{ formatCurrency(totalRemaining()) }}
                </h3>
              </div>
            </section>
          </div>
        </div>
      }

      <!-- Budgets List -->
      <section class="card">
        <div class="card-body p-0">
          @if (loadingBudgets()) {
            <div class="loading-state text-center py-5">
              <div class="spinner mx-auto"></div>
              <p class="mt-2 text-muted">Carregando orçamentos...</p>
            </div>
          } @else if (budgetUsage().length === 0) {
            <div class="empty-state text-center py-5">
              @if (expenseCategories().length === 0) {
                <i class="bi bi-tag empty-icon" aria-hidden="true"></i>
                <h3 class="empty-title">Nenhuma categoria de despesa</h3>
                <p class="empty-description">Crie categorias de despesa primeiro para poder definir orçamentos.</p>
                <a routerLink="/categories" class="btn btn-primary mt-2">
                  <i class="bi bi-plus me-1" aria-hidden="true"></i> Gerenciar categorias
                </a>
              } @else {
                <i class="bi bi-wallet2 empty-icon" aria-hidden="true"></i>
                <h3 class="empty-title">Nenhum orçamento definido</h3>
                <p class="empty-description">Crie seu primeiro orçamento para começar a controlar seus gastos.</p>
                <button type="button" class="btn btn-primary mt-2" (click)="openCreateModal()">
                  <i class="bi bi-plus me-1" aria-hidden="true"></i> Criar orçamento
                </button>
              }
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" style="width: 50px;">#</th>
                    <th scope="col">Categoria</th>
                    <th scope="col" style="width: 140px;" class="text-end">Orçado</th>
                    <th scope="col" style="width: 140px;" class="text-end">Gasto</th>
                    <th scope="col" style="width: 140px;" class="text-end">Restante</th>
                    <th scope="col" style="width: 150px;">Progresso</th>
                    <th scope="col" style="width: 80px;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (usage of budgetUsage(); track usage.budget_id; let i = $index) {
                    <tr [class.table-danger]="usage.percentage > 100" [class.table-warning]="usage.percentage > 80 && usage.percentage <= 100">
                      <td>{{ i + 1 }}</td>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <div class="category-icon bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center rounded" style="width: 32px; height: 32px;">
                            <i class="bi bi-tag" aria-hidden="true"></i>
                          </div>
                          <div>
                            <div class="fw-medium">{{ usage.category_name }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="text-end fw-medium tabular-nums">{{ formatCurrency(usage.budget_amount) }}</td>
                      <td class="text-end fw-medium tabular-nums text-warning">{{ formatCurrency(usage.spent) }}</td>
                      <td class="text-end fw-medium tabular-nums" [class.text-success]="usage.remaining >= 0" [class.text-danger]="usage.remaining < 0">
                        {{ formatCurrency(usage.remaining) }}
                      </td>
                      <td>
                        <div class="progress" style="height: 8px; max-width: 200px;" role="progressbar"
                          [attr.aria-valuenow]="usage.percentage"
                          aria-valuemin="0"
                          [attr.aria-valuemax]="usage.percentage > 100 ? usage.percentage : 100"
                          [attr.aria-label]="'Orçamento para ' + usage.category_name + ': ' + usage.percentage + '% usado'">
                          <div
                            class="progress-bar"
                            [class.bg-success]="usage.percentage <= 80"
                            [class.bg-warning]="usage.percentage > 80 && usage.percentage <= 100"
                            [class.bg-danger]="usage.percentage > 100"
                            [style.width.%]="Math.min(usage.percentage, 100)"
                          ></div>
                          @if (usage.percentage > 100) {
                            <div class="progress-bar bg-danger" style="width: {{ Math.min(usage.percentage - 100, 100) }}%;"></div>
                          }
                        </div>
                        <small class="text-muted d-block mt-1 text-end">{{ usage.percentage }}%</small>
                      </td>
                      <td>
                        <div ngbDropdown container="body" placement="bottom-end" class="d-inline-block">
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm"
                            ngbDropdownToggle
                            [attr.aria-label]="'Opções para ' + usage.category_name"
                          >
                            <i class="bi bi-three-dots" aria-hidden="true"></i>
                          </button>
                          <ul ngbDropdownMenu>
                            <li>
                              <button
                                type="button"
                                ngbDropdownItem class="dropdown-item"
                                (click)="openEditModal(usage)"
                              >
                                <i class="bi bi-pencil me-2" aria-hidden="true"></i> Editar
                              </button>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                              <button
                                type="button"
                                class="dropdown-item text-danger"
                                (click)="confirmDeleteBudget(usage)"
                                [disabled]="deletingBudgetId() === usage.budget_id"
                              >
                                @if (deletingBudgetId() === usage.budget_id) {
                                  <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Excluindo...
                                } @else {
                                  <i class="bi bi-trash me-2" aria-hidden="true"></i> Excluir
                                }
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </section>

      <!-- Suggestions -->
      @if (!loadingBudgets() && expenseCategories().length > 0 && budgetUsage().length < expenseCategories().length) {
        <section class="card mt-4">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-lightbulb me-2" aria-hidden="true"></i> Sugestões de orçamento</h5>
          </div>
          <div class="card-body">
            <p class="text-muted small mb-3">As categorias abaixo não têm orçamento definido para este mês:</p>
            <div class="d-flex flex-wrap gap-2">
              @for (cat of categoriesWithoutBudget(); track cat.id) {
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  (click)="openCreateModal(cat.id)"
                >
                  <i class="bi bi-plus me-1" aria-hidden="true"></i> {{ cat.name }}
                </button>
              }
            </div>
          </div>
        </section>
      }
    </div>

    <!-- Create/Edit Budget Modal -->
    <ng-template #budgetModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">{{ editingBudget() ? 'Editar orçamento' : 'Novo orçamento' }}</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form [formGroup]="budgetForm" (ngSubmit)="saveBudget(modal)">
          <div class="mb-3">
            <label for="budgetCategory" class="form-label">Categoria</label>
            <select
              id="budgetCategory"
              class="form-select"
              formControlName="categoryId"
              [class.is-invalid]="categoryId.invalid && (categoryId.dirty || categoryId.touched)"
            >
              <option value="">Selecione uma categoria</option>
              @for (cat of expenseCategories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
            @if (categoryId.invalid && (categoryId.dirty || categoryId.touched)) {
              <div class="form-error">Selecione uma categoria.</div>
            }
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label for="budgetAmount" class="form-label">Valor do orçamento</label>
              <input
                type="number"
                id="budgetAmount"
                class="form-control"
                formControlName="amount"
                placeholder="0,00"
                step="0.01"
                min="0.01"
                [class.is-invalid]="amount.invalid && (amount.dirty || amount.touched)"
              />
              @if (amount.invalid && (amount.dirty || amount.touched)) {
                <div class="form-error">Informe um valor válido.</div>
              }
            </div>

            <div class="col-md-6">
              <label for="budgetMonthModal" class="form-label">Mês</label>
              <div class="input-group">
                <input
                  type="text"
                  id="budgetMonthModal"
                  class="form-control"
                  formControlName="month"
                  placeholder="MM/AAAA"
                  ngbDatepicker
                  container="body"
                  #dpModal="ngbDatepicker"
                  [class.is-invalid]="month.invalid && (month.dirty || month.touched)"
                />
                <button class="btn btn-outline" type="button" (click)="dpModal.toggle()" aria-label="Abrir calendário">
                  <i class="bi bi-calendar3" aria-hidden="true"></i>
                </button>
              </div>
              @if (month.invalid && (month.dirty || month.touched)) {
                <div class="form-error">Mês é obrigatório.</div>
              }
            </div>
          </div>

          @if (editingBudget()) {
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2" aria-hidden="true"></i>
              Gasto atual: <strong>{{ formatCurrency(getCurrentSpent(editingBudget()!.budget_id)) }}</strong>
              ({{ editingBudget() ? getBudgetUsagePercentage(editingBudget()!.budget_id) : 0 }}% usado)
            </div>
          }
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="saveBudget(modal)"
          [disabled]="budgetForm.invalid || savingBudget()"
        >
          @if (savingBudget()) {
            <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Salvando...
          } @else {
            <i class="bi bi-check-circle me-2" aria-hidden="true"></i> {{ editingBudget() ? 'Atualizar' : 'Criar' }}
          }
        </button>
      </div>
    </ng-template>

    <!-- Delete Confirmation Modal -->
    <ng-template #deleteModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Excluir orçamento</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p>Tem certeza que deseja excluir o orçamento para <strong>{{ budgetToDelete()?.category_name }}</strong>?</p>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          Esta ação não pode ser desfeita. Os gastos já realizados não serão afetados.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-danger"
          (click)="deleteBudget(modal)"
          [disabled]="deletingBudgetId() === budgetToDelete()?.budget_id"
        >
          @if (deletingBudgetId() === budgetToDelete()?.budget_id) {
            <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
          } @else {
            Excluir
          }
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .budgets-page {
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

    .empty-title {
      font-size: 1.1rem;
      margin-top: 1rem;
    }

    .empty-description {
      color: var(--orvix-text-secondary);
      margin-top: 0.5rem;
      max-width: 280px;
      margin-left: auto;
      margin-right: auto;
    }

    .loading-state .spinner {
      width: 2.5rem;
      height: 2.5rem;
    }

    .form-error {
      color: var(--orvix-negative);
      font-size: var(--font-size-caption);
      margin-top: 0.25rem;
    }

    .spinner-sm {
      width: 1rem;
      height: 1rem;
      border-width: 2px;
    }

    .category-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
    }

    .progress {
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      transition: width 0.3s ease;
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

    .table tbody tr {
      transition: background-color var(--transition-fast);
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

      .page-header .d-flex {
        justify-content: center;
      }

      .input-group {
        width: 100% !important;
        max-width: 250px;
        margin: 0 auto;
      }
    }
  `]
})
export class BudgetsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly budgetApi = inject(BudgetApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);

  // Signals
  readonly budgets = signal<Budget[]>([]);
  readonly budgetUsage = signal<BudgetUsage[]>([]);
  readonly loadingBudgets = signal(false);
  readonly savingBudget = signal(false);
  readonly deletingBudgetId = signal<string | null>(null);
  readonly editingBudget = signal<BudgetUsage | null>(null);
  readonly budgetToDelete = signal<BudgetUsage | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly monthControl = this.fb.control<{ year: number; month: number; day: number } | null>(null);

  @ViewChild('budgetModal', { static: false }) budgetModalRef!: any;
  @ViewChild('deleteModal', { static: false }) deleteModalRef!: any;

  readonly budgetForm = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    month: ['' as string | { year: number; month: number; day: number }, Validators.required],
  });

  get categoryId() { return this.budgetForm.controls.categoryId; }
  get amount() { return this.budgetForm.controls.amount; }
  get month() { return this.budgetForm.controls.month; }

  // Computed
  readonly expenseCategories = computed(() =>
    this.categories().filter(c => c.type === 'expense')
  );

  readonly currentMonth = computed(() => {
    const mc = this.monthControl.value;
    if (mc) return `${mc.year}-${String(mc.month).padStart(2, '0')}-01`;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });

  readonly budgetUsageMap = computed(() => {
    const map = new Map<string, BudgetUsage>();
    this.budgetUsage().forEach(u => map.set(u.budget_id, u));
    return map;
  });

  readonly totalBudgeted = computed(() =>
    this.budgetUsage().reduce((sum, u) => sum + u.budget_amount, 0)
  );

  readonly totalSpent = computed(() =>
    this.budgetUsage().reduce((sum, u) => sum + u.spent, 0)
  );

  readonly totalRemaining = computed(() => this.totalBudgeted() - this.totalSpent());

  readonly categoriesWithoutBudget = computed(() => {
    const budgetedCategoryIds = new Set(this.budgetUsage().map(u => u.category_id));
    return this.expenseCategories().filter(c => !budgetedCategoryIds.has(c.id));
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadBudgetsForCurrentMonth();
    // Subscribe to month changes
    this.monthControl.valueChanges.subscribe(() => {
      this.loadBudgetsForCurrentMonth();
    });
  }

  private async loadCategories(): Promise<void> {
    try {
      const response = await this.categoryApi.getAll().toPromise();
      this.categories.set(response?.categories ?? []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }

  private async loadBudgetsForCurrentMonth(): Promise<void> {
    this.loadingBudgets.set(true);
    this.errorMessage.set(null);
    try {
      const month = this.currentMonth();
      const [budgetsResponse, usageResponse] = await Promise.all([
        this.budgetApi.getAll(month).toPromise(),
        this.budgetApi.getUsage(month).toPromise(),
      ]);
      this.budgets.set(budgetsResponse?.budgets ?? []);
      this.budgetUsage.set(usageResponse?.usage ?? []);
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err);
      this.errorMessage.set('Não foi possível carregar os orçamentos.');
    } finally {
      this.loadingBudgets.set(false);
    }
  }

  onMonthChange(event: { year: number; month: number; day: number }): void {
    this.monthControl.setValue(event);
    this.loadBudgetsForCurrentMonth();
  }

  openCreateModal(prefillCategoryId?: string): void {
    this.editingBudget.set(null);
    const today = new Date();
    const monthValue = prefillCategoryId
      ? { year: today.getFullYear(), month: today.getMonth() + 1, day: 1 }
      : { year: today.getFullYear(), month: today.getMonth() + 1, day: 1 };

    this.budgetForm.reset({
      categoryId: prefillCategoryId ?? '',
      amount: 0,
      month: monthValue,
    });
    this.modalService.open(this.budgetModalRef, { centered: true });
  }

  openEditModal(usage: BudgetUsage): void {
    this.editingBudget.set(usage);
    const monthStr = this.currentMonth();
    const [year, month] = monthStr.split('-').map(Number);
    this.budgetForm.patchValue({
      categoryId: usage.category_id,
      amount: usage.budget_amount,
      month: { year, month, day: 1 },
    });
    this.modalService.open(this.budgetModalRef, { centered: true });
  }

  getCurrentSpent(budgetId: string): number {
    return this.budgetUsageMap().get(budgetId)?.spent ?? 0;
  }

  getBudgetUsagePercentage(budgetId: string): number {
    return this.budgetUsageMap().get(budgetId)?.percentage ?? 0;
  }

  async saveBudget(modal: any): Promise<void> {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    this.savingBudget.set(true);
    this.errorMessage.set(null);
    try {
      const formValue = this.budgetForm.getRawValue();
      const monthStr = this.formatMonthForApi(formValue.month);
      const dto: CreateBudgetDto = {
        categoryId: formValue.categoryId,
        amount: formValue.amount,
        month: monthStr,
      };

      const editing = this.editingBudget();

      if (editing) {
        await this.budgetApi.update(editing.budget_id, dto).toPromise();
        this.toastService.success('Orçamento atualizado com sucesso.');
      } else {
        await this.budgetApi.create(dto).toPromise();
        this.toastService.success('Orçamento criado com sucesso.');
      }

      modal.close();
      await this.loadBudgetsForCurrentMonth();
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      this.errorMessage.set('Não foi possível salvar o orçamento.');
    } finally {
      this.savingBudget.set(false);
    }
  }

  private formatMonthForApi(dateValue: string | { year: number; month: number; day: number }): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-01`;
  }

  confirmDeleteBudget(usage: BudgetUsage): void {
    this.budgetToDelete.set(usage);
    this.modalService.open(this.deleteModalRef, { centered: true });
  }

  async deleteBudget(modal: any): Promise<void> {
    const usage = this.budgetToDelete();
    if (!usage) return;

    this.deletingBudgetId.set(usage.budget_id);
    try {
      await this.budgetApi.deleteBudget(usage.budget_id).toPromise();
      this.toastService.success('Orçamento excluído com sucesso.');
      modal.close();
      await this.loadBudgetsForCurrentMonth();
    } catch (err) {
      console.error('Erro ao excluir orçamento:', err);
      this.toastService.error('Não foi possível excluir o orçamento.');
    } finally {
      this.deletingBudgetId.set(null);
      this.budgetToDelete.set(null);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  // Math helper for template
  Math = Math;
}
import { Component, signal, computed, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModalModule, NgbModal, NgbAlertModule, NgbTooltipModule, NgbDatepickerModule, NgbInputDatepicker, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TransactionApi, Transaction, CreateTransactionDto, TransactionsResponse } from '@core/api/transaction.api';
import { CategoryApi, Category } from '@core/api/category.api';
import { ToastService } from '@shared/services/toast.service';
import { BankSyncCardComponent } from './bank-sync-card.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbAlertModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    NgbInputDatepicker,
    NgbPaginationModule,
    BankSyncCardComponent,
  ],
  template: `
    <div class="transactions-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">TRANSAÇÕES</span>
          <h1>Transações</h1>
          <p class="text-muted">Gerencie suas receitas e despesas.</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="openCreateModal()">
          <i class="bi bi-plus-circle me-2" aria-hidden="true"></i> Nova transação
        </button>
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

      <!-- Open Finance: cartão de crédito -->
      <app-bank-sync-card (synced)="onBankSynced()" />

      <!-- Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-4">
          <section class="card summary-card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <p class="text-muted mb-1 small">Receitas</p>
                  <h3 class="mb-0 text-success tabular-nums">{{ formatCurrency(summaryIncome()) }}</h3>
                </div>
                <div class="avatar-circle bg-success bg-opacity-10 text-success" style="width: 48px; height: 48px; border-radius: 12px;">
                  <i class="bi bi-arrow-down-circle" style="font-size: 1.5rem;" aria-hidden="true"></i>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="col-12 col-md-4">
          <section class="card summary-card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <p class="text-muted mb-1 small">Despesas</p>
                  <h3 class="mb-0 text-danger tabular-nums">{{ formatCurrency(summaryExpense()) }}</h3>
                </div>
                <div class="avatar-circle bg-danger bg-opacity-10 text-danger" style="width: 48px; height: 48px; border-radius: 12px;">
                  <i class="bi bi-arrow-up-circle" style="font-size: 1.5rem;" aria-hidden="true"></i>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="col-12 col-md-4">
          <section class="card summary-card h-100" [class.border-primary]="summaryBalance() >= 0" [class.border-danger]="summaryBalance() < 0">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <p class="text-muted mb-1 small">Saldo</p>
                  <h3 class="mb-0 tabular-nums" [class.text-success]="summaryBalance() >= 0" [class.text-danger]="summaryBalance() < 0">
                    {{ formatCurrency(summaryBalance()) }}
                  </h3>
                </div>
                <div class="avatar-circle" [class.bg-primary-bg]="summaryBalance() >= 0" [class.bg-danger-bg]="summaryBalance() < 0" [class.text-primary]="summaryBalance() >= 0" [class.text-danger]="summaryBalance() < 0" style="width: 48px; height: 48px; border-radius: 12px;">
                  <i class="bi" [class.bi-currency-dollar]="summaryBalance() >= 0" [class.bi-currency-dollar]="summaryBalance() < 0" style="font-size: 1.5rem;" aria-hidden="true"></i>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Filters -->
      <section class="card mb-4">
        <div class="card-body">
          <form [formGroup]="filterForm" class="row g-3 align-items-end">
            <div class="col-12 col-md-3">
              <label for="filterType" class="form-label">Tipo</label>
              <select id="filterType" class="form-select" formControlName="type">
                <option value="">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>
            <div class="col-12 col-md-3">
              <label for="filterCategory" class="form-label">Categoria</label>
              <select id="filterCategory" class="form-select" formControlName="categoryId">
                <option value="">Todas</option>
                @for (cat of filteredCategories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="col-12 col-md-3">
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
            <div class="col-12 col-md-3">
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
            <div class="col-12 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" (click)="clearFilters()">
                <i class="bi bi-x-circle me-1" aria-hidden="true"></i> Limpar
              </button>
              <button type="button" class="btn btn-primary" (click)="applyFilters()">
                <i class="bi bi-funnel me-1" aria-hidden="true"></i> Filtrar
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- Transactions Table -->
      <section class="card">
        <div class="card-body p-0">
          @if (loadingTransactions()) {
            <div class="loading-state text-center py-5">
              <div class="spinner mx-auto"></div>
              <p class="mt-2 text-muted">Carregando transações...</p>
            </div>
          } @else if (transactions().length === 0) {
            <div class="empty-state text-center py-5">
              <i class="bi bi-list-ul empty-icon" aria-hidden="true"></i>
              <h3 class="empty-title">Nenhuma transação encontrada</h3>
              <p class="empty-description">{{ hasActiveFilters() ? 'Tente ajustar os filtros' : 'Crie sua primeira transação para começar.' }}</p>
              @if (!hasActiveFilters()) {
                <button type="button" class="btn btn-primary mt-2" (click)="openCreateModal()">
                  <i class="bi bi-plus me-1" aria-hidden="true"></i> Criar transação
                </button>
              }
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col" style="width: 120px;">Data</th>
                    <th scope="col">Descrição</th>
                    <th scope="col" style="width: 140px;">Categoria</th>
                    <th scope="col" style="width: 130px;" class="text-end">Valor</th>
                    <th scope="col" style="width: 100px;">Status</th>
                    <th scope="col" style="width: 80px;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of pagedTransactions(); track tx.id) {
                    <tr [class.opacity-50]="tx.status === 'scheduled'">
                      <td>{{ formatDate(tx.transaction_date) }}</td>
                      <td>
                        <div class="fw-medium">{{ tx.description }}</div>
                        @if (tx.plan_id) {
                          <small class="text-muted">
                            <i class="bi bi-calendar2-range me-1" aria-hidden="true"></i>
                            Parcela {{ tx.installment_number }}
                          </small>
                        }
                      </td>
                      <td>
                        @if (tx.category) {
                          <span class="badge" [class.bg-success-subtle]="tx.category.type === 'income'" [class.text-success]="tx.category.type === 'income'" [class.bg-danger-subtle]="tx.category.type === 'expense'" [class.text-danger]="tx.category.type === 'expense'">
                            {{ tx.category.name }}
                          </span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                      <td class="text-end">
                        <span class="fw-semibold tabular-nums" [class.text-success]="tx.type === 'income'" [class.text-danger]="tx.type === 'expense'">
                          {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                        </span>
                      </td>
                      <td>
                        @if (tx.status === 'paid') {
                          <span class="badge bg-success-subtle text-success">
                            <i class="bi bi-check me-1" aria-hidden="true"></i> Paga
                          </span>
                        } @else {
                          <span class="badge bg-warning-subtle text-warning">
                            <i class="bi bi-clock me-1" aria-hidden="true"></i> Agendada
                          </span>
                        }
                      </td>
                      <td>
                        <div class="dropdown">
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            [attr.aria-label]="'Opções para ' + tx.description"
                          >
                            <i class="bi bi-three-dots" aria-hidden="true"></i>
                          </button>
                          <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                              <button
                                type="button"
                                class="dropdown-item"
                                (click)="openEditModal(tx)"
                              >
                                <i class="bi bi-pencil me-2" aria-hidden="true"></i> Editar
                              </button>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                              <button
                                type="button"
                                class="dropdown-item text-danger"
                                (click)="confirmDeleteTransaction(tx)"
                                [disabled]="deletingTransactionId() === tx.id"
                              >
                                @if (deletingTransactionId() === tx.id) {
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

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="card-footer border-0 bg-transparent">
                <nav aria-label="Paginação das transações">
                  <ngb-pagination
                    [collectionSize]="totalItems()"
                    [page]="currentPage()"
                    [pageSize]="pageSize"
                    [maxSize]="5"
                    [rotate]="true"
                    [boundaryLinks]="true"
                    (pageChange)="onPageChange($event)"
                    class="justify-content-center"
                  ></ngb-pagination>
                </nav>
                <p class="text-muted text-center small mt-2 mb-0">
                  Mostrando {{ (currentPage() - 1) * pageSize + 1 }} a {{ Math.min(currentPage() * pageSize, totalItems()) }} de {{ totalItems() }} transações
                </p>
              </div>
            }
          }
        </div>
      </section>
    </div>

    <!-- Create/Edit Transaction Modal -->
    <ng-template #transactionModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">{{ editingTransaction() ? 'Editar transação' : 'Nova transação' }}</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form [formGroup]="transactionForm" (ngSubmit)="saveTransaction(modal)">
          <div class="mb-3">
            <label for="txDescription" class="form-label">Descrição</label>
            <input
              type="text"
              id="txDescription"
              class="form-control"
              formControlName="description"
              placeholder="Ex: Salário, Supermercado, Uber..."
              [class.is-invalid]="description.invalid && (description.dirty || description.touched)"
              autocomplete="off"
            />
            @if (description.invalid && (description.dirty || description.touched)) {
              <div class="form-error">Descrição é obrigatória (máx. 150 caracteres).</div>
            }
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label for="txAmount" class="form-label">Valor</label>
              <input
                type="number"
                id="txAmount"
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
              <label class="form-label">Tipo</label>
              <div class="btn-group w-100" role="group" aria-label="Tipo de transação">
                <input
                  type="radio"
                  class="btn-check"
                  name="txType"
                  id="txTypeIncome"
                  value="income"
                  formControlName="type"
                  autocomplete="off"
                />
                <label class="btn btn-outline-success" for="txTypeIncome">
                  <i class="bi bi-arrow-down-circle me-1" aria-hidden="true"></i> Receita
                </label>
                <input
                  type="radio"
                  class="btn-check"
                  name="txType"
                  id="txTypeExpense"
                  value="expense"
                  formControlName="type"
                  autocomplete="off"
                />
                <label class="btn btn-outline-danger" for="txTypeExpense">
                  <i class="bi bi-arrow-up-circle me-1" aria-hidden="true"></i> Despesa
                </label>
              </div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label for="txCategory" class="form-label">Categoria</label>
              <select
                id="txCategory"
                class="form-select"
                formControlName="categoryId"
              >
                <option value="">Sem categoria</option>
                @for (cat of filteredCategories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="col-md-6">
              <label for="txDate" class="form-label">Data</label>
              <div class="input-group">
                <input
                  type="text"
                  id="txDate"
                  class="form-control"
                  formControlName="transactionDate"
                  placeholder="DD/MM/AAAA"
                  ngbDatepicker
                  #dpTx="ngbDatepicker"
                />
                <button class="btn btn-outline" type="button" (click)="dpTx.toggle()" aria-label="Abrir calendário">
                  <i class="bi bi-calendar3" aria-hidden="true"></i>
                </button>
              </div>
              @if (transactionDate.invalid && (transactionDate.dirty || transactionDate.touched)) {
                <div class="form-error">Data é obrigatória.</div>
              }
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="saveTransaction(modal)"
          [disabled]="transactionForm.invalid || savingTransaction()"
        >
          @if (savingTransaction()) {
            <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Salvando...
          } @else {
            <i class="bi bi-check-circle me-2" aria-hidden="true"></i> {{ editingTransaction() ? 'Atualizar' : 'Criar' }}
          }
        </button>
      </div>
    </ng-template>

    <!-- Delete Confirmation Modal -->
    <ng-template #deleteModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Excluir transação</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p>Tem certeza que deseja excluir a transação <strong>{{ transactionToDelete()?.description }}</strong>?</p>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {{ transactionToDelete()?.plan_id ? 'Esta transação faz parte de um parcelamento. Ao excluí-la, a parcela será removida do plano.' : 'Esta ação não pode ser desfeita.' }}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-danger"
          (click)="deleteTransaction(modal)"
          [disabled]="deletingTransactionId() === transactionToDelete()?.id"
        >
          @if (deletingTransactionId() === transactionToDelete()?.id) {
            <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
          } @else {
            Excluir
          }
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .transactions-page {
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

    .table tbody tr:hover {
      background-color: var(--orvix-surface-2);
    }

    .badge {
      font-weight: 500;
    }

    .btn-group .btn {
      flex: 1;
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

      .table-responsive {
        font-size: var(--font-size-small);
      }
    }
  `]
})
export class TransactionsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly transactionApi = inject(TransactionApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);

  // Signals
  readonly transactions = signal<Transaction[]>([]);
  readonly loadingTransactions = signal(false);
  readonly savingTransaction = signal(false);
  readonly deletingTransactionId = signal<string | null>(null);
  readonly editingTransaction = signal<Transaction | null>(null);
  readonly transactionToDelete = signal<Transaction | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = 20;
  readonly totalItems = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));
  readonly pagedTransactions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.transactions().slice(start, start + this.pageSize);
  });

  @ViewChild('transactionModal', { static: false }) transactionModalRef!: any;
  @ViewChild('deleteModal', { static: false }) deleteModalRef!: any;

  readonly filterForm = this.fb.nonNullable.group({
    type: ['' as 'income' | 'expense' | ''],
    categoryId: [''],
    startDate: ['' as string | { year: number; month: number; day: number }],
    endDate: ['' as string | { year: number; month: number; day: number }],
  });

  readonly transactionForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(150)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['expense' as 'income' | 'expense', Validators.required],
    categoryId: [''],
    transactionDate: ['' as string | { year: number; month: number; day: number }, Validators.required],
  });

  get description() { return this.transactionForm.controls.description; }
  get amount() { return this.transactionForm.controls.amount; }
  get transactionDate() { return this.transactionForm.controls.transactionDate; }

  // Computed filtered categories based on selected type
  readonly filteredCategories = computed(() => {
    const type = this.filterForm.controls.type.value;
    if (!type) return this.categories();
    return this.categories().filter(c => c.type === type);
  });

  // Summary computed values
  readonly summaryIncome = computed(() =>
    this.transactions()
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  readonly summaryExpense = computed(() =>
    this.transactions()
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  readonly summaryBalance = computed(() => this.summaryIncome() - this.summaryExpense());

  readonly hasActiveFilters = computed(() => {
    const f = this.filterForm.value;
    return !!(f.type || f.categoryId || f.startDate || f.endDate);
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadTransactions();
  }

  onBankSynced(): void {
    this.loadTransactions();
  }

  private async loadCategories(): Promise<void> {
    try {
      const response = await this.categoryApi.getAll().toPromise();
      this.categories.set(response?.categories ?? []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }

  private async loadTransactions(): Promise<void> {
    this.loadingTransactions.set(true);
    this.errorMessage.set(null);
    try {
      const filters = this.getApiFilters();
      const response = await this.transactionApi.getAll(filters).toPromise();
      this.transactions.set(response?.transactions ?? []);
      // Note: In a real app, the API should return total count for pagination
      // For now we'll use the returned array length
      this.totalItems.set(response?.transactions?.length ?? 0);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
      this.errorMessage.set('Não foi possível carregar as transações.');
    } finally {
      this.loadingTransactions.set(false);
    }
  }

  private getApiFilters(): { startDate?: string; endDate?: string; type?: string; categoryId?: string } {
    const f = this.filterForm.value;
    return {
      type: f.type || undefined,
      categoryId: f.categoryId || undefined,
      startDate: f.startDate ? this.formatDateForApi(f.startDate) : undefined,
      endDate: f.endDate ? this.formatDateForApi(f.endDate) : undefined,
    };
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadTransactions();
  }

  clearFilters(): void {
    this.filterForm.reset({
      type: '',
      categoryId: '',
      startDate: '',
      endDate: '',
    });
    this.currentPage.set(1);
    this.loadTransactions();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadTransactions();
  }

  openCreateModal(): void {
    this.editingTransaction.set(null);
    this.transactionForm.reset({
      description: '',
      amount: 0,
      type: 'expense',
      categoryId: '',
      transactionDate: this.getTodayDate(),
    });
    this.modalService.open(this.transactionModalRef, { centered: true, size: 'lg' });
  }

  openEditModal(transaction: Transaction): void {
    this.editingTransaction.set(transaction);
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.category_id ?? '',
      transactionDate: this.formatDateForInput(transaction.transaction_date),
    });
    this.modalService.open(this.transactionModalRef, { centered: true, size: 'lg' });
  }

  private getTodayDate(): { year: number; month: number; day: number } {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  }

  private formatDateForInput(dateString: string): { year: number; month: number; day: number } {
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  private formatDateForApi(dateValue: string | { year: number; month: number; day: number }): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
  }

  async saveTransaction(modal: any): Promise<void> {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.savingTransaction.set(true);
    this.errorMessage.set(null);
    try {
      const formValue = this.transactionForm.getRawValue();
      const dto: CreateTransactionDto = {
        description: formValue.description,
        amount: formValue.amount,
        type: formValue.type,
        categoryId: formValue.categoryId || undefined,
        transactionDate: this.formatDateForApi(formValue.transactionDate),
      };

      const editing = this.editingTransaction();

      if (editing) {
        await this.transactionApi.update(editing.id, dto).toPromise();
        this.toastService.success('Transação atualizada com sucesso.');
      } else {
        await this.transactionApi.create(dto).toPromise();
        this.toastService.success('Transação criada com sucesso.');
      }

      modal.close();
      await this.loadTransactions();
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
      this.errorMessage.set('Não foi possível salvar a transação.');
    } finally {
      this.savingTransaction.set(false);
    }
  }

  confirmDeleteTransaction(transaction: Transaction): void {
    this.transactionToDelete.set(transaction);
    this.modalService.open(this.deleteModalRef, { centered: true });
  }

  async deleteTransaction(modal: any): Promise<void> {
    const transaction = this.transactionToDelete();
    if (!transaction) return;

    this.deletingTransactionId.set(transaction.id);
    try {
      await this.transactionApi.deleteTransaction(transaction.id).toPromise();
      this.toastService.success('Transação excluída com sucesso.');
      modal.close();
      await this.loadTransactions();
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
      this.toastService.error('Não foi possível excluir a transação.');
    } finally {
      this.deletingTransactionId.set(null);
      this.transactionToDelete.set(null);
    }
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

  // Math helper for template
  Math = Math;
}
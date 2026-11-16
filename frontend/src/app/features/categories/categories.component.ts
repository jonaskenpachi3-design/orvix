import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModalModule, NgbModal, NgbAlertModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CategoryApi, Category, CreateCategoryDto, CategoriesResponse } from '@core/api/category.api';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbAlertModule,
    NgbTooltipModule,
  ],
  template: `
    <div class="categories-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">CATEGORIAS</span>
          <h1>Categorias</h1>
          <p class="text-muted">Organize suas receitas e despesas por categorias personalizadas.</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="openCreateModal()">
          <i class="bi bi-plus-circle me-2" aria-hidden="true"></i> Nova categoria
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

      <!-- Categories Cards -->
      <div class="row g-4 mb-5">
        <!-- Income Categories -->
        <div class="col-12 col-lg-6">
          <section class="card h-100">
            <div class="card-header bg-success-subtle border-success">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <div class="avatar-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; border-radius: 10px;">
                    <i class="bi bi-arrow-down-circle" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h2 class="section-title mb-0">Receitas</h2>
                    <small class="text-muted">{{ incomeCategories().length }} categorias</small>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body">
              @if (loadingCategories()) {
                <div class="loading-state text-center py-5">
                  <div class="spinner mx-auto"></div>
                  <p class="mt-2 text-muted">Carregando categorias...</p>
                </div>
              } @else if (incomeCategories().length === 0) {
                <div class="empty-state text-center py-5">
                  <i class="bi bi-plus-circle empty-icon text-success" aria-hidden="true"></i>
                  <h3 class="empty-title">Nenhuma categoria de receita</h3>
                  <p class="empty-description">Crie sua primeira categoria para organizar suas receitas.</p>
                  <button type="button" class="btn btn-success mt-2" (click)="openCreateModal('income')">
                    <i class="bi bi-plus me-1" aria-hidden="true"></i> Criar categoria
                  </button>
                </div>
              } @else {
                <ul class="list-group list-group-flush">
                  @for (cat of incomeCategories(); track cat.id) {
                    <li class="list-group-item border-0 px-0 d-flex align-items-center justify-content-between">
                      <div class="d-flex align-items-center gap-3">
                        <div class="category-icon bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center rounded" style="width: 36px; height: 36px;">
                          <i class="bi bi-tag" aria-hidden="true"></i>
                        </div>
                        <div>
                          <h6 class="mb-0">{{ cat.name }}</h6>
                          @if (cat.transaction_count !== undefined) {
                            <small class="text-muted">{{ cat.transaction_count }} transação{{ cat.transaction_count !== 1 ? 'ões' : '' }}</small>
                          }
                        </div>
                      </div>
                      <div class="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="openEditModal(cat)"
                          [attr.aria-label]="'Editar ' + cat.name"
                        >
                          <i class="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm text-danger"
                          (click)="confirmDeleteCategory(cat)"
                          [attr.aria-label]="'Excluir ' + cat.name"
                          [disabled]="deletingCategoryId() === cat.id"
                        >
                          @if (deletingCategoryId() === cat.id) {
                            <span class="spinner spinner-sm" aria-hidden="true"></span>
                          } @else {
                            <i class="bi bi-trash" aria-hidden="true"></i>
                          }
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          </section>
        </div>

        <!-- Expense Categories -->
        <div class="col-12 col-lg-6">
          <section class="card h-100">
            <div class="card-header bg-danger-subtle border-danger">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <div class="avatar-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; border-radius: 10px;">
                    <i class="bi bi-arrow-up-circle" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h2 class="section-title mb-0">Despesas</h2>
                    <small class="text-muted">{{ expenseCategories().length }} categorias</small>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body">
              @if (loadingCategories()) {
                <div class="loading-state text-center py-5">
                  <div class="spinner mx-auto"></div>
                  <p class="mt-2 text-muted">Carregando categorias...</p>
                </div>
              } @else if (expenseCategories().length === 0) {
                <div class="empty-state text-center py-5">
                  <i class="bi bi-plus-circle empty-icon text-danger" aria-hidden="true"></i>
                  <h3 class="empty-title">Nenhuma categoria de despesa</h3>
                  <p class="empty-description">Crie sua primeira categoria para organizar suas despesas.</p>
                  <button type="button" class="btn btn-danger mt-2" (click)="openCreateModal('expense')">
                    <i class="bi bi-plus me-1" aria-hidden="true"></i> Criar categoria
                  </button>
                </div>
              } @else {
                <ul class="list-group list-group-flush">
                  @for (cat of expenseCategories(); track cat.id) {
                    <li class="list-group-item border-0 px-0 d-flex align-items-center justify-content-between">
                      <div class="d-flex align-items-center gap-3">
                        <div class="category-icon bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center rounded" style="width: 36px; height: 36px;">
                          <i class="bi bi-tag" aria-hidden="true"></i>
                        </div>
                        <div>
                          <h6 class="mb-0">{{ cat.name }}</h6>
                          @if (cat.transaction_count !== undefined) {
                            <small class="text-muted">{{ cat.transaction_count }} transação{{ cat.transaction_count !== 1 ? 'ões' : '' }}</small>
                          }
                        </div>
                      </div>
                      <div class="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="openEditModal(cat)"
                          [attr.aria-label]="'Editar ' + cat.name"
                        >
                          <i class="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm text-danger"
                          (click)="confirmDeleteCategory(cat)"
                          [attr.aria-label]="'Excluir ' + cat.name"
                          [disabled]="deletingCategoryId() === cat.id"
                        >
                          @if (deletingCategoryId() === cat.id) {
                            <span class="spinner spinner-sm" aria-hidden="true"></span>
                          } @else {
                            <i class="bi bi-trash" aria-hidden="true"></i>
                          }
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          </section>
        </div>
      </div>

      <!-- Create/Edit Category Modal -->
      <ng-template #categoryModal let-modal>
        <div class="modal-header">
          <h5 class="modal-title">{{ editingCategory() ? 'Editar categoria' : 'Nova categoria' }}</h5>
          <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body">
          <form [formGroup]="categoryForm" (ngSubmit)="saveCategory(modal)">
            <div class="mb-3">
              <label for="categoryName" class="form-label">Nome da categoria</label>
              <input
                type="text"
                id="categoryName"
                class="form-control"
                formControlName="name"
                placeholder="Ex: Salário, Alimentação, Transporte..."
                [class.is-invalid]="name.invalid && (name.dirty || name.touched)"
                autocomplete="off"
              />
              @if (name.invalid && (name.dirty || name.touched)) {
                <div class="form-error">Nome é obrigatório (máx. 50 caracteres).</div>
              }
            </div>

            <div class="mb-3">
              <label class="form-label">Tipo</label>
              <div class="btn-group w-100" role="group" aria-label="Tipo de categoria">
                <input
                  type="radio"
                  class="btn-check"
                  name="categoryType"
                  id="typeIncome"
                  value="income"
                  formControlName="type"
                  autocomplete="off"
                />
                <label class="btn btn-outline-success" for="typeIncome">
                  <i class="bi bi-arrow-down-circle me-1" aria-hidden="true"></i> Receita
                </label>
                <input
                  type="radio"
                  class="btn-check"
                  name="categoryType"
                  id="typeExpense"
                  value="expense"
                  formControlName="type"
                  autocomplete="off"
                />
                <label class="btn btn-outline-danger" for="typeExpense">
                  <i class="bi bi-arrow-up-circle me-1" aria-hidden="true"></i> Despesa
                </label>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="saveCategory(modal)"
            [disabled]="categoryForm.invalid || savingCategory()"
          >
            @if (savingCategory()) {
              <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Salvando...
            } @else {
              <i class="bi bi-check-circle me-2" aria-hidden="true"></i> {{ editingCategory() ? 'Atualizar' : 'Criar' }}
            }
          </button>
        </div>
      </ng-template>

      <!-- Delete Confirmation Modal -->
      <ng-template #deleteModal let-modal>
        <div class="modal-header">
          <h5 class="modal-title">Excluir categoria</h5>
          <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body">
          <p>Tem certeza que deseja excluir a categoria <strong>{{ categoryToDelete()?.name }}</strong>?</p>
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
            Transações associadas a esta categoria <strong>não serão excluídas</strong>, apenas ficarão sem categoria.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
          <button
            type="button"
            class="btn btn-danger"
            (click)="deleteCategory(modal)"
            [disabled]="deletingCategoryId() === categoryToDelete()?.id"
          >
            @if (deletingCategoryId() === categoryToDelete()?.id) {
              <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
            } @else {
              Excluir
            }
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .categories-page {
      animation: fadeIn var(--transition-normal) ease;
    }

    .avatar-circle {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .category-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
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

    @media (max-width: 767.98px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .page-header > div {
        text-align: center;
      }
    }
  `]
})
export class CategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryApi = inject(CategoryApi);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);

  // Signals
  readonly categories = signal<Category[]>([]);
  readonly loadingCategories = signal(false);
  readonly savingCategory = signal(false);
  readonly deletingCategoryId = signal<string | null>(null);
  readonly editingCategory = signal<Category | null>(null);
  readonly categoryToDelete = signal<Category | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  @ViewChild('categoryModal', { static: false }) categoryModalRef!: any;
  @ViewChild('deleteModal', { static: false }) deleteModalRef!: any;

  // Computed
  readonly incomeCategories = computed(() =>
    this.categories().filter(c => c.type === 'income')
  );

  readonly expenseCategories = computed(() =>
    this.categories().filter(c => c.type === 'expense')
  );

  readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    type: ['expense' as 'income' | 'expense', Validators.required],
  });

  get name() { return this.categoryForm.controls.name; }

  ngOnInit(): void {
    this.loadCategories();
  }

  private async loadCategories(): Promise<void> {
    this.loadingCategories.set(true);
    this.errorMessage.set(null);
    try {
      const response = await this.categoryApi.getAll().toPromise();
      this.categories.set(response?.categories ?? []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      this.errorMessage.set('Não foi possível carregar as categorias.');
    } finally {
      this.loadingCategories.set(false);
    }
  }

  openCreateModal(prefillType?: 'income' | 'expense'): void {
    this.editingCategory.set(null);
    this.categoryForm.reset({
      name: '',
      type: prefillType ?? 'expense',
    });
    this.modalService.open(this.categoryModalRef, { centered: true });
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      type: category.type,
    });
    this.modalService.open(this.categoryModalRef, { centered: true });
  }

  async saveCategory(modal: any): Promise<void> {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.savingCategory.set(true);
    this.errorMessage.set(null);
    try {
      const dto: CreateCategoryDto = this.categoryForm.getRawValue();
      const editing = this.editingCategory();

      if (editing) {
        await this.categoryApi.update(editing.id, dto).toPromise();
        this.toastService.success('Categoria atualizada com sucesso.');
      } else {
        await this.categoryApi.create(dto).toPromise();
        this.toastService.success('Categoria criada com sucesso.');
      }

      modal.close();
      await this.loadCategories();
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      this.errorMessage.set('Não foi possível salvar a categoria.');
    } finally {
      this.savingCategory.set(false);
    }
  }

  confirmDeleteCategory(category: Category): void {
    this.categoryToDelete.set(category);
    this.modalService.open(this.deleteModalRef, { centered: true });
  }

  async deleteCategory(modal: any): Promise<void> {
    const category = this.categoryToDelete();
    if (!category) return;

    this.deletingCategoryId.set(category.id);
    try {
      await this.categoryApi.deleteCategory(category.id).toPromise();
      this.toastService.success('Categoria excluída com sucesso.');
      modal.close();
      await this.loadCategories();
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      this.toastService.error('Não foi possível excluir a categoria.');
    } finally {
      this.deletingCategoryId.set(null);
      this.categoryToDelete.set(null);
    }
  }
}
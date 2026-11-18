import { Component, signal, computed, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModalModule, NgbModal, NgbAlertModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CategoryApi, Category, CreateCategoryDto, CategoriesResponse } from '@core/api/category.api';
import { ToastService } from '@shared/services/toast.service';

// Lista de ícones Bootstrap Icons disponíveis
const AVAILABLE_ICONS = [
  'bi-tag', 'bi-egg-fried', 'bi-cart', 'bi-bus-front', 'bi-fuel-pump',
  'bi-heart-pulse', 'bi-book', 'bi-controller', 'bi-credit-card', 'bi-bag',
  'bi-house', 'bi-airplane', 'bi-gem', 'bi-tools', 'bi-arrow-left-right',
  'bi-cash-stack', 'bi-graph-up', 'bi-arrow-return-left', 'bi-gift',
  'bi-cup-hot', 'bi-pizza', 'bi-car-front', 'bi-truck', 'bi-bicycle',
  'bi-phone', 'bi-laptop', 'bi-tv', 'bi-headphones', 'bi-camera',
  'bi-music-note', 'bi-film', 'bi-gamepad', 'bi-dumbbell', 'bi-flower',
  'bi-palette', 'bi-briefcase', 'bi-bank', 'bi-piggy-bank', 'bi-coin',
  'bi-currency-dollar', 'bi-currency-euro', 'bi-wallet', 'bi-receipt',
  'bi-file-earmark-text', 'bi-calendar', 'bi-clock', 'bi-alarm',
  'bi-lightning', 'bi-droplet', 'bi-snow', 'bi-sun', 'bi-moon',
  'bi-cloud', 'bi-umbrella', 'bi-tree', 'bi-leaf', 'bi-flower',
  'bi-paw', 'bi-heart', 'bi-star', 'bi-trophy', 'bi-medal',
  'bi-award', 'bi-gift', 'bi-balloon', 'bi-cake', 'bi-party-popper'
];

// Cores predefinidas
const PRESET_COLORS = [
  '#DC3545', '#FF6B6B', '#FF8E72', '#FFA56B', '#FFD166',
  '#06D6A0', '#28A745', '#4ECDC4', '#118AB2', '#073B4C',
  '#6F42C1', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  '#6C757D', '#495057', '#343A40', '#212529', '#000000'
];

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
                        <div class="category-icon d-flex align-items-center justify-content-center rounded"
                             style="width: 36px; height: 36px;"
                             [style.background-color]="cat.color + '20'"
                             [style.color]="cat.color">
                          <i [class]="cat.icon" aria-hidden="true"></i>
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
                        <div class="category-icon d-flex align-items-center justify-content-center rounded"
                             style="width: 36px; height: 36px;"
                             [style.background-color]="cat.color + '20'"
                             [style.color]="cat.color">
                          <i [class]="cat.icon" aria-hidden="true"></i>
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
                  (change)="onTypeChange('income')"
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
                  (change)="onTypeChange('expense')"
                />
                <label class="btn btn-outline-danger" for="typeExpense">
                  <i class="bi bi-arrow-up-circle me-1" aria-hidden="true"></i> Despesa
                </label>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Ícone</label>
              <div class="icon-picker">
                @for (icon of availableIcons; track icon) {
                  <button
                    type="button"
                    class="icon-option"
                    [class.selected]="icon === iconControl.value"
                    (click)="iconControl.setValue(icon)"
                    [attr.aria-label]="icon"
                    [attr.aria-pressed]="icon === iconControl.value"
                  >
                    <i [class]="icon" aria-hidden="true"></i>
                  </button>
                }
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Cor</label>
              <div class="color-picker">
                @for (color of presetColors; track color) {
                  <button
                    type="button"
                    class="color-option"
                    [class.selected]="color === colorControl.value"
                    (click)="colorControl.setValue(color)"
                    [style.background-color]="color"
                    [attr.aria-label]="'Cor ' + color"
                    [attr.aria-pressed]="color === colorControl.value"
                  ></button>
                }
              </div>
              <div class="mt-2">
                <label for="customColor" class="form-label small">Ou escolha uma cor personalizada:</label>
                <input
                  type="color"
                  id="customColor"
                  class="form-control form-control-color"
                  formControlName="color"
                  style="width: 60px; height: 38px;"
                  [value]="colorControl.value"
                  (input)="colorControl.setValue($event.target.value)"
                />
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

    /* Icon Picker */
    .icon-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
      padding: 0.5rem 0;
    }

    .icon-option {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 2px solid var(--orvix-border-color);
      border-radius: 8px;
      background: var(--orvix-surface);
      color: var(--orvix-text-primary);
      font-size: 1.25rem;
      transition: all var(--transition-fast) ease;
    }

    .icon-option:hover {
      border-color: var(--orvix-primary);
      transform: scale(1.05);
    }

    .icon-option.selected {
      border-color: var(--orvix-primary);
      background: var(--orvix-primary);
      color: white;
    }

    .icon-option:focus-visible {
      outline: 2px solid var(--orvix-primary);
      outline-offset: 2px;
    }

    /* Color Picker */
    .color-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .color-option {
      width: 32px;
      height: 32px;
      border: 2px solid transparent;
      border-radius: 50%;
      cursor: pointer;
      transition: all var(--transition-fast) ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .color-option:hover {
      transform: scale(1.15);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .color-option.selected {
      border-color: var(--orvix-text-primary);
      box-shadow: 0 0 0 2px var(--orvix-surface), 0 0 0 4px var(--orvix-primary);
    }

    .color-option:focus-visible {
      outline: 2px solid var(--orvix-primary);
      outline-offset: 2px;
    }

    .form-control-color {
      border: none;
      padding: 0;
      background: none;
      cursor: pointer;
    }

    .form-control-color::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .form-control-color::-webkit-color-swatch {
      border: 2px solid var(--orvix-border-color);
      border-radius: 8px;
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

      .icon-picker {
        justify-content: center;
      }

      .color-picker {
        justify-content: center;
      }
    }
  `]
})
export class CategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryApi = inject(CategoryApi);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);

  // Available icons and colors for the picker
  readonly availableIcons = AVAILABLE_ICONS;
  readonly presetColors = PRESET_COLORS;

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
    icon: ['bi-tag' as string, Validators.required],
    color: ['#DC3545' as string, Validators.required],
  });

  get name() { return this.categoryForm.controls.name; }
  get iconControl() { return this.categoryForm.controls.icon; }
  get colorControl() { return this.categoryForm.controls.color; }

  onTypeChange(type: 'income' | 'expense'): void {
    // Atualiza a cor padrão ao mudar o tipo
    const currentColor = this.colorControl.value;
    const isDefaultIncomeColor = currentColor === '#28A745' || currentColor === '#4ECDC4' || currentColor === '#06D6A0';
    const isDefaultExpenseColor = currentColor === '#DC3545' || currentColor === '#FF6B6B' || currentColor === '#FF8E72';

    if (type === 'income' && isDefaultExpenseColor) {
      this.colorControl.setValue('#28A745');
    } else if (type === 'expense' && isDefaultIncomeColor) {
      this.colorControl.setValue('#DC3545');
    }
  }

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
    const defaultColor = prefillType === 'income' ? '#28A745' : '#DC3545';
    this.categoryForm.reset({
      name: '',
      type: prefillType ?? 'expense',
      icon: 'bi-tag',
      color: defaultColor,
    });
    this.modalService.open(this.categoryModalRef, { centered: true, size: 'lg' });
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      type: category.type,
      icon: category.icon || 'bi-tag',
      color: category.color || (category.type === 'income' ? '#28A745' : '#DC3545'),
    });
    this.modalService.open(this.categoryModalRef, { centered: true, size: 'lg' });
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
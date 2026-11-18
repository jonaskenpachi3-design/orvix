import { Component, signal, computed, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModalModule, NgbModal, NgbAlertModule, NgbTooltipModule, NgbDatepickerModule, NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { GoalApi, Goal, CreateGoalDto, GoalsResponse, GoalContribution, AddContributionDto, AddRecurringContributionsDto } from '@core/api/goal.api';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbAlertModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    NgbInputDatepicker,
  ],
  template: `
    <div class="goals-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">METAS</span>
          <h1>Metas financeiras</h1>
          <p class="text-muted">Acompanhe o progresso dos seus objetivos e conquiste suas metas.</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="openCreateModal()">
          <i class="bi bi-plus-circle me-2" aria-hidden="true"></i> Nova meta
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

      <!-- Goals Grid -->
      @if (loadingGoals()) {
        <div class="loading-state text-center py-5">
          <div class="spinner mx-auto"></div>
          <p class="mt-2 text-muted">Carregando metas...</p>
        </div>
      } @else if (goals().length === 0) {
        <div class="empty-state text-center py-5">
          <div class="empty-icon-wrapper mb-3">
            <i class="bi bi-bullseye empty-icon" aria-hidden="true"></i>
          </div>
          <h3 class="empty-title">Nenhuma meta cadastrada</h3>
          <p class="empty-description">Crie sua primeira meta financeira para começar a acompanhar seu progresso.</p>
          <button type="button" class="btn btn-primary mt-2" (click)="openCreateModal()">
            <i class="bi bi-plus me-1" aria-hidden="true"></i> Criar meta
          </button>
        </div>
      } @else {
        <div class="row g-4">
          @for (goal of goals(); track goal.id) {
            <div class="col-12 col-md-6 col-xl-4">
              <section class="card goal-card h-100">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex align-items-start justify-content-between mb-3">
                    <div class="flex-grow-1">
                      <h5 class="card-title mb-1">{{ goal.name }}</h5>
                      @if (goal.deadline) {
                        <small class="text-muted">
                          <i class="bi bi-calendar3 me-1" aria-hidden="true"></i>
                          Prazo: {{ formatDate(goal.deadline) }}
                          @if (isOverdue(goal)) {
                            <span class="text-danger ms-1">(vencida)</span>
                          }
                        </small>
                      }
                    </div>
                    <div class="dropdown ms-2">
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        [attr.aria-label]="'Opções para ' + goal.name"
                      >
                        <i class="bi bi-three-dots" aria-hidden="true"></i>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                          <button
                            type="button"
                            class="dropdown-item"
                            (click)="openContributeModal(goal)"
                          >
                            <i class="bi bi-cash-stack me-2" aria-hidden="true"></i> Contribuir (único)
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            class="dropdown-item"
                            (click)="openRecurringModal(goal)"
                          >
                            <i class="bi bi-calendar2-plus me-2" aria-hidden="true"></i> Parcelar/Recorrente
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            class="dropdown-item"
                            (click)="openHistoryModal(goal)"
                          >
                            <i class="bi bi-clock-history me-2" aria-hidden="true"></i> Ver histórico
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            class="dropdown-item"
                            (click)="openEditModal(goal)"
                          >
                            <i class="bi bi-pencil me-2" aria-hidden="true"></i> Editar
                          </button>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                          <button
                            type="button"
                            class="dropdown-item text-danger"
                            (click)="confirmDeleteGoal(goal)"
                            [disabled]="deletingGoalId() === goal.id"
                          >
                            @if (deletingGoalId() === goal.id) {
                              <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Excluindo...
                            } @else {
                              <i class="bi bi-trash me-2" aria-hidden="true"></i> Excluir
                            }
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- Progress Section -->
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="fw-medium">{{ formatCurrency(goal.current_amount) }}</span>
                      <span class="text-muted small">{{ formatCurrency(goal.target_amount) }}</span>
                    </div>
                    <div class="progress" style="height: 10px;" role="progressbar"
                      [attr.aria-valuenow]="getProgress(goal)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      [attr.aria-label]="'Progresso da meta ' + goal.name + ': ' + getProgress(goal) + '%'">
                      <div
                        class="progress-bar"
                        [class.bg-success]="getProgress(goal) >= 100"
                        [class.bg-warning]="getProgress(goal) < 100"
                        [style.width.%]="getProgress(goal) > 100 ? 100 : getProgress(goal)"
                        [attr.aria-valuenow]="getProgress(goal)"
                      ></div>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                      <small class="text-muted">{{ getProgress(goal) }}% concluído</small>
                      <small class="text-muted">{{ formatCurrency(getRemaining(goal)) }} restante</small>
                    </div>
                  </div>

                  <!-- Status Badge -->
                  <div class="mt-auto pt-3 border-top">
                    @if (getProgress(goal) >= 100) {
                      <span class="badge bg-success-subtle text-success w-100 d-flex align-items-center justify-content-center py-2">
                        <i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
                        Meta atingida! 🎉
                      </span>
                    } @else if (isOverdue(goal)) {
                      <span class="badge bg-danger-subtle text-danger w-100 d-flex align-items-center justify-content-center py-2">
                        <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
                        Prazo vencido
                      </span>
                    } @else {
                      <span class="badge bg-primary-subtle text-primary w-100 d-flex align-items-center justify-content-center py-2">
                        <i class="bi bi-clock me-2" aria-hidden="true"></i>
                        Em andamento
                      </span>
                    }
                  </div>
                </div>
              </section>
            </div>
          }
        </div>
      }
    </div>

    <!-- Create/Edit Goal Modal -->
    <ng-template #goalModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">{{ editingGoal() ? 'Editar meta' : 'Nova meta' }}</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form [formGroup]="goalForm" (ngSubmit)="saveGoal(modal)">
          <div class="mb-3">
            <label for="goalName" class="form-label">Nome da meta</label>
            <input
              type="text"
              id="goalName"
              class="form-control"
              formControlName="name"
              placeholder="Ex: Viagem, Reserva de emergência, Carro novo..."
              [class.is-invalid]="name.invalid && (name.dirty || name.touched)"
              autocomplete="off"
            />
            @if (name.invalid && (name.dirty || name.touched)) {
              <div class="form-error">Nome é obrigatório (máx. 100 caracteres).</div>
            }
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label for="targetAmount" class="form-label">Valor alvo</label>
              <input
                type="number"
                id="targetAmount"
                class="form-control"
                formControlName="targetAmount"
                placeholder="0,00"
                step="0.01"
                min="0.01"
                [class.is-invalid]="targetAmount.invalid && (targetAmount.dirty || targetAmount.touched)"
              />
              @if (targetAmount.invalid && (targetAmount.dirty || targetAmount.touched)) {
                <div class="form-error">Informe um valor alvo válido.</div>
              }
            </div>

            <div class="col-md-6">
              <label for="currentAmount" class="form-label">Valor atual</label>
              <input
                type="number"
                id="currentAmount"
                class="form-control"
                formControlName="currentAmount"
                placeholder="0,00"
                step="0.01"
                min="0"
                [class.is-invalid]="currentAmount.invalid && (currentAmount.dirty || currentAmount.touched)"
              />
              @if (currentAmount.invalid && (currentAmount.dirty || currentAmount.touched)) {
                <div class="form-error">Informe um valor válido.</div>
              }
            </div>
          </div>

          <div class="mb-3">
            <label for="deadline" class="form-label">Prazo (opcional)</label>
            <div class="input-group">
              <input
                type="text"
                id="deadline"
                class="form-control"
                formControlName="deadline"
                placeholder="DD/MM/AAAA"
                ngbDatepicker
                #dp="ngbDatepicker"
                [minDate]="today"
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
            <small class="text-muted">Deixe em branco para meta sem prazo definido.</small>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="saveGoal(modal)"
          [disabled]="goalForm.invalid || savingGoal()"
        >
          @if (savingGoal()) {
            <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Salvando...
          } @else {
            <i class="bi bi-check-circle me-2" aria-hidden="true"></i> {{ editingGoal() ? 'Atualizar' : 'Criar' }}
          }
        </button>
      </div>
    </ng-template>

    <!-- Contribute Modal (Único) -->
    <ng-template #contributeModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Contribuir para "{{ contributingGoal()?.name }}"</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form [formGroup]="contributeForm" (ngSubmit)="addContribution(modal)">
          <div class="mb-3">
            <label for="contributionAmount" class="form-label">Valor da contribuição</label>
            <input
              type="number"
              id="contributionAmount"
              class="form-control"
              formControlName="amount"
              placeholder="0,00"
              step="0.01"
              min="0.01"
              [class.is-invalid]="contributionAmount.invalid && (contributionAmount.dirty || contributionAmount.touched)"
            />
            @if (contributionAmount.invalid && (contributionAmount.dirty || contributionAmount.touched)) {
              <div class="form-error">Informe um valor válido.</div>
            }
          </div>

          <div class="mb-3">
            <label for="contributionDescription" class="form-label">Descrição (opcional)</label>
            <input
              type="text"
              id="contributionDescription"
              class="form-control"
              formControlName="description"
              placeholder="Ex: Salário, Freelance, Venda..."
            />
          </div>

          <div class="mb-3">
            <label for="contributionDate" class="form-label">Data (opcional)</label>
            <div class="input-group">
              <input
                type="text"
                id="contributionDate"
                class="form-control"
                formControlName="contributionDate"
                placeholder="DD/MM/AAAA"
                ngbDatepicker
                #cdp="ngbDatepicker"
              />
              <button
                class="btn btn-outline"
                type="button"
                (click)="cdp.toggle()"
                aria-label="Abrir calendário"
              >
                <i class="bi bi-calendar3" aria-hidden="true"></i>
              </button>
            </div>
            <small class="text-muted">Deixe em branco para usar a data de hoje.</small>
          </div>

          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2" aria-hidden="true"></i>
            Progresso atual: <strong>{{ contributingGoal() ? getProgress(contributingGoal()!) + '%' : '0%' }}</strong>
            ({{ contributingGoal() ? formatCurrency(contributingGoal()!.current_amount) : '0,00' }} de {{ contributingGoal() ? formatCurrency(contributingGoal()!.target_amount) : '0,00' }})
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-success"
          (click)="addContribution(modal)"
          [disabled]="contributeForm.invalid || savingContribution()"
        >
          @if (savingContribution()) {
            <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Adicionando...
          } @else {
            <i class="bi bi-plus-circle me-2" aria-hidden="true"></i> Adicionar contribuição
          }
        </button>
      </div>
    </ng-template>

    <!-- Recurring/Parcelado Modal -->
    <ng-template #recurringModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Parcelamento/Recorrência para "{{ recurringGoal()?.name }}"</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form [formGroup]="recurringForm" (ngSubmit)="addRecurringContributions(modal)">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label for="recurringAmount" class="form-label">Valor por parcela</label>
              <input
                type="number"
                id="recurringAmount"
                class="form-control"
                formControlName="amount"
                placeholder="0,00"
                step="0.01"
                min="0.01"
                [class.is-invalid]="recurringAmount.invalid && (recurringAmount.dirty || recurringAmount.touched)"
              />
              @if (recurringAmount.invalid && (recurringAmount.dirty || recurringAmount.touched)) {
                <div class="form-error">Informe um valor válido.</div>
              }
            </div>

            <div class="col-md-6">
              <label for="installmentsTotal" class="form-label">Número de parcelas</label>
              <input
                type="number"
                id="installmentsTotal"
                class="form-control"
                formControlName="installmentsTotal"
                placeholder="12"
                min="1"
                max="60"
                [class.is-invalid]="installmentsTotal.invalid && (installmentsTotal.dirty || installmentsTotal.touched)"
              />
              @if (installmentsTotal.invalid && (installmentsTotal.dirty || installmentsTotal.touched)) {
                <div class="form-error">Informe 1 a 60 parcelas.</div>
              }
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label for="firstDate" class="form-label">1º vencimento</label>
              <div class="input-group">
                <input
                  type="text"
                  id="firstDate"
                  class="form-control"
                  formControlName="firstDate"
                  placeholder="DD/MM/AAAA"
                  ngbDatepicker
                  #fdp="ngbDatepicker"
                  [class.is-invalid]="firstDate.invalid && (firstDate.dirty || firstDate.touched)"
                />
                <button
                  class="btn btn-outline"
                  type="button"
                  (click)="fdp.toggle()"
                  aria-label="Abrir calendário"
                >
                  <i class="bi bi-calendar3" aria-hidden="true"></i>
                </button>
              </div>
              @if (firstDate.invalid && (firstDate.dirty || firstDate.touched)) {
                <div class="form-error">Data do primeiro vencimento é obrigatória.</div>
              }
            </div>

            <div class="col-md-6">
              <label for="frequencyMonths" class="form-label">Frequência (meses)</label>
              <input
                type="number"
                id="frequencyMonths"
                class="form-control"
                formControlName="frequencyMonths"
                placeholder="1"
                min="1"
                max="12"
              />
              <small class="text-muted">1 = mensal, 2 = bimestral, etc.</small>
            </div>
          </div>

          <div class="mb-3">
            <label for="recurringDescription" class="form-label">Descrição base (opcional)</label>
            <input
              type="text"
              id="recurringDescription"
              class="form-control"
              formControlName="description"
              placeholder="Ex: Parcela da meta Viagem"
            />
          </div>

          <!-- Preview -->
          @if (recurringPreview().length > 0) {
            <div class="alert alert-light border preview-card">
              <h6 class="mb-3"><i class="bi bi-list-ol me-2" aria-hidden="true"></i> Prévia das parcelas</h6>
              <div class="preview-list" style="max-height: 200px; overflow-y: auto;">
                @for (item of recurringPreview(); track item.number) {
                  <div class="preview-item d-flex align-items-center justify-content-between py-2 px-3 rounded border-bottom">
                    <span class="badge bg-primary-subtle text-primary fw-semibold">{{ item.number }}/{{ recurringForm.controls.installmentsTotal.value }}</span>
                    <div class="ms-3 flex-grow-1">
                      <div class="fw-medium">{{ recurringForm.controls.description.value || 'Parcela da meta' }}</div>
                      <small class="text-muted">{{ formatDate(item.dueDate) }}</small>
                    </div>
                    <span class="fw-semibold text-danger tabular-nums">{{ formatCurrency(item.amount) }}</span>
                  </div>
                }
              </div>
              <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <span class="fw-medium">Total</span>
                <span class="fw-bold text-danger tabular-nums">{{ formatCurrency((recurringForm.controls.amount.value || 0) * (recurringForm.controls.installmentsTotal.value || 0)) }}</span>
              </div>
            </div>
          }

          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
            <strong>Importante:</strong> As parcelas serão criadas como contribuições agendadas (tipo "installment").
            Elas aparecem no histórico e atualizam o valor atual da meta automaticamente.
            Você pode editar ou excluir parcelas individuais no histórico.
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="addRecurringContributions(modal)"
          [disabled]="recurringForm.invalid || savingRecurring()"
        >
          @if (savingRecurring()) {
            <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Criando parcelas...
          } @else {
            <i class="bi bi-calendar2-plus me-2" aria-hidden="true"></i> Criar parcelamento
          }
        </button>
      </div>
    </ng-template>

    <!-- History Modal -->
    <ng-template #historyModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Histórico de contribuições - "{{ historyGoal()?.name }}"</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        @if (loadingHistory()) {
          <div class="loading-state text-center py-4">
            <div class="spinner mx-auto"></div>
            <p class="mt-2 text-muted">Carregando histórico...</p>
          </div>
        } @else if (goalContributions().length === 0) {
          <div class="empty-state text-center py-4">
            <i class="bi bi-clock-history empty-icon" aria-hidden="true" style="font-size: 2.5rem;"></i>
            <h6 class="mt-2">Nenhuma contribuição registrada</h6>
            <p class="text-muted small">Use "Contribuir" ou "Parcelar/Recorrente" para adicionar aportes.</p>
          </div>
        } @else {
          <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
            <table class="table table-sm table-hover mb-0">
              <thead class="sticky-top">
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (contrib of goalContributions(); track contrib.id) {
                  <tr>
                    <td>{{ formatDate(contrib.contribution_date) }}</td>
                    <td class="fw-semibold text-danger tabular-nums">{{ formatCurrency(contrib.amount) }}</td>
                    <td>
                      <span class="badge"
                        [class]="getContribTypeClass(contrib.type)">
                        {{ getContribTypeLabel(contrib.type) }}
                        @if (contrib.type === 'installment' && contrib.installment_number && contrib.installments_total) {
                          <span class="ms-1">{{ contrib.installment_number }}/{{ contrib.installments_total }}</span>
                        }
                      </span>
                    </td>
                    <td>{{ contrib.description || '—' }}</td>
                    <td class="text-end">
                      <div class="btn-group btn-group-sm">
                        <button
                          type="button"
                          class="btn btn-outline"
                          (click)="openEditContributionModal(contrib)"
                          title="Editar"
                        >
                          <i class="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline text-danger"
                          (click)="confirmDeleteContribution(contrib)"
                          title="Excluir"
                        >
                          <i class="bi bi-trash" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <span class="fw-medium">Total contribuído</span>
            <span class="fw-bold text-danger tabular-nums">{{ formatCurrency(totalContributed()) }}</span>
          </div>
        }
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Fechar</button>
      </div>
    </ng-template>

    <!-- Edit Contribution Modal -->
    <ng-template #editContributionModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Editar contribuição</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <form [formGroup]="editContributionForm" (ngSubmit)="saveEditContribution(modal)">
          <div class="mb-3">
            <label for="editAmount" class="form-label">Valor</label>
            <input
              type="number"
              id="editAmount"
              class="form-control"
              formControlName="amount"
              placeholder="0,00"
              step="0.01"
              min="0.01"
              [class.is-invalid]="editAmount.invalid && (editAmount.dirty || editAmount.touched)"
            />
            @if (editAmount.invalid && (editAmount.dirty || editAmount.touched)) {
              <div class="form-error">Informe um valor válido.</div>
            }
          </div>

          <div class="mb-3">
            <label for="editDescription" class="form-label">Descrição</label>
            <input
              type="text"
              id="editDescription"
              class="form-control"
              formControlName="description"
              placeholder="Ex: Salário, Freelance..."
            />
          </div>

          <div class="mb-3">
            <label for="editDate" class="form-label">Data</label>
            <div class="input-group">
              <input
                type="text"
                id="editDate"
                class="form-control"
                formControlName="contributionDate"
                placeholder="DD/MM/AAAA"
                ngbDatepicker
                #edp="ngbDatepicker"
              />
              <button
                class="btn btn-outline"
                type="button"
                (click)="edp.toggle()"
                aria-label="Abrir calendário"
              >
                <i class="bi bi-calendar3" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="saveEditContribution(modal)"
          [disabled]="editContributionForm.invalid || savingEditContribution()"
        >
          @if (savingEditContribution()) {
            <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Salvando...
          } @else {
            <i class="bi bi-check-circle me-2" aria-hidden="true"></i> Salvar alterações
          }
        </button>
      </div>
    </ng-template>

    <!-- Delete Confirmation Modals -->
    <ng-template #deleteModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Excluir meta</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p>Tem certeza que deseja excluir a meta <strong>{{ goalToDelete()?.name }}</strong>?</p>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          Esta ação não pode ser desfeita. Todas as contribuições também serão removidas.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-danger"
          (click)="deleteGoal(modal)"
          [disabled]="deletingGoalId() === goalToDelete()?.id"
        >
          @if (deletingGoalId() === goalToDelete()?.id) {
            <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
          } @else {
            Excluir
          }
        </button>
      </div>
    </ng-template>

    <ng-template #deleteContributionModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Excluir contribuição</h5>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <p>Tem certeza que deseja excluir a contribuição de <strong>{{ formatCurrency(contributionToDelete()?.amount ?? 0) }}</strong>?</p>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          O valor será subtraído do progresso da meta. Esta ação não pode ser desfeita.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancelar</button>
        <button
          type="button"
          class="btn btn-danger"
          (click)="deleteContribution(modal)"
          [disabled]="deletingContributionId() === contributionToDelete()?.id"
        >
          @if (deletingContributionId() === contributionToDelete()?.id) {
            <span class="spinner spinner-sm me-1" aria-hidden="true"></span> Excluindo...
          } @else {
            Excluir
          }
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .goals-page {
      animation: fadeIn var(--transition-normal) ease;
    }

    .goal-card {
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }

    .goal-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--orvix-shadow-lg);
    }

    .empty-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: var(--orvix-primary-soft);
      color: var(--orvix-primary);
    }

    .empty-icon {
      font-size: 2.5rem;
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

    .progress {
      border-radius: 5px;
      overflow: hidden;
    }

    .progress-bar {
      transition: width 0.3s ease;
      border-radius: 5px;
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

    .table th {
      font-weight: 600;
      font-size: var(--font-size-caption);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--orvix-text-muted);
      border-bottom: 2px solid var(--orvix-border);
    }

    .table td {
      vertical-align: middle;
      font-size: var(--font-size-small);
    }

    .table-hover tbody tr:hover {
      background-color: var(--orvix-surface-2);
    }

    .btn-group-sm .btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
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

      .modal-body {
        padding: 1rem;
      }
    }
  `]
})
export class GoalsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly goalApi = inject(GoalApi);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);

  // Signals
  readonly goals = signal<Goal[]>([]);
  readonly loadingGoals = signal(false);
  readonly savingGoal = signal(false);
  readonly savingContribution = signal(false);
  readonly savingRecurring = signal(false);
  readonly savingEditContribution = signal(false);
  readonly deletingGoalId = signal<string | null>(null);
  readonly deletingContributionId = signal<string | null>(null);
  readonly editingGoal = signal<Goal | null>(null);
  readonly contributingGoal = signal<Goal | null>(null);
  readonly recurringGoal = signal<Goal | null>(null);
  readonly historyGoal = signal<Goal | null>(null);
  readonly goalToDelete = signal<Goal | null>(null);
  readonly contributionToDelete = signal<GoalContribution | null>(null);
  readonly editingContribution = signal<GoalContribution | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly loadingHistory = signal(false);
  readonly goalContributions = signal<GoalContribution[]>([]);

  @ViewChild('goalModal', { static: false }) goalModalRef!: any;
  @ViewChild('contributeModal', { static: false }) contributeModalRef!: any;
  @ViewChild('recurringModal', { static: false }) recurringModalRef!: any;
  @ViewChild('historyModal', { static: false }) historyModalRef!: any;
  @ViewChild('editContributionModal', { static: false }) editContributionModalRef!: any;
  @ViewChild('deleteModal', { static: false }) deleteModalRef!: any;
  @ViewChild('deleteContributionModal', { static: false }) deleteContributionModalRef!: any;

  readonly today = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  };

  readonly goalForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    targetAmount: [0, [Validators.required, Validators.min(0.01)]],
    currentAmount: [0, [Validators.min(0)]],
    deadline: ['' as string | { year: number; month: number; day: number }],
  });

  readonly contributeForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    contributionDate: ['' as string | { year: number; month: number; day: number }],
  });

  readonly recurringForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    installmentsTotal: [1, [Validators.required, Validators.min(1), Validators.max(60)]],
    firstDate: ['' as string | { year: number; month: number; day: number }, [Validators.required]],
    frequencyMonths: [1, [Validators.min(1), Validators.max(12)]],
    description: [''],
  });

  readonly editContributionForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    contributionDate: ['' as string | { year: number; month: number; day: number }],
  });

  get name() { return this.goalForm.controls.name; }
  get targetAmount() { return this.goalForm.controls.targetAmount; }
  get currentAmount() { return this.goalForm.controls.currentAmount; }
  get contributionAmount() { return this.contributeForm.controls.amount; }
  get recurringAmount() { return this.recurringForm.controls.amount; }
  get installmentsTotal() { return this.recurringForm.controls.installmentsTotal; }
  get firstDate() { return this.recurringForm.controls.firstDate; }
  get editAmount() { return this.editContributionForm.controls.amount; }

  // Preview para parcelamento recorrente
  readonly recurringPreview = computed(() => {
    const amount = this.recurringAmount.value;
    const installments = this.installmentsTotal.value;
    const firstDateRaw = this.firstDate.value;

    if (!amount || !installments || !firstDateRaw || amount <= 0 || installments <= 0) {
      return [] as { number: number; dueDate: string; amount: number }[];
    }

    const firstDate = this.formatNgbDateForCalc(firstDateRaw);
    const items: { number: number; dueDate: string; amount: number }[] = [];

    for (let i = 1; i <= installments; i++) {
      const dueDate = this.calculateDueDate(firstDate, i);
      items.push({
        number: i,
        dueDate,
        amount,
      });
    }

    return items;
  });

  readonly totalContributed = computed(() =>
    this.goalContributions().reduce((sum, c) => sum + c.amount, 0)
  );

  ngOnInit(): void {
    this.loadGoals();
    this.setDefaultFirstDate();
    this.setupRecurringPreviewListener();
  }

  private setupRecurringPreviewListener(): void {
    ['amount', 'installmentsTotal', 'firstDate'].forEach(field => {
      this.recurringForm.get(field)?.valueChanges.subscribe(() => {});
    });
  }

  private formatNgbDateForCalc(dateValue: string | { year: number; month: number; day: number }): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
  }

  private calculateDueDate(firstDueDate: string, installmentIndex: number): string {
    const ngbDate = this.parseNgbDate(firstDueDate);
    if (!ngbDate) return firstDueDate;

    const date = new Date(Date.UTC(ngbDate.year, ngbDate.month - 1, ngbDate.day));
    // Usa frequencyMonths do form
    const freq = this.recurringForm.controls.frequencyMonths.value || 1;
    date.setUTCMonth(date.getUTCMonth() + (installmentIndex - 1) * freq);

    const originalDay = ngbDate.day;
    if (date.getUTCDate() !== originalDay) {
      date.setUTCDate(0);
    }

    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseNgbDate(value: string): { year: number; month: number; day: number } | null {
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

  private setDefaultFirstDate(): void {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const ngbDate = {
      year: nextMonth.getFullYear(),
      month: nextMonth.getMonth() + 1,
      day: nextMonth.getDate(),
    };
    // ngbDatepicker exige { year, month, day }; string ISO deixava o campo inválido
    this.firstDate.setValue(ngbDate);
    this.recurringForm.controls.frequencyMonths.setValue(1);
  }

  private async loadGoals(): Promise<void> {
    this.loadingGoals.set(true);
    this.errorMessage.set(null);
    try {
      const response = await this.goalApi.getAll().toPromise();
      this.goals.set(response?.goals ?? []);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
      this.errorMessage.set('Não foi possível carregar as metas.');
    } finally {
      this.loadingGoals.set(false);
    }
  }

  getProgress(goal: Goal): number {
    if (goal.target_amount === 0) return 0;
    return Math.round((goal.current_amount / goal.target_amount) * 100);
  }

  getRemaining(goal: Goal): number {
    return Math.max(0, goal.target_amount - goal.current_amount);
  }

  isOverdue(goal: Goal): boolean {
    if (!goal.deadline) return false;
    const deadline = new Date(goal.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today && this.getProgress(goal) < 100;
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

  getContribTypeClass(type: string): string {
    switch (type) {
      case 'installment': return 'bg-primary-subtle text-primary';
      case 'recurring': return 'bg-info-subtle text-info';
      default: return 'bg-secondary-subtle text-secondary';
    }
  }

  getContribTypeLabel(type: string): string {
    switch (type) {
      case 'installment': return 'Parcelada';
      case 'recurring': return 'Recorrente';
      default: return 'Manual';
    }
  }

  // --- Modals ---

  openCreateModal(): void {
    this.editingGoal.set(null);
    this.goalForm.reset({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      deadline: '',
    });
    this.modalService.open(this.goalModalRef, { centered: true, size: 'lg' });
  }

  openEditModal(goal: Goal): void {
    this.editingGoal.set(goal);
    this.goalForm.patchValue({
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      deadline: goal.deadline ? this.formatDateForInput(goal.deadline) : '',
    });
    this.modalService.open(this.goalModalRef, { centered: true, size: 'lg' });
  }

  private formatDateForApi(dateValue: string | { year: number; month: number; day: number }): string {
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
  }

  openContributeModal(goal: Goal): void {
    this.contributingGoal.set(goal);
    this.contributeForm.reset({
      amount: 0,
      description: '',
      contributionDate: '',
    });
    this.modalService.open(this.contributeModalRef, { centered: true });
  }

  openRecurringModal(goal: Goal): void {
    this.recurringGoal.set(goal);
    this.recurringForm.reset({
      amount: 0,
      installmentsTotal: 1,
      firstDate: '',
      frequencyMonths: 1,
      description: '',
    });
    this.setDefaultFirstDate();
    this.modalService.open(this.recurringModalRef, { centered: true, size: 'lg' });
  }

  async openHistoryModal(goal: Goal): Promise<void> {
    this.historyGoal.set(goal);
    this.loadingHistory.set(true);
    this.goalContributions.set([]);
    try {
      const response = await this.goalApi.getContributions(goal.id).toPromise();
      this.goalContributions.set(response?.contributions ?? []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      this.toastService.error('Não foi possível carregar o histórico.');
    } finally {
      this.loadingHistory.set(false);
    }
    this.modalService.open(this.historyModalRef, { centered: true, size: 'lg' });
  }

  private formatDateForInput(dateString: string): { year: number; month: number; day: number } {
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  async saveGoal(modal: any): Promise<void> {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }

    this.savingGoal.set(true);
    this.errorMessage.set(null);
    try {
      const formValue = this.goalForm.getRawValue();
      const dto: CreateGoalDto = {
        name: formValue.name,
        targetAmount: formValue.targetAmount,
        currentAmount: formValue.currentAmount,
        deadline: formValue.deadline ? this.formatDateForApi(formValue.deadline) : undefined,
      };

      const editing = this.editingGoal();

      if (editing) {
        await this.goalApi.update(editing.id, dto).toPromise();
        this.toastService.success('Meta atualizada com sucesso.');
      } else {
        await this.goalApi.create(dto).toPromise();
        this.toastService.success('Meta criada com sucesso.');
      }

      modal.close();
      await this.loadGoals();
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
      this.errorMessage.set('Não foi possível salvar a meta.');
    } finally {
      this.savingGoal.set(false);
    }
  }

  async addContribution(modal: any): Promise<void> {
    if (this.contributeForm.invalid || !this.contributingGoal()) {
      this.contributeForm.markAllAsTouched();
      return;
    }

    this.savingContribution.set(true);
    try {
      const goal = this.contributingGoal()!;
      const formValue = this.contributeForm.getRawValue();
      const dto: AddContributionDto = {
        amount: formValue.amount,
        description: formValue.description || undefined,
        contributionDate: formValue.contributionDate ? this.formatDateForApi(formValue.contributionDate) : undefined,
        type: 'manual',
      };

      await this.goalApi.addContribution(goal.id, dto).toPromise();
      this.toastService.success('Contribuição adicionada com sucesso.');
      modal.close();
      await this.loadGoals();
    } catch (err) {
      console.error('Erro ao adicionar contribuição:', err);
      this.toastService.error('Não foi possível adicionar a contribuição.');
    } finally {
      this.savingContribution.set(false);
      this.contributingGoal.set(null);
    }
  }

  async addRecurringContributions(modal: any): Promise<void> {
    if (this.recurringForm.invalid || !this.recurringGoal()) {
      this.recurringForm.markAllAsTouched();
      return;
    }

    this.savingRecurring.set(true);
    try {
      const goal = this.recurringGoal()!;
      const formValue = this.recurringForm.getRawValue();
      const dto: AddRecurringContributionsDto = {
        amount: formValue.amount,
        description: formValue.description || undefined,
        firstDate: this.formatNgbDateForCalc(formValue.firstDate),
        installmentsTotal: formValue.installmentsTotal,
        frequencyMonths: formValue.frequencyMonths,
      };

      await this.goalApi.addRecurringContributions(goal.id, dto).toPromise();
      this.toastService.success(`${formValue.installmentsTotal} parcelas criadas com sucesso.`);
      modal.close();
      await this.loadGoals();
    } catch (err) {
      console.error('Erro ao criar parcelamento:', err);
      this.toastService.error('Não foi possível criar o parcelamento.');
    } finally {
      this.savingRecurring.set(false);
      this.recurringGoal.set(null);
    }
  }

  // --- Edit Contribution ---

  openEditContributionModal(contrib: GoalContribution): void {
    this.editingContribution.set(contrib);
    this.editContributionForm.patchValue({
      amount: contrib.amount,
      description: contrib.description || '',
      contributionDate: contrib.contribution_date ? this.formatDateForInput(contrib.contribution_date) : '',
    });
    this.modalService.open(this.editContributionModalRef, { centered: true });
  }

  async saveEditContribution(modal: any): Promise<void> {
    if (this.editContributionForm.invalid || !this.editingContribution() || !this.historyGoal()) {
      this.editContributionForm.markAllAsTouched();
      return;
    }

    this.savingEditContribution.set(true);
    try {
      const contrib = this.editingContribution()!;
      const goal = this.historyGoal()!;
      const formValue = this.editContributionForm.getRawValue();
      const dto = {
        amount: formValue.amount,
        description: formValue.description || undefined,
        contributionDate: formValue.contributionDate ? this.formatDateForApi(formValue.contributionDate) : undefined,
      };

      await this.goalApi.updateContribution(goal.id, contrib.id, dto).toPromise();
      this.toastService.success('Contribuição atualizada com sucesso.');
      modal.close();
      // Recarregar histórico
      await this.openHistoryModal(goal);
    } catch (err) {
      console.error('Erro ao atualizar contribuição:', err);
      this.toastService.error('Não foi possível atualizar a contribuição.');
    } finally {
      this.savingEditContribution.set(false);
      this.editingContribution.set(null);
    }
  }

  // --- Delete Contribution ---

  confirmDeleteContribution(contrib: GoalContribution): void {
    this.contributionToDelete.set(contrib);
    this.modalService.open(this.deleteContributionModalRef, { centered: true });
  }

  async deleteContribution(modal: any): Promise<void> {
    const contrib = this.contributionToDelete();
    const goal = this.historyGoal();
    if (!contrib || !goal) return;

    this.deletingContributionId.set(contrib.id);
    try {
      await this.goalApi.deleteContribution(goal.id, contrib.id).toPromise();
      this.toastService.success('Contribuição excluída com sucesso.');
      modal.close();
      // Recarregar histórico
      await this.openHistoryModal(goal);
    } catch (err) {
      console.error('Erro ao excluir contribuição:', err);
      this.toastService.error('Não foi possível excluir a contribuição.');
    } finally {
      this.deletingContributionId.set(null);
      this.contributionToDelete.set(null);
    }
  }

  // --- Delete Goal ---

  confirmDeleteGoal(goal: Goal): void {
    this.goalToDelete.set(goal);
    this.modalService.open(this.deleteModalRef, { centered: true });
  }

  async deleteGoal(modal: any): Promise<void> {
    const goal = this.goalToDelete();
    if (!goal) return;

    this.deletingGoalId.set(goal.id);
    try {
      await this.goalApi.deleteGoal(goal.id).toPromise();
      this.toastService.success('Meta excluída com sucesso.');
      modal.close();
      await this.loadGoals();
    } catch (err) {
      console.error('Erro ao excluir meta:', err);
      this.toastService.error('Não foi possível excluir a meta.');
    } finally {
      this.deletingGoalId.set(null);
      this.goalToDelete.set(null);
    }
  }
}
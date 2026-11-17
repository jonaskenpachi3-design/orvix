import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModule, NgbAlertModule, NgbTooltipModule, NgbDatepickerModule, NgbInputDatepicker, NgbAccordionModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { InsightApi, InsightsResponse, Insight, TopCategory } from '@core/api/insight.api';
import { AiApi, AIChatResponse, AITool, AIToolsResponse } from '@core/api/ai.api';
import { ToastService } from '@shared/services/toast.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModule,
    NgbAlertModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    NgbInputDatepicker,
    NgbAccordionModule,
    NgbCollapseModule,
  ],
  template: `
    <div class="insights-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <span class="section-eyebrow">INSIGHTS</span>
          <h1>Insights & IA</h1>
          <p class="text-muted">Análise financeira inteligente e assistente de IA.</p>
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
            <div class="col-12 col-md-5">
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
            <div class="col-12 col-md-5">
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
            <div class="col-12 col-md-2 d-grid">
              <button type="button" class="btn btn-primary" (click)="loadInsights()" [disabled]="loadingInsights()">
                @if (loadingInsights()) {
                  <span class="spinner spinner-sm me-2" aria-hidden="true"></span> Carregando...
                } @else {
                  <i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i> Atualizar
                }
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- Insights Content -->
      @if (loadingInsights()) {
        <div class="loading-state text-center py-5">
          <div class="spinner mx-auto"></div>
          <p class="mt-2 text-muted">Carregando insights...</p>
        </div>
      } @else if (insightsData()) {
        <!-- Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Receitas</p>
                <h3 class="mb-0 text-success tabular-nums">{{ formatCurrency(insightsData()!.summary.income) }}</h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Despesas</p>
                <h3 class="mb-0 text-danger tabular-nums">{{ formatCurrency(insightsData()!.summary.expense) }}</h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100" [class.border-success]="insightsData()!.summary.balance >= 0" [class.border-danger]="insightsData()!.summary.balance < 0">
              <div class="card-body">
                <p class="text-muted mb-1 small">Saldo</p>
                <h3 class="mb-0 tabular-nums" [class.text-success]="insightsData()!.summary.balance >= 0" [class.text-danger]="insightsData()!.summary.balance < 0">
                  {{ formatCurrency(insightsData()!.summary.balance) }}
                </h3>
              </div>
            </section>
          </div>
          <div class="col-12 col-md-3">
            <section class="card summary-card h-100">
              <div class="card-body">
                <p class="text-muted mb-1 small">Transações</p>
                <h3 class="mb-0 tabular-nums">{{ insightsData()!.summary.transactions }}</h3>
              </div>
            </section>
          </div>
        </div>

        <!-- Insights List -->
        <section class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-lightbulb me-2" aria-hidden="true"></i> Insights Financeiros</h5>
          </div>
          <div class="card-body">
            @if (insightsData()!.insights.length === 0) {
              <div class="text-center py-4 text-muted">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 2rem;" aria-hidden="true"></i>
                <p class="mt-2 mb-0">Nenhum insight para este período. Suas finanças estão equilibradas!</p>
              </div>
            } @else {
              <div class="row g-3">
                @for (insight of insightsData()!.insights; track insight.title) {
                  <div class="col-12 col-md-6">
                    <div class="insight-card" [class]="'border-' + getInsightColor(insight.type)">
                      <div class="d-flex align-items-start gap-3">
                        <div class="insight-icon" [class]="'bg-' + getInsightColor(insight.type) + '-subtle text-' + getInsightColor(insight.type)">
                          <i [class]="insight.icon" aria-hidden="true"></i>
                        </div>
                        <div class="flex-grow-1">
                          <h6 class="mb-1">{{ insight.title }}</h6>
                          <p class="mb-0 small">{{ insight.message }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>

        <!-- Top Categories -->
        @if (insightsData()!.top_categories.length > 0) {
          <section class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0"><i class="bi bi-bar-chart me-2" aria-hidden="true"></i> Top Categorias</h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                @for (cat of insightsData()!.top_categories; track cat.category_id) {
                  <div class="col-12 col-md-4">
                    <div class="card h-100 border-0 bg-transparent">
                      <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                          <h6 class="mb-0">{{ cat.category_name }}</h6>
                          <span class="badge bg-primary-subtle text-primary">{{ cat.percentage }}%</span>
                        </div>
                        <div class="progress mb-2" style="height: 8px;">
                          <div class="progress-bar" [style.width.%]="cat.percentage"></div>
                        </div>
                        <p class="mb-0 fw-semibold tabular-nums">{{ formatCurrency(cat.total) }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Period Info -->
        <div class="text-center text-muted small mb-4">
          Período: {{ formatDate(insightsData()!.period.start_date) }} - {{ formatDate(insightsData()!.period.end_date) }}
        </div>
      }

      <!-- AI Chat Section -->
      <section class="card ai-chat-card mb-4">
        <div class="ai-chat-header">
          <div class="ai-title-wrap">
            <div class="ai-brand-icon" aria-hidden="true">
              <i class="bi bi-stars"></i>
            </div>
            <div>
              <span class="ai-overline">ORVIX IA</span>
              <h5 class="mb-0">Assistente financeiro</h5>
            </div>
          </div>
          <span class="ai-status" [class.is-online]="aiReady()" [class.is-offline]="!aiReady()">
            <span class="status-dot"></span>
            {{ aiReady() ? 'Online' : 'Indisponível' }}
          </span>
        </div>

        <div class="ai-chat-body">
          <div class="chat-container" #chatContainer>
            @if (chatMessages().length === 0) {
              <div class="chat-empty-state">
                <div class="chat-empty-icon" aria-hidden="true">
                  <i class="bi bi-stars"></i>
                </div>
                <h6>Como posso ajudar hoje?</h6>
                <p>Analiso seus gastos, orçamentos e metas para tornar suas decisões financeiras mais simples.</p>
              </div>
            } @else {
              @for (msg of chatMessages(); track msg.timestamp) {
                <div class="chat-message" [class.user-message]="msg.role === 'user'" [class.assistant-message]="msg.role === 'assistant'">
                  @if (msg.isLoading) {
                    <div class="ai-avatar" aria-hidden="true"><i class="bi bi-stars"></i></div>
                    <div class="typing-bubble" aria-label="O assistente está digitando">
                      <div class="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  } @else {
                    <div class="message-avatar" [class.ai-avatar]="msg.role === 'assistant'" [class.user-avatar]="msg.role === 'user'" aria-hidden="true">
                      <i [class]="msg.role === 'assistant' ? 'bi bi-stars' : 'bi bi-person-fill'"></i>
                    </div>
                    <div class="message-column">
                      <div class="message-meta">
                        <span>{{ msg.role === 'assistant' ? 'Orvix IA' : 'Você' }}</span>
                        <time>{{ msg.timestamp | date:'HH:mm' }}</time>
                      </div>
                      <div class="message-bubble" [class.user-bubble]="msg.role === 'user'" [class.assistant-bubble]="msg.role === 'assistant'">
                        <p [innerHTML]="formatMessage(msg.content)"></p>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>

          @if (!aiReady()) {
            <div class="ai-unavailable-note">
              <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
              O assistente está indisponível no momento. Verifique a configuração do backend.
            </div>
          }

          <div class="suggestions-block">
            <span class="suggestions-label">Experimente perguntar</span>
            <div class="suggestion-list" aria-label="Sugestões de perguntas">
              @for (suggestion of chatSuggestions; track suggestion) {
                <button
                  type="button"
                  class="suggestion-chip"
                  (click)="useSuggestion(suggestion)"
                  [disabled]="sendingMessage() || !aiReady()"
                >
                  {{ suggestion }}
                </button>
              }
            </div>
          </div>

          <form [formGroup]="chatForm" (ngSubmit)="sendMessage()" class="chat-composer">
            <input
              type="text"
              class="chat-input"
              formControlName="message"
              placeholder="Pergunte sobre suas finanças..."
              [disabled]="sendingMessage() || !aiReady()"
              aria-label="Mensagem para o assistente"
            />
            <button
              type="submit"
              class="chat-send"
              [disabled]="chatForm.invalid || sendingMessage() || !aiReady()"
              aria-label="Enviar mensagem"
            >
              @if (sendingMessage()) {
                <span class="spinner spinner-sm" aria-hidden="true"></span>
              } @else {
                <i class="bi bi-arrow-up" aria-hidden="true"></i>
              }
            </button>
          </form>
        </div>
      </section>

      <!-- AI Tools Info -->
      @if (aiTools().length > 0) {
        <section class="card">
          <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-tools me-2" aria-hidden="true"></i> Ferramentas disponíveis para a IA</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              @for (tool of aiTools(); track tool.name) {
                <div class="col-12 col-md-6 col-lg-4">
                  <div class="card h-100 tool-card">
                    <div class="card-body">
                      <h6 class="mb-2">{{ tool.name }}</h6>
                      <p class="text-muted small mb-0">{{ tool.description }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .insights-page {
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

    .insight-card {
      padding: 1rem;
      border-radius: var(--border-radius-md);
      border-left-width: 4px;
      border-left-style: solid;
      background-color: var(--orvix-surface);
      transition: transform var(--transition-fast);
    }

    .insight-card:hover {
      transform: translateX(2px);
    }

    .insight-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--border-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .loading-state .spinner {
      width: 2.5rem;
      height: 2.5rem;
    }

    .ai-chat-card {
      overflow: hidden;
      border: 1px solid var(--orvix-border);
      box-shadow: var(--orvix-shadow-md);
    }

    .ai-chat-header {
      min-height: 76px;
      padding: 0.875rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--orvix-border);
      background:
        radial-gradient(circle at 12% 50%, rgba(var(--bs-primary-rgb), 0.12), transparent 24%),
        var(--orvix-surface);
    }

    .ai-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .ai-brand-icon,
    .ai-avatar {
      width: 42px;
      height: 42px;
      border-radius: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      background: linear-gradient(135deg, var(--orvix-primary), #A78BFA);
      box-shadow: 0 8px 20px rgba(var(--bs-primary-rgb), 0.22);
    }

    .ai-overline {
      display: block;
      margin-bottom: 1px;
      color: var(--orvix-primary);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
    }

    .ai-status {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      height: 32px;
      padding: 0 0.75rem;
      border-radius: var(--border-radius-pill);
      font-size: 0.78rem;
      font-weight: 700;
      border: 1px solid var(--orvix-border);
      background: var(--orvix-surface-2);
      color: var(--orvix-text-secondary);
    }

    .ai-status.is-online {
      color: var(--orvix-positive);
      border-color: rgba(var(--orvix-success-rgb), 0.25);
      background: rgba(var(--orvix-success-rgb), 0.08);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 3px rgba(var(--orvix-success-rgb), 0.10);
    }

    .ai-status.is-offline .status-dot {
      box-shadow: none;
      background: var(--orvix-text-muted);
    }

    .ai-chat-body {
      padding: 1rem;
      background: var(--orvix-surface);
    }

    .chat-container {
      height: 420px;
      overflow-y: auto;
      padding: 1.25rem;
      border: 1px solid var(--orvix-border);
      border-radius: var(--border-radius-md);
      background:
        linear-gradient(var(--orvix-surface-2), var(--orvix-surface-2)) padding-box,
        radial-gradient(circle at 100% 0, rgba(var(--bs-primary-rgb), 0.08), transparent 30%);
      scroll-behavior: smooth;
    }

    .chat-empty-state {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 430px;
      margin: 0 auto;
      text-align: center;
    }

    .chat-empty-icon {
      width: 68px;
      height: 68px;
      margin-bottom: 1rem;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--orvix-primary);
      font-size: 1.75rem;
      background: var(--orvix-primary-soft);
      border: 1px solid rgba(var(--bs-primary-rgb), 0.12);
      transform: rotate(-3deg);
    }

    .chat-empty-state h6 {
      margin-bottom: 0.35rem;
      font-size: 1.05rem;
    }

    .chat-empty-state p {
      max-width: 390px;
      margin: 0;
      color: var(--orvix-text-secondary);
      line-height: 1.55;
    }

    .chat-message {
      display: flex;
      align-items: flex-end;
      gap: 0.65rem;
      margin-bottom: 1.15rem;
      animation: fadeIn var(--transition-fast);
    }

    .chat-message:last-child {
      margin-bottom: 0;
    }

    .user-message {
      flex-direction: row-reverse;
    }

    .message-avatar,
    .ai-avatar {
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      border-radius: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ai-avatar {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      font-size: 0.9rem;
    }

    .user-avatar {
      color: var(--orvix-text-secondary);
      background: var(--orvix-surface);
      border: 1px solid var(--orvix-border);
    }

    .message-column {
      max-width: min(76%, 620px);
    }

    .user-message .message-column {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .message-meta {
      display: flex;
      gap: 0.55rem;
      margin: 0 0.25rem 0.35rem;
      color: var(--orvix-text-muted);
      font-size: 0.72rem;
    }

    .message-meta span {
      color: var(--orvix-text-secondary);
      font-weight: 700;
    }

    .message-bubble,
    .typing-bubble {
      padding: 0.75rem 0.95rem;
      border: 1px solid var(--orvix-border);
      border-radius: 16px;
      box-shadow: var(--orvix-shadow-sm);
    }

    .message-bubble p {
      margin: 0;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .user-bubble {
      color: white;
      border: none;
      background: linear-gradient(135deg, var(--orvix-primary), var(--orvix-primary-hover));
      border-bottom-right-radius: 5px;
      box-shadow: 0 8px 18px rgba(var(--bs-primary-rgb), 0.16);
    }

    .assistant-bubble {
      background: var(--orvix-surface);
      border-bottom-left-radius: 5px;
    }

    .typing-bubble {
      width: 58px;
      background: var(--orvix-surface);
      border-bottom-left-radius: 5px;
    }

    .typing-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 20px;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--orvix-text-muted);
      animation: typing 1.4s infinite ease-in-out;
    }

    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .ai-unavailable-note {
      margin-top: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--orvix-warning);
      font-size: 0.82rem;
    }

    .suggestions-block {
      margin: 0.75rem 0;
    }

    .suggestions-label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--orvix-text-muted);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .suggestion-list {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      scrollbar-width: none;
    }

    .suggestion-list::-webkit-scrollbar {
      display: none;
    }

    .suggestion-chip {
      flex: 0 0 auto;
      min-height: 38px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--orvix-border);
      border-radius: var(--border-radius-pill);
      color: var(--orvix-text-secondary);
      background: var(--orvix-surface);
      font-size: 0.82rem;
      transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
    }

    .suggestion-chip:hover:not(:disabled) {
      color: var(--orvix-primary);
      border-color: rgba(var(--bs-primary-rgb), 0.35);
      background: var(--orvix-primary-soft);
      transform: translateY(-1px);
    }

    .suggestion-chip:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .chat-composer {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-height: 58px;
      padding: 0.5rem;
      border: 1px solid var(--orvix-border);
      border-radius: 18px;
      background: var(--orvix-surface);
      box-shadow: var(--orvix-shadow-sm);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .chat-composer:focus-within {
      border-color: rgba(var(--bs-primary-rgb), 0.55);
      box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.10);
    }

    .chat-input {
      min-width: 0;
      flex: 1;
      height: 44px;
      padding: 0 0.65rem;
      border: 0;
      outline: 0;
      color: var(--orvix-text);
      background: transparent;
    }

    .chat-input::placeholder {
      color: var(--orvix-text-muted);
    }

    .chat-send {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      border: 0;
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      background: var(--orvix-primary);
      font-size: 1.1rem;
      box-shadow: 0 8px 16px rgba(var(--bs-primary-rgb), 0.20);
      transition: background var(--transition-fast), transform var(--transition-fast);
    }

    .chat-send:hover:not(:disabled) {
      background: var(--orvix-primary-hover);
      transform: translateY(-1px);
    }

    .chat-send:disabled {
      opacity: 0.45;
      box-shadow: none;
      cursor: not-allowed;
    }

    .tool-card {
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      border: 1px solid var(--orvix-border);
    }

    .tool-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--orvix-shadow-md);
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

      .ai-chat-header {
        min-height: 68px;
        padding: 0.75rem;
      }

      .ai-brand-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
      }

      .ai-status {
        height: 30px;
        padding: 0 0.55rem;
      }

      .ai-chat-body {
        padding: 0.75rem;
      }

      .chat-container {
        height: 380px;
        padding: 0.75rem;
      }

      .message-column {
        max-width: 82%;
      }

      .chat-empty-state {
        padding: 1rem;
      }

      .suggestion-list {
        margin-right: -0.75rem;
        padding-right: 0.75rem;
      }
    }
  `]
})
export class InsightsComponent implements OnInit, AfterViewChecked {
  private readonly fb = inject(FormBuilder);
  private readonly insightApi = inject(InsightApi);
  private readonly aiApi = inject(AiApi);
  private readonly toastService = inject(ToastService);

  // Signals
  readonly insightsData = signal<InsightsResponse | null>(null);
  readonly loadingInsights = signal(false);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly sendingMessage = signal(false);
  readonly aiTools = signal<AITool[]>([]);
  readonly aiReady = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly scrollToBottom = signal(false);

  @ViewChild('chatContainer') chatContainerRef!: ElementRef<HTMLDivElement>;

  readonly periodForm = this.fb.nonNullable.group({
    startDate: ['' as string | { year: number; month: number; day: number }],
    endDate: ['' as string | { year: number; month: number; day: number }],
  });

  readonly chatForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(500)]],
  });

  readonly chatSuggestions = [
    'Qual meu gasto total este mês?',
    'Como estão meus orçamentos?',
    'Quais categorias mais gasto?',
    'Tenho alguma meta atrasada?',
    'Resumo financeiro do mês',
  ];

  ngOnInit(): void {
    this.setDefaultPeriod();
    this.loadInsights();
    this.loadAiTools();
  }

  ngAfterViewChecked(): void {
    if (this.scrollToBottom()) {
      this.scrollChatToBottom();
      this.scrollToBottom.set(false);
    }
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

  loadInsights(): void {
    const startDate = this.formatDateForApi(this.periodForm.controls.startDate.value);
    const endDate = this.formatDateForApi(this.periodForm.controls.endDate.value);

    if (!startDate || !endDate) {
      this.toastService.warning('Selecione o período.');
      return;
    }

    this.loadingInsights.set(true);
    this.errorMessage.set(null);

    this.insightApi.getFinancialInsights(startDate, endDate).subscribe({
      next: (response) => {
        this.insightsData.set(response);
        this.loadingInsights.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar insights:', err);
        this.errorMessage.set('Não foi possível carregar os insights.');
        this.loadingInsights.set(false);
      },
    });
  }

  private loadAiTools(): void {
    this.aiApi.getTools().subscribe({
      next: (response: AIToolsResponse) => {
        this.aiTools.set(response.tools ?? []);
        this.aiReady.set(true);
      },
      error: (err) => {
        console.error('Erro ao carregar ferramentas da IA:', err);
        this.aiReady.set(false);
      },
    });
  }

  sendMessage(): void {
    const message = this.chatForm.controls.message.value.trim();
    if (!message || this.sendingMessage() || !this.aiReady()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this.chatMessages.update(msgs => [...msgs, userMessage]);
    this.chatForm.reset({ message: '' });
    this.sendingMessage.set(true);
    this.scrollToBottom.set(true);

    // Add loading assistant message
    const loadingMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    this.chatMessages.update(msgs => [...msgs, loadingMessage]);
    this.scrollToBottom.set(true);

    this.aiApi.chat(message).subscribe({
      next: (response: AIChatResponse) => {
        // Replace loading message with actual response
        this.chatMessages.update(msgs => {
          const newMsgs = [...msgs];
          const loadingIndex = newMsgs.findIndex(m => m.isLoading);
          if (loadingIndex !== -1) {
            newMsgs[loadingIndex] = {
              role: 'assistant',
              content: response.response,
              timestamp: new Date(),
            };
          }
          return newMsgs;
        });
        this.sendingMessage.set(false);
        this.scrollToBottom.set(true);
      },
      error: (err) => {
        console.error('Erro no chat IA:', err);
        let errorMsg = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';

        // Handle specific error codes
        // O backend envia mensagens seguras e específicas (chave inválida, limite do provedor etc.)
        const serverMsg = typeof err?.error?.error === 'string' ? err.error.error : '';

        if (err?.status === 401) {
          errorMsg = 'Sessão expirada. Por favor, faça login novamente.';
        } else if ([400, 422, 429, 502, 503, 504].includes(err?.status) && serverMsg) {
          errorMsg = serverMsg;
        } else if (err?.status === 429) {
          errorMsg = 'Muitas requisições. Aguarde um momento antes de tentar novamente.';
        } else if (err?.status === 503) {
          errorMsg = 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.';
        } else if (err?.status === 0) {
          errorMsg = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        }

        this.chatMessages.update(msgs => {
          const newMsgs = [...msgs];
          const loadingIndex = newMsgs.findIndex(m => m.isLoading);
          if (loadingIndex !== -1) {
            newMsgs[loadingIndex] = {
              role: 'assistant',
              content: errorMsg,
              timestamp: new Date(),
            };
          }
          return newMsgs;
        });
        this.sendingMessage.set(false);
        this.scrollToBottom.set(true);
      },
    });
  }

  useSuggestion(suggestion: string): void {
    this.chatForm.patchValue({ message: suggestion });
    this.sendMessage();
  }

  private scrollChatToBottom(): void {
    try {
      const container = this.chatContainerRef?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (e) {
      // Ignore scroll errors
    }
  }

  getInsightColor(type: Insight['type']): string {
    const colors: Record<Insight['type'], string> = {
      positive: 'success',
      negative: 'danger',
      warning: 'warning',
      info: 'info',
      excellent: 'success',
    };
    return colors[type] || 'info';
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  formatMessage(content: string): string {
    // Escape HTML first to prevent XSS
    const escaped = this.escapeHtml(content);

    // Simple markdown-like formatting
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-light px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>');
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
}
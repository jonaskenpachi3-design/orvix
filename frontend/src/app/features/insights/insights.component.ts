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
      <section class="card mb-4">
        <div class="card-header d-flex align-items-center justify-content-between">
          <h5 class="mb-0"><i class="bi bi-robot me-2" aria-hidden="true"></i> Assistente Financeiro (IA)</h5>
          <span class="badge" [class.bg-success]="aiReady()" [class.bg-secondary]="!aiReady()">
            <i class="bi" [class.bi-wifi]="aiReady()" [class.bi-wifi-off]="!aiReady()" aria-hidden="true"></i>
            {{ aiReady() ? 'Online' : 'Indisponível' }}
          </span>
        </div>
        <div class="card-body">
          <!-- Chat Messages -->
          <div class="chat-container" #chatContainer style="height: 400px; overflow-y: auto; margin-bottom: 1rem;">
            @if (chatMessages().length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="bi bi-chat-dots" style="font-size: 3rem; opacity: 0.3;" aria-hidden="true"></i>
                <p class="mt-3 mb-1">Como posso ajudar?</p>
                <p class="small">Pergunte sobre seus gastos, orçamentos, metas ou peça análises.</p>
              </div>
            } @else {
              @for (msg of chatMessages(); track msg.timestamp) {
                <div class="chat-message mb-3" [class.user-message]="msg.role === 'user'">
                  <div class="d-flex" [class.flex-row-reverse]="msg.role === 'user'">
                    <div class="avatar-circle me-2 ms-2 flex-shrink-0" [class.bg-primary]="msg.role === 'assistant'" [class.bg-secondary]="msg.role === 'user'" style="width: 32px; height: 32px; font-size: 0.875rem;">
                      <i [class]="msg.role === 'assistant' ? 'bi bi-robot' : 'bi bi-person'" aria-hidden="true"></i>
                    </div>
                    <div class="message-bubble" [class.user-bubble]="msg.role === 'user'" [class.assistant-bubble]="msg.role === 'assistant'">
                      <p class="mb-1" [innerHTML]="formatMessage(msg.content)"></p>
                      <small class="text-muted">{{ msg.timestamp | date:'HH:mm' }}</small>
                    </div>
                  </div>
                  @if (msg.isLoading) {
                    <div class="typing-indicator ms-5 me-2">
                      <span></span><span></span><span></span>
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Chat Input -->
          <form [formGroup]="chatForm" (ngSubmit)="sendMessage()" class="input-group">
            <input
              type="text"
              class="form-control"
              formControlName="message"
              placeholder="Digite sua pergunta..."
              [disabled]="sendingMessage() || !aiReady()"
              (keydown.enter)="sendMessage()"
              aria-label="Mensagem para o assistente"
            />
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="chatForm.invalid || sendingMessage() || !aiReady()"
              aria-label="Enviar mensagem"
            >
              @if (sendingMessage()) {
                <span class="spinner spinner-sm" aria-hidden="true"></span>
              } @else {
                <i class="bi bi-send" aria-hidden="true"></i>
              }
            </button>
          </form>

          @if (!aiReady()) {
            <p class="text-muted small mt-2 text-center">
              O assistente de IA não está disponível no momento. Verifique a configuração do backend.
            </p>
          }

          <!-- Quick Actions -->
          <div class="mt-3">
            <p class="text-muted small mb-2">Sugestões:</p>
            <div class="d-flex flex-wrap gap-2">
              @for (suggestion of chatSuggestions; track suggestion) {
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  (click)="useSuggestion(suggestion)"
                  [disabled]="sendingMessage()"
                >
                  {{ suggestion }}
                </button>
              }
            </div>
          </div>
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

    .chat-container {
      border: 1px solid var(--orvix-border);
      border-radius: var(--border-radius-md);
      padding: 1rem;
      background-color: var(--orvix-surface-2);
    }

    .chat-message {
      animation: fadeIn var(--transition-fast);
    }

    .user-message {
      display: flex;
      flex-direction: row-reverse;
    }

    .message-bubble {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: var(--border-radius-lg);
    }

    .user-bubble {
      background-color: var(--orvix-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .assistant-bubble {
      background-color: var(--orvix-surface);
      border: 1px solid var(--orvix-border);
      border-bottom-left-radius: 4px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 0.5rem;
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

      .message-bubble {
        max-width: 90%;
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
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
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
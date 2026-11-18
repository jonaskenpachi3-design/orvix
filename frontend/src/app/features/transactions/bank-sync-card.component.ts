import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BankApi, BankConnection } from '@core/api/bank.api';

@Component({
  selector: 'app-bank-sync-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card mb-4">
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 class="h6 mb-1">
              <i class="bi bi-credit-card-2-front me-2" aria-hidden="true"></i>Cartão de crédito (Open Finance)
            </h2>
            @if (!loaded()) {
              <p class="text-muted small mb-0">Carregando…</p>
            } @else if (!configured()) {
              <p class="text-muted small mb-0">Integração bancária não configurada no servidor.</p>
            } @else if (connection()) {
              <p class="text-muted small mb-0">
                Conectado.
                @if (connection()!.last_synced_at) {
                  Última sincronização: {{ connection()!.last_synced_at | date: 'dd/MM/yyyy HH:mm' }}.
                } @else {
                  Ainda não sincronizado.
                }
              </p>
            } @else {
              <p class="text-muted small mb-0">
                Cole o ID da conexão (Item ID) da Pluggy para importar as compras do cartão.
              </p>
            }
          </div>

          @if (loaded() && configured()) {
            @if (connection()) {
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-primary btn-sm" (click)="sync()" [disabled]="busy()">
                  @if (busy()) { <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span> }
                  Sincronizar cartão
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="disconnect()" [disabled]="busy()">
                  Desconectar
                </button>
              </div>
            } @else {
              <form class="d-flex gap-2 flex-grow-1" style="max-width: 560px;" (submit)="connect($event, itemInput.value)">
                <input
                  #itemInput
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Item ID (ex.: 3f2c…)"
                  aria-label="Item ID da Pluggy"
                  autocomplete="off"
                  [disabled]="busy()"
                />
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="busy()">Conectar</button>
              </form>
            }
          }
        </div>

        @if (message()) {
          <p class="small mt-3 mb-0" [class.text-danger]="isError()" [class.text-success]="!isError()" role="status">
            {{ message() }}
          </p>
        }
      </div>
    </section>
  `,
})
export class BankSyncCardComponent implements OnInit {
  private readonly bankApi = inject(BankApi);

  /** Avisa a tela de transações para recarregar a lista depois de sincronizar */
  readonly synced = output<void>();

  readonly loaded = signal(false);
  readonly configured = signal(false);
  readonly connection = signal<BankConnection | null>(null);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.bankApi.getStatus().subscribe({
      next: (status) => {
        this.configured.set(status.configured);
        this.connection.set(status.connections[0] ?? null);
        this.loaded.set(true);
      },
      error: () => {
        // Sem a integração disponível, apenas esconde o card em estado neutro
        this.configured.set(false);
        this.loaded.set(true);
      },
    });
  }

  private fail(err: unknown): void {
    const serverMessage = (err as { error?: { error?: string } })?.error?.error;
    this.message.set(serverMessage ?? 'Não foi possível concluir a operação. Tente novamente.');
    this.isError.set(true);
    this.busy.set(false);
  }

  connect(event: Event, itemId: string): void {
    event.preventDefault();
    const value = itemId.trim();
    if (!value) {
      this.message.set('Informe o Item ID.');
      this.isError.set(true);
      return;
    }

    this.busy.set(true);
    this.message.set(null);
    this.bankApi.connect(value).subscribe({
      next: (result) => {
        this.message.set(`Conectado (${result.cards} cartão(ões)). Clique em Sincronizar para importar.`);
        this.isError.set(false);
        this.busy.set(false);
        this.refresh();
      },
      error: (err) => this.fail(err),
    });
  }

  sync(): void {
    this.busy.set(true);
    this.message.set(null);
    this.bankApi.sync().subscribe({
      next: (r) => {
        this.message.set(`Sincronizado: ${r.imported} nova(s), ${r.updated} atualizada(s).`);
        this.isError.set(false);
        this.busy.set(false);
        this.refresh();
        this.synced.emit();
      },
      error: (err) => this.fail(err),
    });
  }

  disconnect(): void {
    const current = this.connection();
    if (!current) return;

    this.busy.set(true);
    this.message.set(null);
    this.bankApi.disconnect(current.id).subscribe({
      next: () => {
        this.message.set('Banco desconectado. As transações já importadas foram mantidas.');
        this.isError.set(false);
        this.busy.set(false);
        this.refresh();
      },
      error: (err) => this.fail(err),
    });
  }
}

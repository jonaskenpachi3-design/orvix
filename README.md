# ◈ ORVIX

🚀 **Demonstração online**: <https://orvix-oxuw.onrender.com/>

## Plataforma de Inteligência Financeira

Plataforma web de controle e inteligência financeira pessoal. Reúne receitas, despesas, categorias, metas, orçamentos, parcelamentos e sincronização bancária (Open Finance) em uma interface escura e responsiva, com dashboard, relatórios, insights e chat com agente de IA.

> **Controle. Inteligência. Planejamento.**

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Começando](#começando)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Autenticação](#autenticação)
- [Referência da API](#referência-da-api)
- [Regras de negócio](#regras-de-negócio)
- [Páginas do frontend](#páginas-do-frontend)
- [Segurança](#segurança)
- [Deploy](#deploy)
- [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Limitações conhecidas](#limitações-conhecidas)
- [Autor e licença](#autor-e-licença)

---

## Funcionalidades

- **Autenticação:** cadastro e login com senha criptografada (bcrypt, custo 12) e sessão via JWT (validade 7 dias).
- **Transações:** cadastro, listagem, edição e exclusão de receitas e despesas. Suporte a parcelamentos (status `scheduled`/`paid`).
- **Categorias:** categorias próprias do usuário, separadas por tipo (`income` ou `expense`).
- **Metas:** metas com valor alvo, valor atual e prazo opcional.
- **Orçamentos:** limite mensal por categoria de despesa, com acompanhamento de uso e status (`within`, `attention`, `near_limit`, `exceeded`).
- **Parcelamentos:** criação de planos de parcelamento com geração automática de parcelas agendadas, marcação de parcela paga, exclusão do plano (mantém parcelas já pagas).
- **Sincronização bancária (Open Finance):** importação de compras de cartão de crédito e movimentações de conta corrente/poupança via [Pluggy](https://docs.pluggy.ai) (agregador autorizado do Open Finance Brasil). Upsert idempotente por `external_id`; janela de 120 dias; ignora pagamentos de fatura para não duplicar.
- **Categorização automática:** após cada sincronização (e via botão **Categorizar com IA**), transações importadas em categorias genéricas ("Cartão de crédito", "Conta bancária", "Recebimentos") são classificadas. Primeiro por regras locais (Uber, iFood, Netflix, etc.); o restante via IA configurada (`GROQ_API_KEY` gratuita ou `ANTHROPIC_API_KEY`). À IA vai apenas o texto da descrição (sem valores, datas ou dados pessoais; números longos removidos). Pix/TED/transferências nunca são enviados. Recategorização manual é preservada. Limite de 10 categorias novas por execução.
- **Dashboard:** resumo do período, taxa de economia, saúde financeira, categoria principal, comparação mensal, evolução mensal, despesas por categoria e parcelas futuras.
- **Relatórios:** relatório financeiro por intervalo de datas, com evolução mensal e despesas por categoria.
- **Insights:** análises automáticas sobre taxa de economia (negativa, baixa, positiva, excelente) e concentração de gastos (alerta se uma categoria ≥ 50%).
- **IA contábil:** chat com agente que consulta transações, categorias, parcelas, planos de parcelamento e resumos do usuário autenticado. Ferramentas: `listar_transacoes`, `resumo_por_categoria`, `projetar_parcelas`, `listar_planos_parcelamento`, `resumo_financeiro_periodo`. Rate limit por usuário.
- **Interface:** tema escuro, layout responsivo, gráficos com Chart.js, PWA instalável.

---

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | Angular 18, Bootstrap 5, ng-bootstrap, Chart.js |
| Backend | Node.js (≥ 20.19), Express 5, API REST |
| Autenticação | JSON Web Token (`jsonwebtoken`), `bcryptjs` |
| Banco de dados | PostgreSQL, `pg` (node-postgres), pool de conexões |
| IA (chat e categorização) | Groq (gratuito, padrão `openai/gpt-oss-120b`), Anthropic (`claude-sonnet-5-5`), compatível OpenAI |
| Sincronização bancária | Pluggy (Open Finance Brasil) |
| Segurança | Helmet, CORS, variáveis de ambiente com `dotenv`, rate limiting |
| Hospedagem | Render (Web Service + PostgreSQL) |
| PWA | Service Worker (Angular) |

---

## Arquitetura

O backend segue uma organização em camadas, em que cada uma tem uma responsabilidade:

```text
Requisição HTTP
      │
      ▼
server.js ──► Middleware (Helmet, CORS, parsers, arquivos estáticos)
      │
      ▼
Routes ────► Middleware de autenticação (JWT)
      │
      ▼
Controllers ─► validação da entrada e resposta HTTP
      │
      ▼
Services ───► regras de negócio e consultas SQL
      │
      ▼
PostgreSQL (pool de conexões em src/config/database.js)
```

Em produção, o Express serve o build Angular de `frontend/dist/orvix-frontend`. Durante o desenvolvimento, use `npm start --prefix frontend` para servir o Angular e encaminhar `/api` ao backend.

---

## Estrutura do projeto

```text
orvix/
├── db/
│   ├── migrations/             # Migrações aplicadas pelo runner
│   │   ├── 001_installments.sql
│   │   ├── 002_bank_sync.sql
│   │   └── 003_goal_contributions.sql
│   └── schema.sql              # Estrutura base do PostgreSQL
├── frontend/                   # Aplicação Angular
│   ├── src/app/
│   │   ├── core/               # Auth, serviços de API, guards, interceptors
│   │   ├── features/           # Páginas (dashboard, transactions, budgets, goals, installments, insights, reports, categories, bank-sync)
│   │   ├── shared/             # Componentes/serviços compartilhados
│   │   └── app.routes.ts       # Rotas do Angular
│   ├── src/assets/             # Logo e demais arquivos estáticos
│   └── package.json
├── public/                     # Páginas legadas servidas em desenvolvimento
├── src/
│   ├── config/
│   │   └── database.js         # Pool de conexões PostgreSQL
│   ├── controllers/            # Entrada e saída HTTP
│   │   ├── authController.js
│   │   ├── transactionController.js
│   │   ├── categoryController.js
│   │   ├── goalController.js
│   │   ├── budgetController.js
│   │   ├── dashboardController.js
│   │   ├── reportController.js
│   │   ├── insightController.js
│   │   ├── installmentController.js
│   │   ├── aiController.js
│   │   └── bankController.js
│   ├── middleware/
│   │   ├── authMiddleware.js   # Validação do token JWT
│   │   └── aiRateLimit.js      # Rate limit do chat IA
│   ├── routes/                 # Definição dos endpoints
│   │   ├── authRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── goalRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── insightRoutes.js
│   │   ├── installmentRoutes.js
│   │   ├── aiRoutes.js
│   │   └── bankRoutes.js
│   └── services/               # Regras de negócio e SQL
│       ├── authService.js
│       ├── transactionService.js
│       ├── categoryService.js
│       ├── goalService.js
│       ├── budgetService.js
│       ├── dashboardService.js
│       ├── reportService.js
│       ├── insightService.js
│       ├── installmentService.js
│       ├── aiAccountingService.js  # Chat com IA + tools
│       ├── aiProviders.js          # Abstração Groq/Anthropic/OpenAI-compatible
│       ├── categorizationService.js # Categorização automática (regras + IA)
│       ├── categoryRules.js        # Regras locais determinísticas
│       └── pluggyService.js        # Cliente Pluggy + sync + upsert
├── scripts/
│   ├── run-migrations.js       # Schema base + migrações
│   └── test-db.js              # Teste de conexão com o banco
├── .env.example
├── package.json
└── server.js                   # Ponto de entrada
```

---

## Começando

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20.19 ou superior
- [PostgreSQL](https://www.postgresql.org/) em execução (local ou na nuvem)
- Git

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/jonaskenpachi3-design/orvix.git
cd orvix

# 2. Instale as dependências do backend e do frontend
npm ci
npm ci --prefix frontend

# 3. Crie o arquivo de ambiente
cp .env.example .env
# edite o .env com seus valores (veja a seção abaixo)
```

### Preparando o banco

Crie o banco e aplique o schema base e as migrações:

```bash
createdb orvix
npm run migrate
```

`npm run migrate` aplica o schema base idempotente e, em seguida, as migrações pendentes.

### Executando

```bash
npm start
```

Para desenvolver a interface, execute `npm start --prefix frontend` e acesse `http://localhost:4200`. O backend pode ser iniciado separadamente com `npm run dev`.

Scripts disponíveis:

| Comando | O que faz |
| --- | --- |
| `npm start` | Inicia o servidor. |
| `npm run dev` | Inicia o servidor reiniciando a cada alteração (`node --watch`). |
| `npm run build` | Gera o build de produção do Angular. |
| `npm run migrate` | Aplica o schema base e migrações pendentes. |
| `npm run test:db` | Testa a conexão com o banco usando o `DATABASE_URL`. |

Para conferir se o servidor e o banco estão funcionando:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "application": "Orvix", "environment": "development", "database": "connected", "aiConfigured": false }
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição | Exemplo |
| --- | --- | --- | --- |
| `PORT` | Não | Porta do servidor. Padrão: `3000`. | `3000` |
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL. | `postgresql://usuario:senha@localhost:5432/orvix` |
| `JWT_SECRET` | Sim | Chave usada para assinar e validar os tokens. Use um valor longo e aleatório (≥ 32 chars em produção). | `uma-chave-longa-e-aleatoria` |
| `NODE_ENV` | Não | `development` (padrão) ou `production`. | `development` |
| `CORS_ORIGIN` | Não | Origem permitida quando o frontend está em outro domínio. Sem ela em produção, somente chamadas same-origin são permitidas. | `https://meu-orvix.onrender.com` |
| `GROQ_API_KEY` | Não | Habilita o chat contábil e categorização com IA **gratuita** (Groq). Configure no provedor, nunca no Git. | Configure no provedor, nunca no Git. |
| `AI_MODEL` | Não | Modelo do provedor; padrão `openai/gpt-oss-120b` (Groq) ou `claude-sonnet-5-5` (Anthropic). | `openai/gpt-oss-120b` |
| `AI_PROVIDER` | Não | `groq`, `anthropic` ou `openai-compatible`. Se omitido, é detectado pela chave presente. | `groq` |
| `ANTHROPIC_API_KEY` | Não | Alternativa paga (Claude). Configure no provedor, nunca no Git. | Configure no provedor, nunca no Git. |
| `AI_API_KEY`, `AI_BASE_URL` | Não | Para `openai-compatible` (OpenRouter, Cerebras etc.). | — |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | Não | Habilitam a sincronização do cartão de crédito/conta via Open Finance (Pluggy). São segredos: configure só no provedor, nunca no Git. | Configure no provedor, nunca no Git. |
| `PLUGGY_BASE_URL` | Não | Endpoint da API Pluggy (padrão `https://api.pluggy.ai`). | `https://api.pluggy.ai` |

Em `production`, o Orvix exige `DATABASE_URL` e `JWT_SECRET` (mínimo de 32 caracteres), ativa `trust proxy`, usa SSL na conexão com o banco e aumenta o pool de conexões de 5 para 10. `CORS_ORIGIN` é opcional e restringe chamadas cross-origin quando definida; `GROQ_API_KEY` (gratuita) ou `ANTHROPIC_API_KEY` é opcional e habilita o chat com IA e categorização automática. Gere um segredo forte, por exemplo, com `openssl rand -base64 48`; não reutilize o valor de exemplo.

---

## Banco de dados

O arquivo `db/schema.sql` usa a extensão `pgcrypto` (para `gen_random_uuid()`) e define as tabelas abaixo. Todas as chaves primárias são UUID.

### Modelo de dados

| Tabela | Campos principais | Observações |
| --- | --- | --- |
| `users` | `id`, `name`, `email` (único), `password`, `created_at`, `updated_at` | A senha é guardada como hash bcrypt (custo 12). |
| `categories` | `id`, `user_id`, `name`, `type`, `created_at` | `type` é `income` ou `expense`. Combinação `user_id` + `name` + `type` é única. |
| `transactions` | `id`, `user_id`, `category_id`, `description`, `amount`, `type`, `transaction_date`, `plan_id`, `installment_number`, `status`, `source`, `external_id`, `created_at`, `updated_at` | `amount` > 0, `NUMERIC(12,2)`. `status` ∈ {`scheduled`, `paid`}. `source` ∈ {`manual`, `pluggy`}. `external_id` para upsert idempotente na sincronização. Ao excluir a categoria, `category_id` vira `NULL`. |
| `installment_plans` | `id`, `user_id`, `description`, `total_amount`, `installments_total`, `first_due_date`, `category_id`, `card_id`, `created_at`, `updated_at` | Plano de parcelamento; gera transações com `status = 'scheduled'`. |
| `goals` | `id`, `user_id`, `name`, `target_amount`, `current_amount`, `deadline`, `created_at`, `updated_at` | `target_amount` > 0 e `0 <= current_amount <= target_amount`. |
| `budgets` | `id`, `user_id`, `category_id`, `amount`, `month`, `created_at`, `updated_at` | `amount` > 0. Um orçamento por categoria em cada mês (`user_id` + `category_id` + `month` único). `month` guarda o primeiro dia do mês. |
| `bank_connections` | `id`, `user_id`, `provider`, `item_id`, `last_synced_at`, `created_at` | Conexão Pluggy (Open Finance). Única por `user_id` + `provider` + `item_id`. |

Os dados de cada usuário são removidos em cascata quando a conta é excluída.

---

## Autenticação

1. O usuário se cadastra em `POST /api/auth/register` e entra em `POST /api/auth/login`.
2. O login devolve um token JWT válido por **7 dias**.
3. Todas as rotas, exceto cadastro, login e health check, exigem o cabeçalho:

```http
Authorization: Bearer <token>
```

O frontend guarda o token no `localStorage` (chave `orvix_token`) e o envia nas chamadas à API. Cada consulta é filtrada pelo `id` do usuário contido no token, então um usuário nunca enxerga os dados de outro.

Respostas de falha de autenticação (`401`):

| Situação | Mensagem |
| --- | --- |
| Cabeçalho ausente | `Token de acesso não informado.` |
| Formato diferente de `Bearer <token>` | `Formato de token inválido.` |
| Token inválido ou expirado | `Token inválido ou expirado.` |

---

## Referência da API

URL base: `http://localhost:3000/api`

Convenções:

- Requisições e respostas usam JSON (`Content-Type: application/json`, limite de 1 MB).
- Valores monetários são números; datas usam o formato `YYYY-MM-DD`.
- Erros retornam `{ "error": "mensagem" }`. Erros inesperados retornam `500` com `Erro interno do servidor.`
- Endpoints inexistentes sob `/api` retornam `404` com `{ "message": "Endpoint da API não encontrado." }`.

### Resumo dos endpoints

| Método | Rota | Auth | Descrição |
| --- | --- | :-: | --- |
| GET | `/health` | Não | Verifica servidor e banco; informa se a chave da IA está configurada. |
| POST | `/auth/register` | Não | Cria uma conta. |
| POST | `/auth/login` | Não | Autentica e devolve o token. |
| GET | `/auth/me` | Sim | Valida o token. |
| GET | `/transactions` | Sim | Lista as transações. |
| POST | `/transactions` | Sim | Cria uma transação. |
| PUT | `/transactions/:id` | Sim | Atualiza uma transação. |
| DELETE | `/transactions/:id` | Sim | Exclui uma transação. |
| GET | `/categories` | Sim | Lista as categorias. |
| POST | `/categories` | Sim | Cria uma categoria. |
| PUT | `/categories/:id` | Sim | Atualiza uma categoria. |
| DELETE | `/categories/:id` | Sim | Exclui uma categoria. |
| GET | `/goals` | Sim | Lista as metas. |
| GET | `/goals/:id` | Sim | Busca uma meta. |
| POST | `/goals` | Sim | Cria uma meta. |
| PUT | `/goals/:id` | Sim | Atualiza uma meta. |
| DELETE | `/goals/:id` | Sim | Exclui uma meta. |
| GET | `/budgets?month=` | Sim | Lista os orçamentos do mês. |
| GET | `/budgets/usage?month=` | Sim | Mostra o uso dos orçamentos no mês. |
| POST | `/budgets` | Sim | Cria um orçamento. |
| PUT | `/budgets/:id` | Sim | Atualiza um orçamento. |
| DELETE | `/budgets/:id` | Sim | Exclui um orçamento. |
| GET | `/dashboard?period=` | Sim | Dados consolidados do dashboard. |
| GET | `/reports/financial?start_date=&end_date=` | Sim | Relatório financeiro do período. |
| GET | `/insights/financial?start_date=&end_date=` | Sim | Insights do período. |
| POST | `/ai/chat` | Sim | Chat financeiro com IA (tools limitadas aos dados do usuário). |
| GET | `/ai/tools` | Sim | Metadados das ferramentas disponíveis para a IA. |
| POST | `/installments/plans` | Sim | Cria um plano de parcelamento. |
| GET | `/installments/plans` | Sim | Lista todos os planos do usuário. |
| GET | `/installments/plans/:id` | Sim | Busca um plano com suas parcelas. |
| POST | `/installments/plans/:id/pay` | Sim | Marca uma parcela como paga (body: `{ "transactionId": "uuid" }`). |
| DELETE | `/installments/plans/:id` | Sim | Exclui o plano (mantém parcelas pagas, remove agendadas). |
| GET | `/installments/upcoming?start_date=&end_date=` | Sim | Parcelas futuras agrupadas por mês. |
| GET | `/bank/status` | Sim | Indica se a integração está configurada e lista as conexões. |
| POST | `/bank/connections` | Sim | Salva a conexão (`{ "itemId": "<uuid>" }`) após validar que há cartão/conta. Rate limit: 3/min. |
| DELETE | `/bank/connections/:id` | Sim | Remove a conexão; as transações importadas são mantidas. |
| POST | `/bank/sync` | Sim | Importa/atualiza as transações (janela 120 dias; upsert por external_id). Rate limit: 3/min. |
| POST | `/bank/categorize` | Sim | Categoriza transações importadas ainda em categoria genérica (regras locais + IA; até 10 categorias novas). Rate limit: 5/min. |

---

### Health check

`GET /api/health`

Responde `200` com `database: "connected"` quando o banco responde, ou `500` com `status: "error"` e `database: "disconnected"` quando não responde. `aiConfigured` informa apenas se há um provedor de IA configurado; não faz uma chamada faturável ao provedor.

### Auth

#### `POST /api/auth/register`

```json
{
  "name": "Maria Silva",
  "email": "maria@exemplo.com",
  "password": "minhasenha"
}
```

Regras: nome, e-mail e senha são obrigatórios; o nome precisa de ao menos 2 caracteres e a senha de ao menos 6.

- `201`: `{ "message": "Usuário criado com sucesso.", "user": { ... } }`
- `400`: validação.
- `409`: `E-mail já cadastrado.`

#### `POST /api/auth/login`

```json
{ "email": "maria@exemplo.com", "password": "minhasenha" }
```

- `200`:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "uuid", "name": "Maria Silva", "email": "maria@exemplo.com" }
}
```

- `400`: e-mail ou senha ausentes.
- `401`: `Credenciais inválidas.`

#### `GET /api/auth/me`

Valida o token. `200`: `{ "message": "Token válido.", "user": { "id": "...", "email": "..." } }`.

### Transações

#### `POST /api/transactions`

```json
{
  "categoryId": "uuid-da-categoria",
  "description": "Supermercado",
  "amount": 250.90,
  "type": "expense",
  "transactionDate": "2026-10-05"
}
```

- `description`, `amount`, `type` e `transactionDate` são obrigatórios; `categoryId` é opcional e, se informado, precisa ser de uma categoria do próprio usuário (`400` com `Categoria não encontrada.` caso contrário).
- `type` deve ser `income` ou `expense`; `amount` deve ser maior que zero.
- `201`: `{ "message": "Transação criada com sucesso.", "transaction": { ... } }`

#### `GET /api/transactions`

`200`: `{ "transactions": [ ... ] }`, ordenadas da data mais recente para a mais antiga. Cada item traz `id`, `category_id`, `description`, `amount`, `type`, `transaction_date`, `plan_id`, `installment_number`, `status`, `source`, `external_id` e `created_at`.

#### `PUT /api/transactions/:id`

Mesmo corpo do `POST`. Atualiza a transação do usuário autenticado.

#### `DELETE /api/transactions/:id`

Exclui a transação do usuário autenticado. `200`: `{ "message": "Transação excluída com sucesso." }`; `404`: `Transação não encontrada.`

### Categorias

#### `POST /api/categories`

```json
{ "name": "Alimentação", "type": "expense" }
```

- `201`: `{ "message": "Categoria criada com sucesso.", "category": { ... } }`
- `400`: nome/tipo ausentes ou tipo inválido.
- `409`: `Essa categoria já existe.`

#### `GET /api/categories`

`200`: `{ "categories": [ ... ] }`, ordenadas por tipo e nome.

#### `PUT /api/categories/:id`

Mesmo corpo do `POST`. Retorna `404` (`Categoria não encontrada.`) se não existir e `409` em caso de duplicidade.

#### `DELETE /api/categories/:id`

`200`: `{ "message": "Categoria excluída com sucesso." }`. As transações da categoria permanecem, sem categoria associada.

### Metas

#### `POST /api/goals`

```json
{
  "name": "Reserva de emergência",
  "targetAmount": 10000,
  "currentAmount": 1500,
  "deadline": "2027-06-30"
}
```

- `name` e `targetAmount` são obrigatórios; `currentAmount` (padrão 0) e `deadline` são opcionais.
- `targetAmount` deve ser maior que zero; `currentAmount` não pode ser negativo nem maior que `targetAmount`.
- `201`: `{ "message": "Meta criada com sucesso.", "goal": { ... } }`

#### `GET /api/goals` e `GET /api/goals/:id`

`200`: `{ "goals": [ ... ] }` ou `{ "goal": { ... } }`. Retorna `404` (`Meta não encontrada.`) para um id inexistente.

#### `PUT /api/goals/:id`

Mesmo corpo do `POST`. `200`: `{ "message": "Meta atualizada com sucesso.", "goal": { ... } }`.

#### `DELETE /api/goals/:id`

`200`: `{ "message": "Meta excluída com sucesso." }`.

### Orçamentos

O parâmetro `month` é a data do primeiro dia do mês, como `2026-10-01`.

#### `POST /api/budgets`

```json
{ "categoryId": "uuid-da-categoria", "amount": 800, "month": "2026-10-01" }
```

- Todos os campos são obrigatórios e `amount` deve ser maior que zero.
- Só é possível criar orçamento para categorias de **despesa**, e apenas um por categoria em cada mês.
- `201`: `{ "message": "Orçamento criado com sucesso.", "budget": { ... } }`
- `400`: validação, categoria inexistente, categoria que não é de despesa ou orçamento duplicado.

#### `GET /api/budgets?month=2026-10-01`

Lista os orçamentos do mês. O parâmetro `month` é obrigatório.

#### `GET /api/budgets/usage?month=2026-10-01`

Cruza cada orçamento com as despesas do mês na categoria:

```json
[
  {
    "id": "uuid",
    "category_id": "uuid",
    "category_name": "Alimentação",
    "month": "2026-10-01",
    "budget_amount": 800,
    "spent_amount": 650.4,
    "remaining_amount": 149.6,
    "percentage": 81.3,
    "status": "near_limit"
  }
]
```

#### `PUT /api/budgets/:id` e `DELETE /api/budgets/:id`

`PUT` aceita o mesmo corpo do `POST` e segue as mesmas regras de validação. Se o orçamento não existir (ou for de outro usuário), `PUT` retorna `400` e `DELETE` retorna `404`, ambos com `Orçamento não encontrado.`

### Dashboard

`GET /api/dashboard?period=month`

Valores aceitos para `period`: `month` (mês atual, padrão), `previous_month`, `3_months`, `6_months` e `year`. Qualquer outro valor é tratado como `month`.

A resposta contém:

| Campo | Conteúdo |
| --- | --- |
| `period` | `startDate`, `endDate` e o `period` aplicado. |
| `summary` | `totalIncome`, `totalExpense`, `balance`, `savingsRate`, `financialHealth` e `financialHealthLabel`. |
| `mainInsight` | Principal destaque do período. |
| `topCategory` | Categoria com maior gasto: `name`, `total` e `percentage` das despesas (`null` se não houver despesas). |
| `monthlyComparison` | Valores `current` e `previous` de receitas e despesas, mais `incomeVariation` e `expenseVariation` (variação percentual). |
| `expensesByCategory` | Despesas agrupadas por categoria. |
| `monthlyEvolution` | Lista de `{ month, income, expense }` por mês (`YYYY-MM`). |
| `upcomingInstallments` | Parcelas futuras (scheduled) agrupadas por mês. |

### Relatórios

`GET /api/reports/financial?start_date=2026-01-01&end_date=2026-10-31`

Os dois parâmetros são obrigatórios e a data inicial não pode ser maior que a final (`400` caso contrário).

```json
{
  "period": { "start_date": "2026-01-01", "end_date": "2026-10-31" },
  "summary": {
    "total_income": 0,
    "total_expense": 0,
    "balance": 0,
    "total_transactions": 0
  },
  "monthly_evolution": [],
  "expenses_by_category": []
}
```

### Insights

`GET /api/insights/financial?start_date=2026-10-01&end_date=2026-10-31`

Mesmas regras de validação dos relatórios.

```json
{
  "period": { "start_date": "2026-10-01", "end_date": "2026-10-31" },
  "summary": { "income": 0, "expense": 0, "balance": 0, "transactions": 0 },
  "insights": [
    {
      "type": "positive",
      "icon": "💰",
      "title": "Você está economizando",
      "message": "Você economizou R$ 500,00, equivalente a 12,5% das suas receitas."
    }
  ],
  "top_categories": [{ "category_name": "Alimentação", "total": 650.4 }]
}
```

`top_categories` traz até as 5 categorias com mais despesas no período.

### Parcelamentos (Installments)

#### `POST /api/installments/plans`

```json
{
  "description": "Notebook",
  "totalAmount": 5000,
  "installmentsTotal": 10,
  "firstDueDate": "2026-11-15",
  "categoryId": "uuid-da-categoria",
  "cardId": "uuid-do-cartao"
}
```

- `description`, `totalAmount`, `installmentsTotal`, `firstDueDate` obrigatórios; `categoryId` e `cardId` opcionais.
- `totalAmount` > 0; `installmentsTotal` > 0.
- Gera transações com `status = 'scheduled'`, `installment_number` de 1 a N, datas calculadas mês a mês (ajusta para último dia do mês se o dia não existir). A última parcela absorve a diferença de centavos.
- `201`: `{ "plan": { ... }, "transactions": [ ... ] }`

#### `GET /api/installments/plans`

Lista todos os planos do usuário com contagem de parcelas pagas e pendentes.

#### `GET /api/installments/plans/:id`

Busca um plano específico com suas parcelas ordenadas por `installment_number`.

#### `POST /api/installments/plans/:id/pay`

```json
{ "transactionId": "uuid-da-parcela" }
```

Marca uma parcela `scheduled` como `paid`. `200` com a transação atualizada; `404` se não encontrada ou já paga.

#### `DELETE /api/installments/plans/:id`

Exclui o plano. Parcelas `paid` ficam (sem `plan_id`); parcelas `scheduled` são removidas. `200` com o id do plano excluído; `404` se não encontrado.

#### `GET /api/installments/upcoming?start_date=2026-11-01&end_date=2027-10-31`

Parcelas futuras (`status = 'scheduled'`) agrupadas por mês (`YYYY-MM`) com soma dos valores.

### IA Contábil (AI Accounting Agent)

#### `POST /api/ai/chat`

```json
{ "message": "Quanto gastei com alimentação este mês?" }
```

- `message` obrigatório, máx. 1000 caracteres.
- Rate limit por usuário (configurado em `aiRateLimit.js`).
- Responde `503` se nenhum provedor de IA configurado; `429` se limite atingido; `422` se a IA precisou de muitos ciclos de ferramenta.
- A IA tem acesso às ferramentas: `listar_transacoes`, `resumo_por_categoria`, `projetar_parcelas`, `listar_planos_parcelamento`, `resumo_financeiro_periodo`. Todas as consultas são filtradas pelo `user_id` do token.

#### `GET /api/ai/tools`

Retorna metadados das ferramentas disponíveis (para debug).

### Sincronização bancária (Open Finance via Pluggy)

O Orvix importa as compras do cartão e movimentações de conta corrente/poupança pela [Pluggy](https://docs.pluggy.ai), agregador autorizado do Open Finance Brasil. A importação grava em `transactions` com `source = 'pluggy'` e um `external_id` único, então sincronizar de novo não duplica.

1. Conecte o banco no [MeuPluggy](https://meu.pluggy.ai) e crie uma aplicação em [dashboard.pluggy.ai](https://dashboard.pluggy.ai).
2. Defina `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no servidor e rode `npm run migrate`.
3. Na tela **Transações**, cole o *Item ID* da conexão e clique em **Conectar**; depois, **Sincronizar cartão**.

**Regras de mapeamento:**

- **Cartão de crédito:** só valores positivos viram despesa (categoria "Cartão de crédito"); parcelas aparecem com sufixo `(n/N)` e `status = 'scheduled'` se data futura, `'paid'` se passada.
- **Conta bancária (BANK):** `CREDIT` = entrada vira receita (categoria "Recebimentos"); `DEBIT` = saída vira despesa (categoria "Conta bancária").
- **Pagamentos de fatura** (que saem da conta) são ignorados para não contar em dobro com as compras do cartão.
- Janela de sincronização: 120 dias a cada execução.
- Datas futuras entram como `scheduled`.
- Recategorização manual é preservada (não sobrescreve `category_id` se já foi alterado pelo usuário).

**Categorização automática:** após cada sincronização (e no botão **Categorizar com IA**), as transações importadas que ainda estão em "Cartão de crédito", "Conta bancária" ou "Recebimentos" são classificadas em Alimentação, Mercado, Transporte etc. Primeiro por regras locais (Uber, iFood, Netflix…); o restante vai para a IA configurada (`GROQ_API_KEY`), que pode criar categorias novas (até 10 por execução). À IA vai **apenas o texto da descrição** (sem valores, datas ou dados pessoais; números longos são removidos), e Pix/TED/transferências nunca são enviados. O que você recategorizar manualmente não é alterado.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/bank/status` | Indica se a integração está configurada e lista as conexões. |
| `POST` | `/api/bank/connections` | Salva a conexão (`{ "itemId": "<uuid>" }`) após validar que há cartão/conta. Rate limit: 3/min. |
| `POST` | `/api/bank/sync` | Importa/atualiza as transações (limite de 3 por minuto por usuário). |
| `POST` | `/api/bank/categorize` | Categoriza as transações importadas ainda em categoria genérica (regras locais + IA; 5 por minuto). |
| `DELETE` | `/api/bank/connections/:id` | Remove a conexão; as transações importadas são mantidas. |

---

## Regras de negócio

### Insights de economia

Calculados sobre a taxa de economia (`saldo ÷ receitas`) do período. Sem receitas, nenhum insight de economia é gerado.

| Taxa de economia | `type` | Mensagem |
| --- | --- | --- |
| Menor que 0% | `negative` | Despesas acima das receitas |
| 0% a menos de 10% | `warning` | Margem de economia baixa |
| 10% a menos de 20% | `positive` | Você está economizando |
| 20% ou mais | `excellent` | Excelente taxa de economia |

### Insight de categoria

Destaca a maior categoria de despesa. Se ela representa **50% ou mais** das despesas do período, o insight é um alerta (`warning`); caso contrário, é informativo (`info`).

### Status dos orçamentos

Calculado por `gasto ÷ orçamento` em `GET /api/budgets/usage`:

| Percentual usado | `status` |
| --- | --- |
| Menos de 50% | `within` |
| 50% a menos de 80% | `attention` |
| 80% a menos de 100% | `near_limit` |
| 100% ou mais | `exceeded` |

### Parcelamentos

- Parcelas são criadas com `status = 'scheduled'`.
- A data de vencimento usa UTC para evitar problemas de fuso; se o dia não existir no mês (ex: 31 em fevereiro), usa o último dia do mês.
- A última parcela absorve a diferença de centavos.
- Ao pagar uma parcela (`POST /installments/plans/:id/pay`), o status muda para `'paid'`.
- Ao excluir o plano, parcelas `paid` mantêm-se (sem `plan_id`); parcelas `scheduled` são removidas.

### Categorização automática (Pluggy)

1. Regras locais (determinísticas, gratuitas, instantâneas) rodam primeiro.
2. Transações não classificadas pelas regras são agrupadas por descrição normalizada.
3. Descrições são sanitizadas para IA: remove e-mails, números longos (CPF, CNPJ, cartão), limita a 80 chars.
4. Pix/TED/transferências (detectados por regex) nunca vão para a IA; caem em "Transferências".
5. IA recebe lote de até 40 descrições distintas por chamada, máx. 120 por execução.
6. IA pode criar até 10 categorias novas por execução.
7. Resposta da IA mapeada para categorias existentes ou criadas; fallback "Outros".
8. Atualização em banco só afeta transações que ainda estão nas categorias genéricas ("Cartão de crédito", "Conta bancária", "Recebimentos").

---

## Páginas do frontend

| Página | Caminho | Função |
| --- | --- | --- |
| Login | `/` ou `/login` | Entrada na plataforma. |
| Cadastro | `/register` | Criação de conta. |
| Dashboard | `/dashboard` | Visão geral com indicadores, gráficos e parcelas futuras. |
| Transações | `/transactions` | Gerenciamento de receitas, despesas e sincronização bancária. |
| Categorias | `/categories` | Gerenciamento de categorias. |
| Metas | `/goals` | Acompanhamento de metas. |
| Orçamentos | `/budgets` | Limites mensais por categoria. |
| Parcelamentos | `/installments` | Planos de parcelamento e parcelas. |
| Relatórios | `/reports` | Relatório por período. |
| Insights | `/insights` | Análises automáticas. |

O estilo é compartilhado por um design system (`public/css/orvix-design-system.css`) e um layout comum (`app-shell.css`), com um arquivo de CSS e um de JavaScript por página. O Angular usa standalone components, services injetados e interceptors para auth.

---

## Segurança

- **Senhas:** armazenadas com hash `bcrypt` (custo 12); nunca em texto puro.
- **Sessão:** tokens JWT assinados com `JWT_SECRET`, com validade de 7 dias.
- **Isolamento de dados:** todas as consultas filtram pelo `user_id` do token.
- **SQL:** consultas parametrizadas (`$1`, `$2`, ...), sem concatenação de valores.
- **Headers HTTP:** Helmet ativo. A Content Security Policy fica desativada porque o dashboard carrega o Chart.js por CDN.
- **CORS:** aberto em desenvolvimento; em produção, só permite a origem de `CORS_ORIGIN`; sem ela, não envia permissões cross-origin (o frontend servido pelo mesmo serviço continua funcionando).
- **Rate limiting:** `express-rate-limit` em `/api/bank/sync` (3/min), `/api/bank/connections` (3/min), `/api/bank/categorize` (5/min), `/api/ai/chat` (configurado em `aiRateLimit.js`).
- **Erros:** em produção, detalhes internos não são enviados ao cliente.
- **Segredos:** o `.env` está no `.gitignore`. Nunca versione credenciais.
- **Privacidade na IA:** à IA vão apenas descrições sanitizadas (sem valores, datas, dados pessoais, números longos); Pix/TED/transferências nunca são enviados.

---

## Deploy

O projeto pode ser publicado como um único serviço Node no [Render](https://render.com/):

1. Crie um banco PostgreSQL e configure `DATABASE_URL` com a URL interna do banco.
2. Crie um *Web Service* apontando para a raiz do repositório.
3. Configure o comando de build: `npm ci && npm ci --include=dev --prefix frontend && npm run build`. O `--include=dev` é necessário porque o Angular CLI (`ng`) está nas dependências de desenvolvimento e o Render pode omiti-las em produção.
4. Configure o comando de start: `npm start`.
5. Configure `NODE_ENV=production` e `JWT_SECRET` (pelo menos 32 caracteres aleatórios). Opcionalmente, defina `CORS_ORIGIN` se o frontend estiver em outra origem e `GROQ_API_KEY` (gratuita, em console.groq.com/keys) para habilitar o chat com IA e categorização automática. `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` para sincronização bancária.
6. Configure `npm run migrate` como comando de pre-deploy após criar o banco. Ele aplica o schema base e as migrações pendentes; faça backup antes de migrações em um banco com dados.

A aplicação encerra a inicialização com erro claro se faltar `DATABASE_URL`, `JWT_SECRET` ou o build Angular. O health check `/api/health` testa a conexão com PostgreSQL; `aiConfigured` confirma apenas a presença da chave, não a validade da credencial ou disponibilidade do modelo.

---

## Progressive Web App (PWA)

O Orvix pode ser instalado pelo navegador em dispositivos compatíveis. Após acessar a aplicação por HTTPS (ou `localhost` durante o desenvolvimento), use **Instalar Orvix** quando o navegador oferecer essa opção. O service worker mantém as páginas e arquivos da interface disponíveis para abrir sem conexão; os dados financeiros e as chamadas da API não são armazenados em cache e continuam exigindo internet.

---

## Limitações conhecidas

- O comentário final do `schema.sql` diz que categorias padrão são criadas no cadastro, mas o código atual não faz isso. Cada usuário precisa criar suas categorias antes de lançar transações categorizadas ou orçamentos.
- O projeto não possui suíte automatizada de testes do backend; `npm run test:db` apenas confere a conexão com o banco.
- O token JWT fica no `localStorage` do navegador.
- A categorização por IA depende de chave externa (Groq/Anthropic); sem chave, só as regras locais funcionam.
- Sincronização Pluggy limitada a 3 requisições/minuto por usuário (rate limit da API e do nosso endpoint).

---

## Autor e licença

Desenvolvido por **Jonas Sousa**.

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE).

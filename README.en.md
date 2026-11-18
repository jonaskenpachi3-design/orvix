# ◈ ORVIX

🚀 **Live Demo**: <https://orvix-oxuw.onrender.com/>

## Financial Intelligence Platform

A web platform for personal finance control and intelligence. Combines income, expenses, categories, goals, budgets, installment plans, and bank sync (Open Finance) in a dark, responsive interface with dashboard, reports, insights, and AI accounting agent chat.

> **Control. Intelligence. Planning.**

---

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Business Rules](#business-rules)
- [Frontend Pages](#frontend-pages)
- [Security](#security)
- [Deploy](#deploy)
- [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Known Limitations](#known-limitations)
- [Author & License](#author--license)

---

## Features

- **Authentication:** Registration and login with bcrypt password hashing (cost 12) and JWT session (7-day expiry).
- **Transactions:** CRUD for income and expenses. Installment support (`scheduled`/`paid` status).
- **Categories:** User-owned categories separated by type (`income` or `expense`). **Each category has a custom icon (60 Bootstrap Icons) and color (20 presets + custom) for easy visual identification.**
- **Goals:** Target amount, current amount, and optional deadline.
- **Budgets:** Monthly limit per expense category, with usage tracking and status (`within`, `attention`, `near_limit`, `exceeded`).
- **Installment Plans:** Create installment plans with automatic installment generation, mark installments as paid, delete plan (keeps paid installments).
- **Bank Sync (Open Finance):** Import credit card purchases and checking/savings account movements via [Pluggy](https://docs.pluggy.ai) (authorized Open Finance Brazil aggregator). Idempotent upsert by `external_id`; 120-day window; ignores credit card bill payments to avoid duplication.
- **Auto-Categorization:** After each sync (and via **Categorize with AI** button), imported transactions in generic categories ("Credit Card", "Bank Account", "Incoming") are classified. First by local rules (Uber, iFood, Netflix, etc.); remaining via configured AI (`GROQ_API_KEY` free or `ANTHROPIC_API_KEY`). Only description text sent to AI (no amounts, dates, or personal data; long numbers removed). Pix/TED/transfers never sent. Manual recategorization preserved. Limit of 10 new categories per run.
- **Dashboard:** Period summary, savings rate, financial health, top category, monthly comparison, monthly evolution, expenses by category, and upcoming installments.
- **Reports:** Financial report by date range, with monthly evolution and expenses by category.
- **Insights:** Automated analyses on savings rate (negative, low, positive, excellent) and expense concentration (alert if a category ≥ 50%).
- **AI Accounting Agent:** Chat with agent that queries transactions, categories, installments, installment plans, and summaries for the authenticated user. Tools: `list_transactions`, `summary_by_category`, `project_installments`, `list_installment_plans`, `financial_summary_period`. Per-user rate limit.
- **UI:** Dark theme, responsive layout, Chart.js charts, installable PWA.

---

## Technologies

| Layer | Technologies |
| --- | --- |
| Frontend | Angular 18, Bootstrap 5, ng-bootstrap, Chart.js |
| Backend | Node.js (≥ 20.19), Express 5, REST API |
| Auth | JSON Web Token (`jsonwebtoken`), `bcryptjs` |
| Database | PostgreSQL, `pg` (node-postgres), connection pool |
| AI (chat & categorization) | Groq (free, default `openai/gpt-oss-120b`), Anthropic (`claude-sonnet-5-5`), OpenAI-compatible |
| Bank Sync | Pluggy (Open Finance Brazil) |
| Security | Helmet, CORS, `dotenv` env vars, rate limiting |
| Hosting | Render (Web Service + PostgreSQL) |
| PWA | Service Worker (Angular) |

---

## Architecture

The backend follows a layered organization where each layer has a single responsibility:

```text
HTTP Request
      │
      ▼
server.js ──► Middleware (Helmet, CORS, parsers, static files)
      │
      ▼
Routes ────► Auth Middleware (JWT)
      │
      ▼
Controllers ─► Input validation & HTTP response
      │
      ▼
Services ───► Business logic & SQL queries
      │
      ▼
PostgreSQL (connection pool in src/config/database.js)
```

In production, Express serves the Angular build from `frontend/dist/orvix-frontend`. During development, use `npm start --prefix frontend` to serve Angular and proxy `/api` to backend.

---

## Project Structure

```text
orvix/
├── db/
│   ├── migrations/             # Migrations applied by runner
│   │   ├── 001_installments.sql
│   │   ├── 002_bank_sync.sql
│   │   ├── 002_goal_contributions.sql
│   │   └── 003_category_icon_color.sql
│   └── schema.sql              # Base PostgreSQL schema
├── frontend/                   # Angular application
│   ├── src/app/
│   │   ├── core/               # Auth, API services, guards, interceptors
│   │   ├── features/           # Pages (dashboard, transactions, budgets, goals, installments, insights, reports, categories, bank-sync)
│   │   ├── shared/             # Shared components/services
│   │   └── app.routes.ts       # Angular routes
│   ├── src/assets/             # Logo and static assets
│   └── package.json
├── public/                     # Legacy pages served in development
├── src/
│   ├── config/
│   │   └── database.js         # PostgreSQL connection pool
│   ├── controllers/            # HTTP input/output
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
│   │   ├── authMiddleware.js   # JWT token validation
│   │   └── aiRateLimit.js      # AI chat rate limit
│   ├── routes/                 # Endpoint definitions
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
│   └── services/               # Business logic & SQL
│       ├── authService.js
│       ├── transactionService.js
│       ├── categoryService.js
│       ├── goalService.js
│       ├── budgetService.js
│       ├── dashboardService.js
│       ├── reportService.js
│       ├── insightService.js
│       ├── installmentService.js
│       ├── aiAccountingService.js  # AI chat + tools
│       ├── aiProviders.js          # Groq/Anthropic/OpenAI-compatible abstraction
│       ├── categorizationService.js # Auto-categorization (rules + AI)
│       ├── categoryRules.js        # Deterministic local rules
│       └── pluggyService.js        # Pluggy client + sync + upsert
├── scripts/
│   ├── run-migrations.js       # Base schema + migrations
│   └── test-db.js              # Database connection test
├── .env.example
├── package.json
└── server.js                   # Entry point
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or higher
- [PostgreSQL](https://www.postgresql.org/) running (local or cloud)
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/jonaskenpachi3-design/orvix.git
cd orvix

# 2. Install backend and frontend dependencies
npm ci
npm ci --prefix frontend

# 3. Create environment file
cp .env.example .env
# edit .env with your values (see section below)
```

### Preparing the Database

Create the database and apply the base schema and migrations:

```bash
createdb orvix
npm run migrate
```

`npm run migrate` applies the idempotent base schema, then pending migrations.

### Running

```bash
npm start
```

For frontend development, run `npm start --prefix frontend` and access `http://localhost:4200`. The backend can be started separately with `npm run dev`.

Available scripts:

| Command | Description |
| --- | --- |
| `npm start` | Starts the server. |
| `npm run dev` | Starts server with auto-reload (`node --watch`). |
| `npm run build` | Generates Angular production build. |
| `npm run migrate` | Applies base schema and pending migrations. |
| `npm run test:db` | Tests database connection using `DATABASE_URL`. |

To verify server and database are working:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "application": "Orvix", "environment": "development", "database": "connected", "aiConfigured": false }
```

---

## Environment Variables

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `PORT` | No | Server port. Default: `3000`. | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string. | `postgresql://user:pass@localhost:5432/orvix` |
| `JWT_SECRET` | Yes | Key for signing/validating tokens. Use a long random value (≥ 32 chars in production). | `a-long-random-secret` |
| `NODE_ENV` | No | `development` (default) or `production`. | `development` |
| `CORS_ORIGIN` | No | Allowed origin when frontend is on another domain. Without it in production, only same-origin calls allowed. | `https://my-orvix.onrender.com` |
| `GROQ_API_KEY` | No | Enables free AI accounting chat & categorization (Groq). Configure in provider, never in Git. | Configure in provider, never in Git. |
| `AI_MODEL` | No | Provider model; default `openai/gpt-oss-120b` (Groq) or `claude-sonnet-5-5` (Anthropic). | `openai/gpt-oss-120b` |
| `AI_PROVIDER` | No | `groq`, `anthropic` or `openai-compatible`. Auto-detected from key if omitted. | `groq` |
| `ANTHROPIC_API_KEY` | No | Paid alternative (Claude). Configure in provider, never in Git. | Configure in provider, never in Git. |
| `AI_API_KEY`, `AI_BASE_URL` | No | For `openai-compatible` (OpenRouter, Cerebras, etc.). | — |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | No | Enable credit card/account sync via Open Finance (Pluggy). Secrets: configure only in provider, never in Git. | Configure in provider, never in Git. |
| `PLUGGY_BASE_URL` | No | Pluggy API endpoint (default `https://api.pluggy.ai`). | `https://api.pluggy.ai` |

In `production`, Orvix requires `DATABASE_URL` and `JWT_SECRET` (min 32 chars), enables `trust proxy`, uses SSL for database connection, and increases connection pool from 5 to 10. `CORS_ORIGIN` is optional and restricts cross-origin calls when set; `GROQ_API_KEY` (free) or `ANTHROPIC_API_KEY` is optional and enables AI chat and auto-categorization. Generate a strong secret, e.g., `openssl rand -base64 48`; don't reuse the example value.

---

## Database

File `db/schema.sql` uses the `pgcrypto` extension (for `gen_random_uuid()`) and defines the tables below. All primary keys are UUID.

### Data Model

| Table | Key Fields | Notes |
| --- | --- | --- |
| `users` | `id`, `name`, `email` (unique), `password`, `created_at`, `updated_at` | Password stored as bcrypt hash (cost 12). |
| `categories` | `id`, `user_id`, `name`, `type`, `icon`, `color`, `created_at` | `type` is `income` or `expense`. `icon` = Bootstrap Icons name (e.g., `bi-tag`). `color` = hex color (e.g., `#DC3545`). Combo `user_id` + `name` + `type` unique. |
| `transactions` | `id`, `user_id`, `category_id`, `description`, `amount`, `type`, `transaction_date`, `plan_id`, `installment_number`, `status`, `source`, `external_id`, `created_at`, `updated_at` | `amount` > 0, `NUMERIC(12,2)`. `status` ∈ {`scheduled`, `paid`}. `source` ∈ {`manual`, `pluggy`}. `external_id` for idempotent upsert on sync. On category delete, `category_id` becomes `NULL`. |
| `installment_plans` | `id`, `user_id`, `description`, `total_amount`, `installments_total`, `first_due_date`, `category_id`, `card_id`, `created_at`, `updated_at` | Installment plan; generates transactions with `status = 'scheduled'`. |
| `goals` | `id`, `user_id`, `name`, `target_amount`, `current_amount`, `deadline`, `created_at`, `updated_at` | `target_amount` > 0 and `0 <= current_amount <= target_amount`. |
| `budgets` | `id`, `user_id`, `category_id`, `amount`, `month`, `created_at`, `updated_at` | `amount` > 0. One budget per category per month (`user_id` + `category_id` + `month` unique). `month` stores first day of month. |
| `bank_connections` | `id`, `user_id`, `provider`, `item_id`, `last_synced_at`, `created_at` | Pluggy connection (Open Finance). Unique per `user_id` + `provider` + `item_id`. |

User data is cascade-deleted when account is deleted.

---

## Authentication

1. User registers at `POST /api/auth/register` and logs in at `POST /api/auth/login`.
2. Login returns a JWT valid for **7 days**.
3. All routes except register, login, and health check require the header:

```http
Authorization: Bearer <token>
```

Frontend stores token in `localStorage` (key `orvix_token`) and sends it on API calls. Every query is filtered by the `user_id` in the token, so a user never sees another user's data.

Auth failure responses (`401`):

| Situation | Message |
| --- | --- |
| Missing header | `Token de acesso não informado.` |
| Format not `Bearer <token>` | `Formato de token inválido.` |
| Invalid or expired token | `Token inválido ou expirado.` |

---

## API Reference

Base URL: `http://localhost:3000/api`

Conventions:

- Requests and responses use JSON (`Content-Type: application/json`, 1 MB limit).
- Monetary values are numbers; dates use `YYYY-MM-DD` format.
- Errors return `{ "error": "message" }`. Unexpected errors return `500` with `Erro interno do servidor.`
- Non-existent endpoints under `/api` return `404` with `{ "message": "Endpoint da API não encontrado." }`.

### Endpoint Summary

| Method | Route | Auth | Description |
| --- | --- | :-: | --- |
| GET | `/health` | No | Checks server & DB; reports if AI key is configured. |
| POST | `/auth/register` | No | Creates account. |
| POST | `/auth/login` | No | Authenticates and returns token. |
| GET | `/auth/me` | Yes | Validates token. |
| GET | `/transactions` | Yes | Lists transactions. |
| POST | `/transactions` | Yes | Creates a transaction. |
| PUT | `/transactions/:id` | Yes | Updates a transaction. |
| DELETE | `/transactions/:id` | Yes | Deletes a transaction. |
| GET | `/categories` | Yes | Lists categories. |
| POST | `/categories` | Yes | Creates a category. |
| PUT | `/categories/:id` | Yes | Updates a category. |
| DELETE | `/categories/:id` | Yes | Deletes a category. |
| GET | `/goals` | Yes | Lists goals. |
| GET | `/goals/:id` | Yes | Gets a goal. |
| POST | `/goals` | Yes | Creates a goal. |
| PUT | `/goals/:id` | Yes | Updates a goal. |
| DELETE | `/goals/:id` | Yes | Deletes a goal. |
| GET | `/budgets?month=` | Yes | Lists budgets for month. |
| GET | `/budgets/usage?month=` | Yes | Shows budget usage for month. |
| POST | `/budgets` | Yes | Creates a budget. |
| PUT | `/budgets/:id` | Yes | Updates a budget. |
| DELETE | `/budgets/:id` | Yes | Deletes a budget. |
| GET | `/dashboard?period=` | Yes | Consolidated dashboard data. |
| GET | `/reports/financial?start_date=&end_date=` | Yes | Financial report for period. |
| GET | `/insights/financial?start_date=&end_date=` | Yes | Insights for period. |
| POST | `/ai/chat` | Yes | AI accounting chat (tools limited to user's data). |
| GET | `/ai/tools` | Yes | Metadata of tools available to AI. |
| POST | `/installments/plans` | Yes | Creates an installment plan. |
| GET | `/installments/plans` | Yes | Lists all user's plans. |
| GET | `/installments/plans/:id` | Yes | Gets a plan with its installments. |
| POST | `/installments/plans/:id/pay` | Yes | Marks an installment as paid (body: `{ "transactionId": "uuid" }`). |
| DELETE | `/installments/plans/:id` | Yes | Deletes plan (keeps paid installments, removes scheduled). |
| GET | `/installments/upcoming?start_date=&end_date=` | Yes | Upcoming installments grouped by month. |
| GET | `/bank/status` | Yes | Indicates if integration is configured and lists connections. |
| POST | `/bank/connections` | Yes | Saves connection (`{ "itemId": "<uuid>" }`) after validating card/account exists. Rate limit: 3/min. |
| DELETE | `/bank/connections/:id` | Yes | Removes connection; imported transactions kept. |
| POST | `/bank/sync` | Yes | Imports/updates transactions (120-day window; upsert by external_id). Rate limit: 3/min. |
| POST | `/bank/categorize` | Yes | Categorizes imported transactions still in generic categories (local rules + AI; up to 10 new categories). Rate limit: 5/min. |

---

### Health Check

`GET /api/health`

Returns `200` with `database: "connected"` when DB responds, or `500` with `status: "error"` and `database: "disconnected"` when it doesn't. `aiConfigured` only reports if an AI provider is configured; no billable call to provider is made.

### Auth

#### `POST /api/auth/register`

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "mypassword"
}
```

Rules: name, email, and password required; name ≥ 2 chars, password ≥ 6.

- `201`: `{ "message": "Usuário criado com sucesso.", "user": { ... } }`
- `400`: validation.
- `409`: `E-mail já cadastrado.`

#### `POST /api/auth/login`

```json
{ "email": "maria@example.com", "password": "mypassword" }
```

- `200`:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "uuid", "name": "Maria Silva", "email": "maria@example.com" }
}
```

- `400`: email or password missing.
- `401`: `Credenciais inválidas.`

#### `GET /api/auth/me`

Validates token. `200`: `{ "message": "Token válido.", "user": { "id": "...", "email": "..." } }`.

### Transactions

#### `POST /api/transactions`

```json
{
  "categoryId": "category-uuid",
  "description": "Supermarket",
  "amount": 250.90,
  "type": "expense",
  "transactionDate": "2026-10-05"
}
```

- `description`, `amount`, `type`, `transactionDate` required; `categoryId` optional and must belong to the user (`400` with `Categoria não encontrada.` otherwise).
- `type` must be `income` or `expense`; `amount` > 0.
- `201`: `{ "message": "Transação criada com sucesso.", "transaction": { ... } }`

#### `GET /api/transactions`

`200`: `{ "transactions": [ ... ] }`, ordered newest to oldest. Each item includes `id`, `category_id`, `description`, `amount`, `type`, `transaction_date`, `plan_id`, `installment_number`, `status`, `source`, `external_id`, `created_at`.

#### `PUT /api/transactions/:id`

Same body as `POST`. Updates the authenticated user's transaction.

#### `DELETE /api/transactions/:id`

Deletes the authenticated user's transaction. `200`: `{ "message": "Transação excluída com sucesso." }`; `404`: `Transação não encontrada.`

### Categories

#### `POST /api/categories`

```json
{ "name": "Food", "type": "expense", "icon": "bi-egg-fried", "color": "#FF6B6B" }
```

- `name` and `type` required; `icon` (Bootstrap Icons name) and `color` (hex) optional (defaults: `bi-tag`, `#6C757D`).
- `201`: `{ "message": "Categoria criada com sucesso.", "category": { ... } }`
- `400`: name/type missing or invalid type.
- `409`: `Essa categoria já existe.`

#### `GET /api/categories`

`200`: `{ "categories": [ ... ] }`, ordered by type and name.

#### `PUT /api/categories/:id`

Same body as `POST`. Returns `404` (`Categoria não encontrada.`) if not found and `409` on duplicate.

#### `DELETE /api/categories/:id`

`200`: `{ "message": "Categoria excluída com sucesso." }`. Transactions in the category remain, unassigned.

### Goals

#### `POST /api/goals`

```json
{
  "name": "Emergency Fund",
  "targetAmount": 10000,
  "currentAmount": 1500,
  "deadline": "2027-06-30"
}
```

- `name` and `targetAmount` required; `currentAmount` (default 0) and `deadline` optional.
- `targetAmount` > 0; `currentAmount` cannot be negative or exceed `targetAmount`.
- `201`: `{ "message": "Meta criada com sucesso.", "goal": { ... } }`

#### `GET /api/goals` and `GET /api/goals/:id`

`200`: `{ "goals": [ ... ] }` or `{ "goal": { ... } }`. Returns `404` (`Meta não encontrada.`) for non-existent id.

#### `PUT /api/goals/:id`

Same body as `POST`. `200`: `{ "message": "Meta atualizada com sucesso.", "goal": { ... } }`.

#### `DELETE /api/goals/:id`

`200`: `{ "message": "Meta excluída com sucesso." }`.

### Budgets

The `month` parameter is the first day of the month, e.g., `2026-10-01`.

#### `POST /api/budgets`

```json
{ "categoryId": "category-uuid", "amount": 800, "month": "2026-10-01" }
```

- All fields required and `amount` > 0.
- Only for **expense** categories, and only one per category per month.
- `201`: `{ "message": "Orçamento criado com sucesso.", "budget": { ... } }`
- `400`: validation, category not found, category not expense, or duplicate budget.

#### `GET /api/budgets?month=2026-10-01`

Lists budgets for the month. `month` parameter required.

#### `GET /api/budgets/usage?month=2026-10-01`

Crosses each budget with expenses for the month in that category:

```json
[
  {
    "id": "uuid",
    "category_id": "uuid",
    "category_name": "Food",
    "month": "2026-10-01",
    "budget_amount": 800,
    "spent_amount": 650.4,
    "remaining_amount": 149.6,
    "percentage": 81.3,
    "status": "near_limit"
  }
]
```

#### `PUT /api/budgets/:id` and `DELETE /api/budgets/:id`

`PUT` accepts same body as `POST` with same validation. If budget doesn't exist (or belongs to another user), `PUT` returns `400` and `DELETE` returns `404`, both with `Orçamento não encontrado.`

### Dashboard

`GET /api/dashboard?period=month`

Accepted `period` values: `month` (current month, default), `previous_month`, `3_months`, `6_months`, `year`. Any other value treated as `month`.

Response contains:

| Field | Content |
| --- | --- |
| `period` | `startDate`, `endDate`, and applied `period`. |
| `summary` | `totalIncome`, `totalExpense`, `balance`, `savingsRate`, `financialHealth`, `financialHealthLabel`. |
| `mainInsight` | Main highlight of the period. |
| `topCategory` | Highest-spend category: `name`, `total`, `percentage` of expenses (`null` if no expenses). |
| `monthlyComparison` | `current` and `previous` income/expense, plus `incomeVariation` and `expenseVariation` (percent). |
| `expensesByCategory` | Expenses grouped by category. |
| `monthlyEvolution` | List of `{ month, income, expense }` per month (`YYYY-MM`). |
| `upcomingInstallments` | Future installments (scheduled) grouped by month. |

### Reports

`GET /api/reports/financial?start_date=2026-01-01&end_date=2026-10-31`

Both parameters required; start date cannot exceed end date (`400` otherwise).

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

Same validation as reports.

```json
{
  "period": { "start_date": "2026-10-01", "end_date": "2026-10-31" },
  "summary": { "income": 0, "expense": 0, "balance": 0, "transactions": 0 },
  "insights": [
    {
      "type": "positive",
      "icon": "💰",
      "title": "You're saving",
      "message": "You saved R$ 500.00, equivalent to 12.5% of your income."
    }
  ],
  "top_categories": [{ "category_name": "Food", "total": 650.4 }]
}
```

`top_categories` returns up to 5 categories with highest expenses in the period.

### Installments

#### `POST /api/installments/plans`

```json
{
  "description": "Notebook",
  "totalAmount": 5000,
  "installmentsTotal": 10,
  "firstDueDate": "2026-11-15",
  "categoryId": "category-uuid",
  "cardId": "card-uuid"
}
```

- `description`, `totalAmount`, `installmentsTotal`, `firstDueDate` required; `categoryId` and `cardId` optional.
- `totalAmount` > 0; `installmentsTotal` > 0.
- Generates transactions with `status = 'scheduled'`, `installment_number` 1 to N, dates calculated month by month (adjusts to last day of month if day doesn't exist). Last installment absorbs cent difference.
- `201`: `{ "plan": { ... }, "transactions": [ ... ] }`

#### `GET /api/installments/plans`

Lists all user's plans with paid/pending installment counts.

#### `GET /api/installments/plans/:id`

Gets a specific plan with its installments ordered by `installment_number`.

#### `POST /api/installments/plans/:id/pay`

```json
{ "transactionId": "installment-uuid" }
```

Marks a `scheduled` installment as `paid`. `200` with updated transaction; `404` if not found or already paid.

#### `DELETE /api/installments/plans/:id`

Deletes the plan. `paid` installments remain (without `plan_id`); `scheduled` installments removed. `200` with deleted plan id; `404` if not found.

#### `GET /api/installments/upcoming?start_date=2026-11-01&end_date=2027-10-31`

Future installments (`status = 'scheduled'`) grouped by month (`YYYY-MM`) with sum of amounts.

### AI Accounting Agent

#### `POST /api/ai/chat`

```json
{ "message": "How much did I spend on food this month?" }
```

- `message` required, max 1000 chars.
- Per-user rate limit (configured in `aiRateLimit.js`).
- Returns `503` if no AI provider configured; `429` if limit reached; `422` if AI needed too many tool cycles.
- AI has tools: `list_transactions`, `summary_by_category`, `project_installments`, `list_installment_plans`, `financial_summary_period`. All queries filtered by token's `user_id`.

#### `GET /api/ai/tools`

Returns tool metadata (for debugging).

### Bank Sync (Open Finance via Pluggy)

Orvix imports credit card purchases and checking/savings movements via [Pluggy](https://docs.pluggy.ai), authorized Open Finance Brazil aggregator. Import writes to `transactions` with `source = 'pluggy'` and unique `external_id`, so re-syncing doesn't duplicate.

1. Connect your bank at [MeuPluggy](https://meu.pluggy.ai) and create an app at [dashboard.pluggy.ai](https://dashboard.pluggy.ai).
2. Set `PLUGGY_CLIENT_ID` and `PLUGGY_CLIENT_SECRET` on server and run `npm run migrate`.
3. In **Transactions** screen, paste the connection *Item ID* and click **Connect**; then **Sync Card**.

**Mapping Rules:**

- **Credit Card:** Only positive amounts become expenses (category "Credit Card"); installments appear with suffix `(n/N)` and `status = 'scheduled'` if future date, `'paid'` if past.
- **Bank Account (BANK):** `CREDIT` = incoming becomes income (category "Incoming"); `DEBIT` = outgoing becomes expense (category "Bank Account").
- **Bill Payments** (from account) ignored to avoid double-counting with card purchases.
- Sync window: 120 days per run.
- Future dates enter as `scheduled`.
- Manual recategorization preserved (doesn't overwrite `category_id` if user changed it).

**Auto-Categorization:** After each sync (and **Categorize with AI** button), imported transactions still in "Credit Card", "Bank Account", or "Incoming" are classified into Food, Market, Transport, etc. First by local rules (Uber, iFood, Netflix…); remainder to configured AI (`GROQ_API_KEY`), which can create new categories (up to 10 per run). **Only sanitized description text goes to AI** (no amounts, dates, personal data; long numbers removed), and Pix/TED/transfers never sent. Manual recategorizations are not altered.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/bank/status` | Indicates if integration is configured and lists connections. |
| `POST` | `/api/bank/connections` | Saves connection (`{ "itemId": "<uuid>" }`) after validating card/account exists. Rate limit: 3/min. |
| `POST` | `/api/bank/sync` | Imports/updates transactions (limit 3/min per user). |
| `POST` | `/api/bank/categorize` | Categorizes imported transactions still in generic categories (local rules + AI; 5/min). |
| `DELETE` | `/api/bank/connections/:id` | Removes connection; imported transactions kept. |

---

## Business Rules

### Savings Insights

Calculated on savings rate (`balance ÷ income`) for the period. No income → no savings insight.

| Savings Rate | `type` | Message |
| --- | --- | --- |
| < 0% | `negative` | Expenses exceed income |
| 0% to < 10% | `warning` | Low savings margin |
| 10% to < 20% | `positive` | You're saving |
| ≥ 20% | `excellent` | Excellent savings rate |

### Category Insight

Highlights highest expense category. If it represents **50% or more** of period expenses, insight is an alert (`warning`); otherwise informational (`info`).

### Budget Status

Calculated as `spent ÷ budget` in `GET /api/budgets/usage`:

| Percent Used | `status` |
| --- | --- |
| < 50% | `within` |
| 50% to < 80% | `attention` |
| 80% to < 100% | `near_limit` |
| ≥ 100% | `exceeded` |

### Installments

- Installments created with `status = 'scheduled'`.
- Due date uses UTC to avoid timezone issues; if day doesn't exist in month (e.g., 31 in February), uses last day of month.
- Last installment absorbs cent difference.
- Paying an installment (`POST /installments/plans/:id/pay`) changes status to `'paid'`.
- Deleting plan keeps `paid` installments (without `plan_id`); removes `scheduled` ones.

### Auto-Categorization (Pluggy)

1. Local rules (deterministic, free, instant) run first.
2. Unclassified transactions grouped by normalized description.
3. Descriptions sanitized for AI: removes emails, long numbers (CPF, CNPJ, card), limits to 80 chars.
4. Pix/TED/transfers (regex-detected) never sent to AI; go to "Transfers".
5. AI receives batch of up to 40 distinct descriptions per call, max 120 per run.
6. AI can create up to 10 new categories per run.
7. AI response mapped to existing or new categories; fallback "Other".
8. DB update only affects transactions still in generic categories ("Credit Card", "Bank Account", "Incoming").

---

## Frontend Pages

| Page | Path | Function |
| --- | --- | --- |
| Login | `/` or `/login` | Platform entry. |
| Register | `/register` | Account creation. |
| Dashboard | `/dashboard` | Overview with indicators, charts, upcoming installments. |
| Transactions | `/transactions` | Manage income, expenses, and bank sync. |
| Categories | `/categories` | Manage categories (with icons & colors). |
| Goals | `/goals` | Track goals. |
| Budgets | `/budgets` | Monthly limits per category. |
| Installments | `/installments` | Installment plans and installments. |
| Reports | `/reports` | Report by period. |
| Insights | `/insights` | Automated analyses. |

Style shared via design system (`public/css/orvix-design-system.css`) and common layout (`app-shell.css`), with one CSS and one JS file per page. Angular uses standalone components, injected services, and interceptors for auth.

---

## Security

- **Passwords:** Stored with `bcrypt` hash (cost 12); never plain text.
- **Session:** JWT tokens signed with `JWT_SECRET`, 7-day expiry.
- **Data Isolation:** All queries filter by `user_id` from token.
- **SQL:** Parameterized queries (`$1`, `$2`, ...), no value concatenation.
- **HTTP Headers:** Helmet active. CSP disabled because dashboard loads Chart.js from CDN.
- **CORS:** Open in development; in production, only allows `CORS_ORIGIN`; without it, no cross-origin permissions sent (frontend served by same service still works).
- **Rate Limiting:** `express-rate-limit` on `/api/bank/sync` (3/min), `/api/bank/connections` (3/min), `/api/bank/categorize` (5/min), `/api/ai/chat` (configured in `aiRateLimit.js`).
- **Errors:** In production, internal details not sent to client.
- **Secrets:** `.env` in `.gitignore`. Never commit credentials.
- **AI Privacy:** Only sanitized descriptions sent to AI (no amounts, dates, personal data, long numbers); Pix/TED/transfers never sent.

---

## Deploy

Deploy as a single Node service on [Render](https://render.com/):

1. Create PostgreSQL database and set `DATABASE_URL` with internal DB URL.
2. Create a *Web Service* pointing to repo root.
3. Build command: `npm ci && npm ci --include=dev --prefix frontend && npm run build`. `--include=dev` needed because Angular CLI (`ng`) is in devDependencies and Render may omit them in production.
4. Start command: `npm start`.
5. Set `NODE_ENV=production` and `JWT_SECRET` (min 32 random chars). Optionally set `CORS_ORIGIN` if frontend on another origin and `GROQ_API_KEY` (free, at console.groq.com/keys) for AI chat and auto-categorization. `PLUGGY_CLIENT_ID` and `PLUGGY_CLIENT_SECRET` for bank sync.
6. Set `npm run migrate` as pre-deploy command after creating DB. Applies base schema and pending migrations; backup before migrations on DB with data.

App fails fast on startup if `DATABASE_URL`, `JWT_SECRET`, or Angular build missing. Health check `/api/health` tests PostgreSQL connection; `aiConfigured` only confirms key presence, not credential validity or model availability.

---

## Progressive Web App (PWA)

Orvix can be installed via browser on compatible devices. After accessing the app over HTTPS (or `localhost` during development), use **Install Orvix** when browser offers it. Service worker caches UI pages and assets for offline opening; financial data and API calls not cached and still require internet.

---

## Known Limitations

- `schema.sql` final comment says default categories created on registration, but current code doesn't do this. Each user must create categories before adding categorized transactions or budgets.
- No automated backend test suite; `npm run test:db` only checks DB connection.
- JWT token stored in browser `localStorage`.
- AI categorization depends on external key (Groq/Anthropic); without key, only local rules work.
- Pluggy sync limited to 3 requests/minute per user (API rate limit + our endpoint limit).

---

## Author & License

Developed by **Jonas Sousa**.

Distributed under the **MIT** license. See [LICENSE](LICENSE) file.
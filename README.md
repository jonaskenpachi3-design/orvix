# ◈ ORVIX

### Financial Intelligence Platform

🚀 **Demo:** https://orvix-oxuw.onrender.com/

Plataforma web de controle e inteligência financeira pessoal. Reúne receitas, despesas, categorias, metas e orçamentos em uma interface escura e responsiva, com dashboard, relatórios e insights gerados a partir das movimentações do usuário.

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
- [Limitações conhecidas](#limitações-conhecidas)
- [Autor e licença](#autor-e-licença)

---

## Funcionalidades

- **Autenticação:** cadastro e login com senha criptografada e sessão via JWT.
- **Transações:** cadastro, listagem, edição e exclusão de receitas e despesas.
- **Categorias:** categorias próprias do usuário, separadas por tipo (receita ou despesa).
- **Metas:** metas com valor alvo, valor atual e prazo opcional.
- **Orçamentos:** limite mensal por categoria de despesa, com acompanhamento do quanto já foi gasto.
- **Dashboard:** resumo do período, taxa de economia, saúde financeira, categoria principal, comparação mensal e gráficos.
- **Relatórios:** relatório financeiro por intervalo de datas, com evolução mensal e despesas por categoria.
- **Insights:** análises automáticas sobre a taxa de economia e a concentração de gastos.
- **Interface:** tema escuro, layout responsivo e gráficos com Chart.js.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript, [Chart.js](https://www.chartjs.org/) (via CDN) |
| Backend | Node.js (>= 20), Express 5, API REST |
| Autenticação | JSON Web Token (`jsonwebtoken`), `bcryptjs` |
| Banco de dados | PostgreSQL, `pg` (node-postgres) |
| Segurança | Helmet, CORS, variáveis de ambiente com `dotenv` |
| Hospedagem | Render |

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

O servidor Express também serve o frontend estático da pasta `public/`. A rota `/` entrega a página de login.

## Estrutura do projeto

```text
orvix/
├── db/
│   └── schema.sql              # Estrutura do banco de dados
├── public/                     # Frontend estático
│   ├── css/                    # Estilos por página + design system
│   ├── images/                 # Logo e favicon
│   ├── js/                     # Scripts por página
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── transactions.html
│   ├── categories.html
│   ├── goals.html
│   ├── budgets.html
│   ├── reports.html
│   └── insights.html
├── src/
│   ├── config/
│   │   └── database.js         # Pool de conexões PostgreSQL
│   ├── controllers/            # Entrada e saída HTTP
│   ├── middleware/
│   │   └── authMiddleware.js   # Validação do token JWT
│   ├── routes/                 # Definição dos endpoints
│   └── services/               # Regras de negócio e SQL
├── scripts/
│   └── test-db.js              # Teste de conexão com o banco
├── .env.example
├── package.json
└── server.js                   # Ponto de entrada
```

## Começando

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [PostgreSQL](https://www.postgresql.org/) em execução (local ou na nuvem)
- Git

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/jonaskenpachi3-design/orvix.git
cd orvix

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de ambiente
cp .env.example .env
# edite o .env com seus valores (veja a seção abaixo)
```

### Preparando o banco

Crie o banco e aplique o schema:

```bash
createdb orvix
psql "$DATABASE_URL" -f db/schema.sql
```

### Executando

```bash
npm start
```

A aplicação sobe em `http://localhost:3000` (ou na porta definida em `PORT`). Abra essa URL no navegador para acessar o login e crie uma conta em `/register.html`.

Scripts disponíveis:

| Comando | O que faz |
| --- | --- |
| `npm start` | Inicia o servidor. |
| `npm run dev` | Inicia o servidor reiniciando a cada alteração (`node --watch`). |
| `npm run test:db` | Testa a conexão com o banco usando o `DATABASE_URL`. |

Para conferir se o servidor e o banco estão funcionando:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "application": "Orvix", "environment": "development", "database": "connected" }
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição | Exemplo |
| --- | --- | --- | --- |
| `PORT` | Não | Porta do servidor. Padrão: `3000`. | `3000` |
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL. | `postgresql://usuario:senha@localhost:5432/orvix` |
| `JWT_SECRET` | Sim | Chave usada para assinar e validar os tokens. Use um valor longo e aleatório. | `uma-chave-longa-e-aleatoria` |
| `NODE_ENV` | Não | `development` (padrão) ou `production`. | `development` |
| `CORS_ORIGIN` | Não | Em produção, restringe o CORS a essa origem. Sem ela, qualquer origem é aceita. | `https://meu-orvix.onrender.com` |

Em `production`, o Orvix também ativa `trust proxy`, usa SSL na conexão com o banco, não expõe detalhes de erros internos e aumenta o pool de conexões de 5 para 10.

## Banco de dados

O arquivo `db/schema.sql` usa a extensão `pgcrypto` (para `gen_random_uuid()`) e define as tabelas abaixo. Todas as chaves primárias são UUID.

### Modelo de dados

| Tabela | Campos principais | Observações |
| --- | --- | --- |
| `users` | `id`, `name`, `email` (único), `password`, `created_at`, `updated_at` | A senha é guardada como hash bcrypt. |
| `categories` | `id`, `user_id`, `name`, `type`, `created_at` | `type` é `income` ou `expense`. Combinação `user_id` + `name` + `type` é única. |
| `transactions` | `id`, `user_id`, `category_id`, `description`, `amount`, `type`, `transaction_date`, `created_at`, `updated_at` | `amount` > 0, `NUMERIC(12,2)`. Ao excluir a categoria, `category_id` vira `NULL`. |
| `goals` | `id`, `user_id`, `name`, `target_amount`, `current_amount`, `deadline`, `created_at`, `updated_at` | `target_amount` > 0 e `0 <= current_amount <= target_amount`. |
| `budgets` | `id`, `user_id`, `category_id`, `amount`, `month`, `created_at`, `updated_at` | `amount` > 0. Um orçamento por categoria em cada mês (`user_id` + `category_id` + `month` é único). `month` guarda o primeiro dia do mês. |

Os dados de cada usuário são removidos em cascata quando a conta é excluída.

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
| GET | `/health` | Não | Verifica servidor e banco. |
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

---

### Health check

`GET /api/health`

Responde `200` com `database: "connected"` quando o banco responde, ou `500` com `status: "error"` e `database: "disconnected"` quando não responde.

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

`200`: `{ "transactions": [ ... ] }`, ordenadas da data mais recente para a mais antiga. Cada item traz `id`, `category_id`, `description`, `amount`, `type`, `transaction_date` e `created_at`.

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

## Páginas do frontend

| Página | Caminho | Função |
| --- | --- | --- |
| Login | `/` ou `/login.html` | Entrada na plataforma. |
| Cadastro | `/register.html` | Criação de conta. |
| Dashboard | `/dashboard.html` | Visão geral com indicadores e gráficos. |
| Transações | `/transactions.html` | Gerenciamento de receitas e despesas. |
| Categorias | `/categories.html` | Gerenciamento de categorias. |
| Metas | `/goals.html` | Acompanhamento de metas. |
| Orçamentos | `/budgets.html` | Limites mensais por categoria. |
| Relatórios | `/reports.html` | Relatório por período. |
| Insights | `/insights.html` | Análises automáticas. |

O estilo é compartilhado por um design system (`public/css/orvix-design-system.css`) e um layout comum (`app-shell.css`), com um arquivo de CSS e um de JavaScript por página.

## Segurança

- **Senhas:** armazenadas com hash `bcrypt` (custo 12); nunca em texto puro.
- **Sessão:** tokens JWT assinados com `JWT_SECRET`, com validade de 7 dias.
- **Isolamento de dados:** todas as consultas filtram pelo `user_id` do token.
- **SQL:** consultas parametrizadas (`$1`, `$2`, ...), sem concatenação de valores.
- **Headers HTTP:** Helmet ativo. A Content Security Policy fica desativada porque o dashboard carrega o Chart.js por CDN.
- **CORS:** aberto em desenvolvimento; restrito por `CORS_ORIGIN` em produção, quando definida.
- **Erros:** em produção, detalhes internos não são enviados ao cliente.
- **Segredos:** o `.env` está no `.gitignore`. Nunca versione credenciais.

## Deploy

O projeto está preparado para o [Render](https://render.com/):

1. Crie um banco PostgreSQL e aplique o `db/schema.sql`.
2. Crie um *Web Service* apontando para este repositório.
3. Comando de build: `npm install`. Comando de start: `npm start`.
4. Defina `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` e, opcionalmente, `CORS_ORIGIN`.

A conexão com o banco usa SSL em produção (com `rejectUnauthorized: false`, comum em bancos gerenciados) e o Express confia no proxy do Render para identificar HTTPS corretamente.

## Limitações conhecidas

- O comentário final do `schema.sql` diz que categorias padrão são criadas no cadastro, mas o código atual não faz isso. Cada usuário precisa criar suas categorias antes de lançar transações categorizadas ou orçamentos.
- O projeto não possui testes automatizados; `npm run test:db` apenas confere a conexão com o banco.
- O token JWT fica no `localStorage` do navegador.

## Autor e licença

Desenvolvido por **Jonas Sousa**.

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE).

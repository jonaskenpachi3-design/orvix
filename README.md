# ◈ ORVIX
### Financial Intelligence Platform

Plataforma web de controle e inteligência financeira pessoal, desenvolvida para organizar receitas, despesas, metas e planejamento financeiro em uma interface moderna.

> **Controle. Inteligência. Planejamento.**

---

## 📌 Sobre o projeto

O ORVIX é uma aplicação web de finanças pessoais que centraliza informações financeiras e oferece recursos para acompanhar movimentações, visualizar indicadores e organizar objetivos financeiros.

O projeto utiliza uma arquitetura com frontend web, API REST, autenticação de usuários e banco de dados PostgreSQL.

## ✨ Funcionalidades

- Dashboard com resumo financeiro.
- Visualização de receitas, despesas e saldo.
- Cadastro e gerenciamento de transações.
- Organização de categorias financeiras.
- Criação e acompanhamento de metas.
- Planejamento de orçamentos.
- Relatórios financeiros.
- Insights para análise das movimentações.
- Autenticação e gerenciamento de acesso.
- Gráficos para visualização de dados financeiros.
- Interface responsiva e tema visual escuro.

> A disponibilidade de cada funcionalidade depende da implementação presente na versão publicada.

## 🛠️ Tecnologias

### Frontend
- HTML5
- CSS3
- JavaScript
- Chart.js

### Backend
- Node.js
- Express
- API REST
- JSON Web Token (JWT)
- bcryptjs

### Banco de dados
- PostgreSQL
- node-postgres (`pg`)

### Segurança e infraestrutura
- Helmet
- CORS
- Variáveis de ambiente com dotenv
- Git e GitHub
- Render para hospedagem

## 🏗️ Arquitetura

O projeto é organizado em camadas para separar as responsabilidades da aplicação:

- **Frontend:** páginas, estilos e interações com o usuário.
- **Rotas:** definição dos endpoints da API.
- **Controllers:** tratamento das requisições HTTP.
- **Services:** lógica de negócio, quando implementada.
- **Middleware:** autenticação e processamento intermediário.
- **Config:** configuração da conexão com o banco de dados.
- **Database:** armazenamento persistente das informações.

## 📁 Estrutura do projeto

```text
orvix/
├── db/
├── public/
│   ├── css/
│   ├── js/
│   ├── dashboard.html
│   ├── transactions.html
│   ├── goals.html
│   ├── budgets.html
│   ├── categories.html
│   ├── reports.html
│   └── insights.html
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── utils/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── server.js

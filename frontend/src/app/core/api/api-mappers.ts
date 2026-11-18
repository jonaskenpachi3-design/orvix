/**
 * Mapeadores entre o contrato REAL do backend Express e os modelos usados pelas telas.
 *
 * Funções puras (sem Angular), para ficarem fáceis de testar. Cada cliente de API
 * aplica o mapeador com `map(...)`, então as telas continuam lendo o mesmo modelo.
 *
 * Observações sobre o backend:
 *  - colunas NUMERIC do PostgreSQL chegam como string ("100.00"): usar toNumber();
 *  - colunas DATE chegam como ISO ("2026-11-05T00:00:00.000Z"): usar toDateOnly();
 *  - o dashboard responde em camelCase; relatórios, insights e demais em snake_case.
 */
import type { DashboardResponse, MainInsight } from './dashboard.api';
import type { ReportResponse } from './report.api';
import type { Budget, BudgetUsage } from './budget.api';
import type { Transaction } from './transaction.api';
import type { Goal } from './goal.api';
import type { InsightsResponse } from './insight.api';

export type InsightKind = 'positive' | 'negative' | 'warning' | 'info' | 'excellent';

// ---------------------------------------------------------------- utilitários

export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** "2026-11-05T00:00:00.000Z" ou "2026-11-05" -> "2026-11-05" ('' se inválido). */
export function toDateOnly(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

/** Aceita um array direto ou um objeto { [key]: array }. */
export function asArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  const inner = (value as Record<string, unknown> | null | undefined)?.[key];
  return Array.isArray(inner) ? (inner as T[]) : [];
}

export function normalizeInsightType(type: unknown): InsightKind {
  switch (type) {
    case 'positive':
    case 'warning':
    case 'info':
    case 'excellent':
      return type;
    case 'negative':
    case 'critical':
    case 'danger':
      return 'negative';
    default:
      return 'info';
  }
}

/** O backend manda emojis no campo `icon`; a interface usa Bootstrap Icons. */
export function insightIconClass(type: InsightKind): string {
  const icons: Record<InsightKind, string> = {
    positive: 'bi bi-graph-up-arrow',
    excellent: 'bi bi-stars',
    negative: 'bi bi-exclamation-octagon',
    warning: 'bi bi-exclamation-triangle',
    info: 'bi bi-lightbulb',
  };
  return icons[type];
}

function withPercentages<T extends { total: number }>(items: T[]): (T & { percentage: number })[] {
  const sum = items.reduce((acc, item) => acc + item.total, 0);
  return items.map((item) => ({
    ...item,
    percentage: sum > 0 ? Math.round((item.total / sum) * 1000) / 10 : 0,
  }));
}

// ------------------------------------------------------------------ dashboard

export interface RawDashboard {
  summary?: {
    totalIncome?: unknown;
    totalExpense?: unknown;
    balance?: unknown;
    totalTransactions?: unknown;
    savingsRate?: unknown;
    financialHealth?: string;
  };
  mainInsight?: { type?: string; icon?: string; title?: string; message?: string };
  topCategory?: { name?: string; total?: unknown; percentage?: unknown } | null;
  expensesByCategory?: { category?: string | null; total?: unknown }[];
  monthlyEvolution?: { month: string; income?: unknown; expense?: unknown }[];
}

export function mapDashboard(raw: RawDashboard): DashboardResponse {
  const s = raw.summary ?? {};
  const income = toNumber(s.totalIncome);
  const expense = toNumber(s.totalExpense);

  const categories = withPercentages(
    (raw.expensesByCategory ?? []).map((c) => ({
      name: c.category || 'Sem categoria',
      total: toNumber(c.total),
    })),
  ).map((c) => ({
    category_id: c.name, // o backend não envia o id; o nome identifica a categoria
    category_name: c.name,
    total: c.total,
    percentage: c.percentage,
    type: 'expense' as const,
  }));

  const kind = normalizeInsightType(raw.mainInsight?.type);
  const insightType: MainInsight['type'] = kind === 'excellent' ? 'positive' : kind;

  const top = raw.topCategory;

  return {
    summary: {
      income,
      expense,
      balance: s.balance === undefined ? income - expense : toNumber(s.balance),
      transactions_count: toNumber(s.totalTransactions),
    },
    evolution: (raw.monthlyEvolution ?? []).map((p) => ({
      month: p.month,
      income: toNumber(p.income),
      expense: toNumber(p.expense),
      balance: toNumber(p.income) - toNumber(p.expense),
    })),
    category_breakdown: categories,
    main_insight: {
      type: insightType,
      icon: insightIconClass(kind),
      title: raw.mainInsight?.title ?? 'Visão financeira',
      message: raw.mainInsight?.message ?? '',
    },
    saving_rate: toNumber(s.savingsRate),
    top_category: top
      ? {
          category_id: top.name ?? 'Sem categoria',
          category_name: top.name ?? 'Sem categoria',
          total: toNumber(top.total),
          percentage: toNumber(top.percentage),
          type: 'expense',
        }
      : null,
    financial_status: s.financialHealth ?? 'critical',
  };
}

// ----------------------------------------------------------------- relatórios

interface RawCategoryTotal {
  category_id: string;
  category_name: string;
  total: unknown;
}

export interface RawReport {
  period?: { start_date: string; end_date: string };
  summary?: {
    total_income?: unknown;
    total_expense?: unknown;
    balance?: unknown;
    total_transactions?: unknown;
  };
  monthly_evolution?: { month: string; income?: unknown; expense?: unknown }[];
  expenses_by_category?: RawCategoryTotal[];
  incomes_by_category?: RawCategoryTotal[];
}

export function mapReport(raw: RawReport): ReportResponse {
  const s = raw.summary ?? {};
  const income = toNumber(s.total_income);
  const expense = toNumber(s.total_expense);

  const group = (rows: RawCategoryTotal[] | undefined, type: 'income' | 'expense') =>
    withPercentages(
      (rows ?? []).map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        total: toNumber(r.total),
      })),
    ).map((r) => ({ ...r, type }));

  return {
    summary: {
      income,
      expense,
      balance: s.balance === undefined ? income - expense : toNumber(s.balance),
      transactions_count: toNumber(s.total_transactions),
    },
    evolution: (raw.monthly_evolution ?? []).map((p) => ({
      month: p.month,
      income: toNumber(p.income),
      expense: toNumber(p.expense),
      balance: toNumber(p.income) - toNumber(p.expense),
    })),
    category_breakdown: [
      ...group(raw.expenses_by_category, 'expense'),
      ...group(raw.incomes_by_category, 'income'),
    ],
    period: raw.period ?? { start_date: '', end_date: '' },
  };
}

// ------------------------------------------------------------------ orçamentos

interface RawBudget {
  id: string;
  category_id: string;
  category_name?: string;
  amount: unknown;
  month: string;
}

interface RawBudgetUsage {
  id: string;
  category_id: string;
  category_name: string;
  month?: string;
  budget_amount: unknown;
  spent_amount: unknown;
  remaining_amount: unknown;
  percentage: unknown;
}

export function mapBudgets(raw: unknown): Budget[] {
  return asArray<RawBudget>(raw, 'budgets').map((b) => ({
    id: b.id,
    category_id: b.category_id,
    amount: toNumber(b.amount),
    month: toDateOnly(b.month),
    category: { id: b.category_id, name: b.category_name ?? '' },
  }));
}

export function mapBudgetUsage(raw: unknown): BudgetUsage[] {
  return asArray<RawBudgetUsage>(raw, 'usage').map((u) => ({
    budget_id: u.id,
    category_id: u.category_id,
    category_name: u.category_name,
    budget_amount: toNumber(u.budget_amount),
    spent: toNumber(u.spent_amount),
    remaining: toNumber(u.remaining_amount),
    percentage: toNumber(u.percentage),
  }));
}

// ------------------------------------------------------------------ transações

export interface RawTransaction {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  category_type?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  description: string;
  amount: unknown;
  type: 'income' | 'expense';
  transaction_date: string;
  status?: 'paid' | 'scheduled' | null;
  plan_id?: string | null;
  installment_number?: number | null;
}

export function mapTransaction(raw: RawTransaction): Transaction {
  return {
    id: raw.id,
    category_id: raw.category_id,
    description: raw.description,
    amount: toNumber(raw.amount),
    type: raw.type,
    transaction_date: toDateOnly(raw.transaction_date),
    status: raw.status ?? 'paid',
    plan_id: raw.plan_id ?? null,
    installment_number: raw.installment_number ?? null,
    category:
      raw.category_id && raw.category_name
        ? {
            id: raw.category_id,
            name: raw.category_name,
            type: raw.category_type ?? raw.type,
            icon: raw.category_icon ?? 'bi-tag',
            color: raw.category_color ?? (raw.category_type === 'income' ? '#28A745' : '#DC3545'),
          }
        : undefined,
  };
}

// ----------------------------------------------------------------------- metas

export interface RawGoal {
  id: string;
  name: string;
  target_amount: unknown;
  current_amount: unknown;
  deadline?: string | null;
  created_at: string;
}

export function mapGoal(raw: RawGoal): Goal {
  const target = toNumber(raw.target_amount);
  const current = toNumber(raw.current_amount);
  return {
    id: raw.id,
    name: raw.name,
    target_amount: target,
    current_amount: current,
    deadline: raw.deadline ? toDateOnly(raw.deadline) : null,
    created_at: raw.created_at,
    progress: target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0,
  };
}

// -------------------------------------------------------------------- insights

export interface RawInsights {
  summary?: { income?: unknown; expense?: unknown; balance?: unknown; transactions?: unknown };
  insights?: { type?: string; icon?: string; title?: string; message?: string }[];
  top_categories?: { category_name?: string; total?: unknown }[];
  period?: { start_date: string; end_date: string };
}

export function mapInsights(raw: RawInsights): InsightsResponse {
  const s = raw.summary ?? {};
  const income = toNumber(s.income);
  const expense = toNumber(s.expense);

  return {
    summary: {
      income,
      expense,
      balance: s.balance === undefined ? income - expense : toNumber(s.balance),
      transactions: toNumber(s.transactions),
    },
    insights: (raw.insights ?? []).map((i) => {
      const kind = normalizeInsightType(i.type);
      return {
        type: kind,
        icon: insightIconClass(kind),
        title: i.title ?? '',
        message: i.message ?? '',
      };
    }),
    // percentual em relação ao total de despesas do período
    top_categories: (raw.top_categories ?? []).map((c) => {
      const total = toNumber(c.total);
      return {
        category_id: c.category_name ?? 'Sem categoria',
        category_name: c.category_name ?? 'Sem categoria',
        total,
        percentage: expense > 0 ? Math.round((total / expense) * 1000) / 10 : 0,
      };
    }),
    period: raw.period ?? { start_date: '', end_date: '' },
  };
}

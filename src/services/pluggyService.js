"use strict";

/**
 * Sincronização de transações de cartão de crédito e conta bancária via Pluggy (Open Finance Brasil).
 *
 * Variáveis de ambiente (somente no servidor, nunca no Git):
 *   PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET
 *   PLUGGY_BASE_URL (opcional, padrão https://api.pluggy.ai)
 */

const pool = require("../config/database");

const DEFAULT_BASE_URL = "https://api.pluggy.ai";
const API_KEY_TTL_MS = 100 * 60 * 1000;     // a apiKey da Pluggy dura 2h; renova antes
const REQUEST_TIMEOUT_MS = 20000;
const MAX_PAGES = 20;                       // teto de páginas por conta (500 itens/página)
const SYNC_WINDOW_DAYS = 120;               // janela fixa; o upsert é idempotente, então reler é seguro
const CARD_CATEGORY_NAME = "Cartão de crédito";
const BANK_EXPENSE_CATEGORY_NAME = "Conta bancária";
const BANK_INCOME_CATEGORY_NAME = "Recebimentos";
// Pagamento da fatura sai da conta, mas as compras já foram importadas do cartão: ignorar evita contar em dobro
const CARD_BILL_PAYMENT_RE = /pag(amento|to|\.)?\s*(de\s*|da\s*)?fatura|fatura\s*(do\s*|de\s*)?cart[aã]o|cart[aã]o\s*de\s*cr[eé]dito.*fatura/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class PluggyError extends Error {
    constructor(message, { status = 502, code = "upstream" } = {}) {
        super(message);
        this.name = "PluggyError";
        this.status = status;
        this.code = code;
    }
}

function getConfig(env = process.env) {
    const clientId = (env.PLUGGY_CLIENT_ID || "").trim();
    const clientSecret = (env.PLUGGY_CLIENT_SECRET || "").trim();
    const baseUrl = ((env.PLUGGY_BASE_URL || "").trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
    return { clientId, clientSecret, baseUrl, configured: Boolean(clientId && clientSecret) };
}

function isConfigured() {
    return getConfig().configured;
}

function isValidItemId(value) {
    return typeof value === "string" && UUID_RE.test(value.trim());
}

// ========================================
// CLIENTE HTTP
// ========================================

let cachedKey = { value: null, expiresAt: 0 };

function createClient(deps = {}) {
    const fetchImpl = deps.fetch || globalThis.fetch;
    const config = deps.config || getConfig();
    const now = deps.now || (() => Date.now());
    const cache = deps.cache || cachedKey;

    async function request(url, options = {}) {
        let response;
        try {
            response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        } catch (error) {
            const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
            throw new PluggyError(
                timedOut ? "Tempo esgotado ao falar com a Pluggy." : "Falha de rede ao falar com a Pluggy.",
                { status: timedOut ? 504 : 502, code: timedOut ? "timeout" : "network" }
            );
        }

        let data = null;
        try {
            data = JSON.parse(await response.text());
        } catch {
            data = null;
        }

        if (!response.ok) {
            const status = response.status;
            const detail = data?.message || `HTTP ${status}`;
            if (status === 401 || status === 403) {
                throw new PluggyError("Credenciais da Pluggy inválidas ou sem permissão.", { status: 503, code: "auth" });
            }
            if (status === 404) {
                throw new PluggyError("Conexão não encontrada na Pluggy.", { status: 404, code: "not_found" });
            }
            if (status === 429) {
                throw new PluggyError("Limite de requisições da Pluggy atingido. Tente mais tarde.", { status: 429, code: "rate_limit" });
            }
            throw new PluggyError(`Erro da Pluggy: ${detail}`, { status: 502, code: "upstream" });
        }

        return data;
    }

    async function getApiKey() {
        if (cache.value && cache.expiresAt > now()) {
            return cache.value;
        }
        if (!config.configured) {
            throw new PluggyError("Pluggy não configurada no servidor.", { status: 503, code: "not_configured" });
        }

        const data = await request(`${config.baseUrl}/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret })
        });

        if (!data?.apiKey) {
            throw new PluggyError("Resposta de autenticação inválida da Pluggy.");
        }

        cache.value = data.apiKey;
        cache.expiresAt = now() + API_KEY_TTL_MS;
        return cache.value;
    }

    async function get(urlOrPath, params = {}) {
        const apiKey = await getApiKey();
        const url = new URL(urlOrPath, config.baseUrl);

        // nunca envia a chave para outro domínio (ex.: cursor "next" malicioso)
        if (url.origin !== new URL(config.baseUrl).origin) {
            throw new PluggyError("URL inesperada na resposta da Pluggy.");
        }

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        }

        return request(url.toString(), { method: "GET", headers: { "X-API-KEY": apiKey } });
    }

    return {
        // Contas de uma conexão (item): cartões de crédito (CREDIT) e contas correntes/poupança (BANK)
        async listAccounts(itemId) {
            const data = await get("/accounts", { itemId });
            return (data?.results || []).filter((account) => account.type === "CREDIT" || account.type === "BANK");
        },

        // Transações de uma conta, paginadas por cursor (campo "next")
        async listTransactions(accountId, dateFrom) {
            const all = [];
            let data = await get("/v2/transactions", { accountId, dateFrom });
            let pages = 1;

            all.push(...(data?.results || []));

            while (data?.next && pages < MAX_PAGES) {
                data = /^https?:\/\//i.test(data.next)
                    ? await get(data.next)
                    : await get("/v2/transactions", { accountId, dateFrom, cursor: data.next });
                all.push(...(data?.results || []));
                pages++;
            }

            return all;
        }
    };
}

// ========================================
// MAPEAMENTO PLUGGY -> ORVIX
// ========================================

function localToday(now = new Date()) {
    return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDays(isoDate, days) {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// Retorna null para o que não deve virar despesa (pagamentos de fatura, estornos, itens inválidos)
function mapCardTransaction(tx, today = localToday()) {
    const amount = Number(tx?.amount);
    const date = typeof tx?.date === "string" ? tx.date.slice(0, 10) : "";

    // No cartão, valor positivo = compra; negativo = pagamento/estorno
    if (!tx?.id || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return null;
    }

    const meta = tx.creditCardMetadata || {};
    const number = Number.parseInt(meta.installmentNumber, 10);
    const total = Number.parseInt(meta.totalInstallments, 10);
    const hasInstallments = Number.isFinite(number) && Number.isFinite(total) && total > 1;

    const base = String(tx.description || tx.descriptionRaw || "Compra no cartão").trim() || "Compra no cartão";
    const suffix = hasInstallments ? ` (${number}/${total})` : "";

    return {
        externalId: String(tx.id).slice(0, 120),
        description: (base.slice(0, 255 - suffix.length) + suffix),
        amount: Math.round(amount * 100) / 100,
        date,
        type: "expense",
        categoryName: CARD_CATEGORY_NAME,
        installmentNumber: hasInstallments ? number : null,
        // Compra já feita = gasto realizado; data futura (parcelas) = agendada
        status: date <= today ? "paid" : "scheduled"
    };
}

// Conta corrente/poupança: o sentido vem de "type" (CREDIT = entrou dinheiro, DEBIT = saiu)
function mapBankTransaction(tx, today = localToday()) {
    const amount = Math.abs(Number(tx?.amount));
    const date = typeof tx?.date === "string" ? tx.date.slice(0, 10) : "";
    const kind = String(tx?.type || "").toUpperCase();

    if (!tx?.id || !Number.isFinite(amount) || amount === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return null;
    }
    if (kind !== "CREDIT" && kind !== "DEBIT") {
        return null;
    }

    const base = String(tx.description || tx.descriptionRaw || "Movimentação bancária").trim() || "Movimentação bancária";
    const isCardPayment =
        CARD_BILL_PAYMENT_RE.test(base) || /credit card payment/i.test(String(tx.category || ""));

    if (kind === "DEBIT" && isCardPayment) {
        return null;
    }

    const income = kind === "CREDIT";

    return {
        externalId: String(tx.id).slice(0, 120),
        description: base.slice(0, 255),
        amount: Math.round(amount * 100) / 100,
        date,
        type: income ? "income" : "expense",
        categoryName: income ? BANK_INCOME_CATEGORY_NAME : BANK_EXPENSE_CATEGORY_NAME,
        installmentNumber: null,
        status: date <= today ? "paid" : "scheduled"
    };
}

// ========================================
// PERSISTÊNCIA
// ========================================

async function ensureCategory(db, userId, name, type) {
    const result = await db.query(
        `INSERT INTO categories (user_id, name, type)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, name, type) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [userId, name, type]
    );
    return result.rows[0].id;
}

// Não sobrescreve category_id: se o usuário recategorizou, a escolha é mantida
async function upsertTransaction(db, userId, categoryId, t) {
    const result = await db.query(
        `INSERT INTO transactions
            (user_id, category_id, description, amount, type, transaction_date,
             installment_number, status, source, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pluggy', $9)
         ON CONFLICT (user_id, source, external_id) DO UPDATE SET
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            type = EXCLUDED.type,
            transaction_date = EXCLUDED.transaction_date,
            installment_number = EXCLUDED.installment_number,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [userId, categoryId, t.description, t.amount, t.type, t.date, t.installmentNumber, t.status, t.externalId]
    );
    return result.rows[0].inserted === true;
}

// ========================================
// CONEXÕES
// ========================================

async function listConnections(userId, db = pool) {
    const result = await db.query(
        `SELECT id, provider, last_synced_at, created_at
         FROM bank_connections WHERE user_id = $1 ORDER BY created_at`,
        [userId]
    );
    return result.rows;
}

async function addConnection(userId, itemId, deps = {}) {
    const db = deps.db || pool;
    const client = deps.client || createClient();

    if (!isValidItemId(itemId)) {
        throw new PluggyError("itemId inválido.", { status: 400, code: "invalid_item" });
    }

    const id = itemId.trim();

    // Confirma que a conexão existe e tem conta ou cartão antes de salvar
    const accounts = await client.listAccounts(id);
    if (accounts.length === 0) {
        throw new PluggyError("Nenhuma conta ou cartão encontrado nessa conexão.", { status: 422, code: "no_accounts" });
    }

    const result = await db.query(
        `INSERT INTO bank_connections (user_id, provider, item_id)
         VALUES ($1, 'pluggy', $2)
         ON CONFLICT (user_id, provider, item_id) DO UPDATE SET item_id = EXCLUDED.item_id
         RETURNING id, provider, last_synced_at, created_at`,
        [userId, id]
    );

    return {
        ...result.rows[0],
        cards: accounts.filter((a) => a.type === "CREDIT").length,
        bankAccounts: accounts.filter((a) => a.type === "BANK").length
    };
}

async function removeConnection(userId, connectionId, db = pool) {
    const result = await db.query(
        "DELETE FROM bank_connections WHERE id = $1 AND user_id = $2",
        [connectionId, userId]
    );
    return result.rowCount > 0;
}

// ========================================
// SINCRONIZAÇÃO
// ========================================

async function syncUser(userId, deps = {}) {
    const db = deps.db || pool;
    const client = deps.client || createClient();
    const today = deps.today || localToday();

    const connections = await db.query(
        "SELECT id, item_id, last_synced_at FROM bank_connections WHERE user_id = $1 AND provider = 'pluggy'",
        [userId]
    );

    if (connections.rows.length === 0) {
        throw new PluggyError("Nenhum banco conectado.", { status: 409, code: "no_connection" });
    }

    const categoryIds = new Map();
    const categoryFor = async (name, type) => {
        const key = `${type}:${name}`;
        if (!categoryIds.has(key)) {
            categoryIds.set(key, await ensureCategory(db, userId, name, type));
        }
        return categoryIds.get(key);
    };

    const summary = { imported: 0, updated: 0, skipped: 0, cards: 0, bankAccounts: 0 };
    const dateFrom = addDays(today, -SYNC_WINDOW_DAYS);

    for (const connection of connections.rows) {
        const accounts = await client.listAccounts(connection.item_id);

        for (const account of accounts) {
            const isCard = account.type === "CREDIT";
            if (isCard) summary.cards++;
            else summary.bankAccounts++;

            const transactions = await client.listTransactions(account.id, dateFrom);

            for (const raw of transactions) {
                const mapped = isCard ? mapCardTransaction(raw, today) : mapBankTransaction(raw, today);
                if (!mapped) {
                    summary.skipped++;
                    continue;
                }
                const categoryId = await categoryFor(mapped.categoryName, mapped.type);
                const inserted = await upsertTransaction(db, userId, categoryId, mapped);
                if (inserted) summary.imported++;
                else summary.updated++;
            }
        }

        await db.query("UPDATE bank_connections SET last_synced_at = CURRENT_TIMESTAMP WHERE id = $1", [connection.id]);
    }

    return summary;
}

module.exports = {
    PluggyError,
    isConfigured,
    isValidItemId,
    createClient,
    mapCardTransaction,
    mapBankTransaction,
    listConnections,
    addConnection,
    removeConnection,
    syncUser,
    // testes
    getConfig
};

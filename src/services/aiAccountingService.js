const insightService = require("./insightService");
const installmentService = require("./installmentService");
const transactionService = require("./transactionService");
const { ProviderError, resolveConfig, createProvider } = require("./aiProviders");

// ========================================
// CONFIGURAÇÕES DE PROTEÇÃO DA IA
// ========================================

// Provedor e modelo vêm de variáveis de ambiente (ver aiProviders.js):
//   GROQ_API_KEY (gratuito, padrão) | ANTHROPIC_API_KEY (pago) | AI_PROVIDER/AI_API_KEY/AI_BASE_URL/AI_MODEL
const MAX_TOOL_CYCLES = 6;           // Teto de ciclos de ferramenta
const MAX_MESSAGE_LENGTH = 1000;     // Limite de caracteres da mensagem do usuário
const APP_TIME_ZONE = "America/Sao_Paulo";

// Erro "seguro": a mensagem pode ser mostrada ao usuário
class AIError extends Error {
    constructor(message, { status = 500, retryAfter = null } = {}) {
        super(message);
        this.name = "AIError";
        this.status = status;
        this.retryAfter = retryAfter;
    }
}

function isConfigured() {
    return resolveConfig().configured;
}

// Informações não sensíveis (para /health)
function getProviderInfo() {
    const config = resolveConfig();
    return {
        configured: config.configured,
        provider: config.configured ? config.name : null,
        model: config.configured ? config.model : null
    };
}

// ========================================
// TOOLS DISPONÍVEIS PARA A IA
// ========================================

const TOOLS = [
    {
        name: "listar_transacoes",
        description: "Lista as transações do usuário em um período. Retorna id, descrição, valor, tipo, data, categoria e status da parcela.",
        input_schema: {
            type: "object",
            properties: {
                start_date: {
                    type: "string",
                    format: "date",
                    description: "Data inicial no formato YYYY-MM-DD"
                },
                end_date: {
                    type: "string",
                    format: "date",
                    description: "Data final no formato YYYY-MM-DD"
                },
                type: {
                    type: "string",
                    enum: ["income", "expense"],
                    description: "Filtrar por tipo (opcional)"
                },
                include_scheduled: {
                    type: "boolean",
                    description: "Incluir parcelas agendadas (scheduled). Padrão: false",
                    default: false
                }
            },
            required: ["start_date", "end_date"]
        }
    },
    {
        name: "resumo_por_categoria",
        description: "Retorna o resumo de despesas agrupadas por categoria em um período.",
        input_schema: {
            type: "object",
            properties: {
                start_date: {
                    type: "string",
                    format: "date",
                    description: "Data inicial no formato YYYY-MM-DD"
                },
                end_date: {
                    type: "string",
                    format: "date",
                    description: "Data final no formato YYYY-MM-DD"
                }
            },
            required: ["start_date", "end_date"]
        }
    },
    {
        name: "projetar_parcelas",
        description: "Projeta as parcelas futuras (scheduled) agrupadas por mês para previsão de gastos.",
        input_schema: {
            type: "object",
            properties: {
                start_date: {
                    type: "string",
                    format: "date",
                    description: "Data inicial no formato YYYY-MM-DD"
                },
                end_date: {
                    type: "string",
                    format: "date",
                    description: "Data final no formato YYYY-MM-DD"
                }
            },
            required: ["start_date", "end_date"]
        }
    },
    {
        name: "listar_planos_parcelamento",
        description: "Lista todos os planos de parcelamento do usuário com contagem de parcelas pagas e pendentes.",
        input_schema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "resumo_financeiro_periodo",
        description: "Retorna resumo financeiro (receitas, despesas, saldo) de um período.",
        input_schema: {
            type: "object",
            properties: {
                start_date: {
                    type: "string",
                    format: "date",
                    description: "Data inicial no formato YYYY-MM-DD"
                },
                end_date: {
                    type: "string",
                    format: "date",
                    description: "Data final no formato YYYY-MM-DD"
                }
            },
            required: ["start_date", "end_date"]
        }
    }
];
// ========================================
// VALIDAÇÃO DAS ENTRADAS DAS TOOLS
// (modelos gratuitos erram argumentos com mais frequência)
// ========================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(now = new Date()) {
    // en-CA formata como YYYY-MM-DD
    return now.toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
}

function isValidDate(value) {
    if (typeof value !== "string" || !DATE_RE.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// Sem datas informadas, assume o mês corrente
function resolveRange(input, now = new Date()) {
    const today = todayISO(now);
    const start = input?.start_date ?? `${today.slice(0, 7)}-01`;
    const end = input?.end_date ?? today;

    if (!isValidDate(start) || !isValidDate(end)) {
        throw new Error("Datas devem estar no formato YYYY-MM-DD.");
    }
    if (start > end) {
        throw new Error("start_date não pode ser posterior a end_date.");
    }
    return { start, end };
}

function toBoolean(value) {
    return value === true || value === "true";
}

// ========================================
// EXECUÇÃO DAS TOOLS (SEMPRE FILTRADO POR USER_ID)
// ========================================

async function executeTool(userId, toolName, rawInput) {
    const input = rawInput && typeof rawInput === "object" ? rawInput : {};

    switch (toolName) {
        case "listar_transacoes": {
            const { start, end } = resolveRange(input);
            const type = input.type === "income" || input.type === "expense" ? input.type : undefined;
            const options = {
                includeScheduled: toBoolean(input.include_scheduled),
                startDate: start,
                endDate: end,
                type
            };
            const transactions = await transactionService.getTransactionsByUser(userId, options);

            const formatDate = (dateValue) => {
                if (dateValue instanceof Date) {
                    return dateValue.toISOString().split("T")[0];
                }
                return String(dateValue).split("T")[0];
            };

            return transactions.map(t => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount),
                type: t.type,
                transaction_date: formatDate(t.transaction_date),
                category_id: t.category_id,
                plan_id: t.plan_id,
                installment_number: t.installment_number,
                status: t.status
            }));
        }

        case "resumo_por_categoria": {
            const { start, end } = resolveRange(input);
            return await insightService.getCategoryExpenses(userId, start, end);
        }

        case "projetar_parcelas": {
            const { start, end } = resolveRange(input);
            return await installmentService.getUpcomingInstallments(userId, start, end);
        }

        case "listar_planos_parcelamento": {
            return await installmentService.getInstallmentPlans(userId);
        }

        case "resumo_financeiro_periodo": {
            const { start, end } = resolveRange(input);
            return await insightService.getPeriodSummary(userId, start, end);
        }

        default:
            throw new Error(`Tool desconhecida: ${toolName}`);
    }
}

// ========================================
// PROMPT DO SISTEMA PARA O AGENTE
// ========================================

function buildSystemPrompt(now = new Date()) {
    return `Você é um assistente financeiro especializado em contabilidade pessoal.
Você tem acesso a ferramentas para consultar dados financeiros do usuário.

DATA DE HOJE: ${todayISO(now)} (fuso America/Sao_Paulo). Use-a para interpretar "este mês", "mês passado", "próximos meses" etc. Datas nas ferramentas sempre no formato YYYY-MM-DD.

REGRAS IMPORTANTES:
1. SEMPRE use as ferramentas para obter dados reais - NUNCA invente números
2. Todas as consultas são automaticamente filtradas pelo usuário autenticado
3. Explique os resultados de forma clara e em português
4. Para perguntas sobre parcelas futuras, use "projetar_parcelas"
5. Para análises de gastos por categoria, use "resumo_por_categoria"
6. Para listar transações específicas, use "listar_transacoes"
7. Para visão geral do período, use "resumo_financeiro_periodo"
8. Para ver planos de parcelamento ativos, use "listar_planos_parcelamento"
9. Valores monetários estão em reais (R$)

FORMATO DE RESPOSTA:
- Responda em português
- Seja conciso mas completo
- Use formatação (bullet points, valores em destaque) quando apropriado
- Se a pergunta não puder ser respondida com as ferramentas disponíveis, explique a limitação`;
}

// ========================================
// TRADUÇÃO DE ERROS DO PROVEDOR PARA ERROS SEGUROS
// ========================================

function mapProviderError(error) {
    if (!(error instanceof ProviderError)) {
        return new AIError("Erro ao processar pergunta com IA.", { status: 500 });
    }

    if (error.code === "timeout") {
        return new AIError("A IA demorou demais para responder. Tente novamente.", { status: 504 });
    }
    if (error.code === "network") {
        return new AIError("Não foi possível falar com o provedor de IA. Tente novamente.", { status: 502 });
    }
    if (error.status === 401 || error.status === 403) {
        console.error("[IA] Chave do provedor inválida ou sem permissão.");
        return new AIError("Chat com IA indisponível: chave do provedor inválida.", { status: 503 });
    }
    if (error.status === 429) {
        return new AIError("Limite de uso da IA atingido. Tente novamente em instantes.", {
            status: 429,
            retryAfter: error.retryAfter
        });
    }
    if (error.status === 404) {
        console.error("[IA] Modelo ou endpoint não encontrado. Confira AI_MODEL/AI_BASE_URL.");
        return new AIError("Chat com IA indisponível: modelo não encontrado.", { status: 503 });
    }
    return new AIError("Erro ao processar pergunta com IA.", { status: 502 });
}

// Modelos menores às vezes geram uma chamada de ferramenta malformada; uma nova tentativa costuma resolver
function isRetryable(error) {
    return (
        error instanceof ProviderError &&
        (error.code === "tool_use_failed" || error.status === 500 || error.status === 502 || error.status === 503)
    );
}

async function completeWithRetry(provider, params) {
    try {
        return await provider.complete(params);
    } catch (error) {
        if (!isRetryable(error)) throw error;
        return await provider.complete(params);
    }
}

// ========================================
// FUNÇÃO PRINCIPAL: CHAT COM A IA
// ========================================

async function chatWithAI(userId, userMessage, deps = {}) {
    if (!userMessage || typeof userMessage !== "string") {
        throw new AIError("Mensagem inválida.", { status: 400 });
    }

    const trimmedMessage = userMessage.trim();
    if (trimmedMessage.length === 0) {
        throw new AIError("Mensagem não pode ser vazia.", { status: 400 });
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
        throw new AIError(`Mensagem muito longa. Máximo de ${MAX_MESSAGE_LENGTH} caracteres.`, { status: 400 });
    }

    const provider = deps.provider || createProvider(resolveConfig());
    if (!provider) {
        throw new AIError("Chat com IA indisponível: provedor de IA não configurado.", { status: 503 });
    }

    const system = buildSystemPrompt(deps.now);
    const history = [{ role: "user", text: trimmedMessage }];

    try {
        let toolCycles = 0;
        let reply = await completeWithRetry(provider, { system, history, tools: TOOLS });

        while (reply.toolCalls.length > 0) {
            toolCycles++;
            if (toolCycles > MAX_TOOL_CYCLES) {
                throw new AIError("A IA precisou de consultas demais para responder. Tente uma pergunta mais específica.", {
                    status: 422
                });
            }

            history.push({ role: "assistant", text: reply.text, toolCalls: reply.toolCalls });

            const results = [];
            for (const call of reply.toolCalls) {
                try {
                    if (call.inputError) {
                        throw new Error("Argumentos inválidos: envie um objeto JSON válido.");
                    }
                    const result = await executeTool(userId, call.name, call.input);
                    results.push({ id: call.id, name: call.name, content: JSON.stringify(result), isError: false });
                } catch (error) {
                    results.push({
                        id: call.id,
                        name: call.name,
                        content: JSON.stringify({ error: error.message }),
                        isError: true
                    });
                }
            }
            history.push({ role: "tool", results });

            reply = await completeWithRetry(provider, { system, history, tools: TOOLS });
        }

        return reply.text.trim() || "Não consegui gerar uma resposta. Tente reformular a pergunta.";
    } catch (error) {
        if (error instanceof AIError) throw error;
        console.error("Erro no AI Accounting Agent:", error?.name, error?.status ?? "", error?.message);
        throw mapProviderError(error);
    }
}

module.exports = {
    chatWithAI,
    isConfigured,
    getProviderInfo,
    AIError,
    TOOLS,
    // exportados para testes
    executeTool,
    buildSystemPrompt,
    MAX_TOOL_CYCLES,
    MAX_MESSAGE_LENGTH
};

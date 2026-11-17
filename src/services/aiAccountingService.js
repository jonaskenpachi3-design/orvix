const { Anthropic } = require("@anthropic-ai/sdk");
const pool = require("../config/database");
const insightService = require("./insightService");
const installmentService = require("./installmentService");
const transactionService = require("./transactionService");

// ========================================
// CONFIGURAÇÕES DE PROTEÇÃO DA IA
// ========================================

// Modelo de IA configurável via variável de ambiente
// Modelos atuais: claude-sonnet-5-5, claude-opus-5-5, claude-haiku-5-5
const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// Limites de proteção
const MAX_TOOL_CYCLES = 6;           // Teto de ciclos de ferramenta
const MAX_MESSAGE_LENGTH = 1000;     // Limite de caracteres da mensagem do usuário

// Cliente Anthropic criado de forma preguiçosa (lazy)
let anthropicClient = null;

function isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function getAnthropicClient() {
    if (!anthropicClient) {
        const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (!apiKey) {
            throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");
        }
        anthropicClient = new Anthropic({ apiKey });
    }
    return anthropicClient;
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
// EXECUÇÃO DAS TOOLS (SEMPRE FILTRADO POR USER_ID)
// ========================================

async function executeTool(userId, toolName, input) {
    switch (toolName) {
        case "listar_transacoes": {
            const { start_date, end_date, type, include_scheduled } = input;
            const options = {
                includeScheduled: include_scheduled || false,
                startDate: start_date,
                endDate: end_date,
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
            const { start_date, end_date } = input;
            return await insightService.getCategoryExpenses(userId, start_date, end_date);
        }

        case "projetar_parcelas": {
            const { start_date, end_date } = input;
            return await installmentService.getUpcomingInstallments(userId, start_date, end_date);
        }

        case "listar_planos_parcelamento": {
            return await installmentService.getInstallmentPlans(userId);
        }

        case "resumo_financeiro_periodo": {
            const { start_date, end_date } = input;
            return await insightService.getPeriodSummary(userId, start_date, end_date);
        }

        default:
            throw new Error(`Tool desconhecida: ${toolName}`);
    }
}

// ========================================
// PROMPT DO SISTEMA PARA O AGENTE
// ========================================

const SYSTEM_PROMPT = `Você é um assistente financeiro especializado em contabilidade pessoal.
Você tem acesso a ferramentas para consultar dados financeiros do usuário.

REGRAS IMPORTANTES:
1. SEMPRE use as ferramentas para obter dados reais - NUNCA invente números
2. Todas as consultas são automaticamente filtradas pelo usuário autenticado
3. Explique os resultados de forma clara e em português
4. Para perguntas sobre parcelas futuras, use "projetar_parcelas"
5. Para análises de gastos por categoria, use "resumo_por_categoria"
6. Para listar transações específicas, use "listar_transacoes"
7. Para visão geral do período, use "resumo_financeiro_periodo"
8. Para ver planos de parcelamento ativos, use "listar_planos_parcelamento"

FORMATO DE RESPOSTA:
- Responda em português
- Seja conciso mas completo
- Use formatação (bullet points, valores em destaque) quando apropriado
- Se a pergunta não puder ser respondida com as ferramentas disponíveis, explique a limitação`;

// ========================================
// FUNÇÃO PRINCIPAL: CHAT COM A IA
// ========================================

async function chatWithAI(userId, userMessage) {
    // Validação de tamanho da mensagem
    if (!userMessage || typeof userMessage !== "string") {
        throw new Error("Mensagem inválida.");
    }

    const trimmedMessage = userMessage.trim();
    if (trimmedMessage.length === 0) {
        throw new Error("Mensagem não pode ser vazia.");
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Mensagem muito longa. Máximo de ${MAX_MESSAGE_LENGTH} caracteres.`);
    }

    try {
        // Primeira chamada: usuário faz a pergunta
        let messages = [
            { role: "user", content: trimmedMessage }
        ];

        let toolCycles = 0;

        let response = await getAnthropicClient().messages.create({
            model: AI_MODEL,
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages
        });

        // Processa tool calls se houver
        while (response.stop_reason === "tool_use") {
            // Proteção: limite de ciclos de ferramenta
            toolCycles++;
            if (toolCycles > MAX_TOOL_CYCLES) {
                throw new Error(`Limite de ${MAX_TOOL_CYCLES} ciclos de ferramenta excedido.`);
            }

            const toolUses = response.content.filter(block => block.type === "tool_use");

            // Adiciona a resposta do assistente com tool_use ao histórico
            messages.push({ role: "assistant", content: response.content });

            // Executa cada tool e coleta resultados
            const toolResults = [];
            for (const toolUse of toolUses) {
                try {
                    const result = await executeTool(userId, toolUse.name, toolUse.input);
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: toolUse.id,
                        content: JSON.stringify(result)
                    });
                } catch (error) {
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: toolUse.id,
                        content: JSON.stringify({ error: error.message }),
                        is_error: true
                    });
                }
            }

            // Adiciona resultados das tools ao histórico
            messages.push({ role: "user", content: toolResults });

            // Próxima chamada para a IA processar os resultados
            response = await getAnthropicClient().messages.create({
                model: AI_MODEL,
                max_tokens: 4000,
                system: SYSTEM_PROMPT,
                tools: TOOLS,
                messages
            });
        }

        // Retorna a resposta final da IA
        const finalText = response.content
            .filter(block => block.type === "text")
            .map(block => block.text)
            .join("\n");

        return finalText;

    } catch (error) {
        console.error("Erro no AI Accounting Agent:", error);
        // Não vaza detalhes internos para o usuário
        if (error.message.includes("ANTHROPIC_API_KEY") ||
            error.message.includes("Limite de") ||
            error.message.includes("Mensagem") ||
            error.message.includes("Máximo de")) {
            throw error;
        }
        throw new Error("Erro ao processar pergunta com IA.");
    }
}

module.exports = {
    chatWithAI,
    isConfigured,
    TOOLS,
    // Exporta constantes para testes/debug se necessário
    MAX_TOOL_CYCLES,
    MAX_MESSAGE_LENGTH,
    AI_MODEL
};
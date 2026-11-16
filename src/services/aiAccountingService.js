const { Anthropic } = require("@anthropic-ai/sdk");
const pool = require("../config/database");
const insightService = require("./insightService");
const installmentService = require("./installmentService");
const transactionService = require("./transactionService");

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

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
            const options = { includeScheduled: include_scheduled || false };
            const transactions = await transactionService.getTransactionsByUser(userId, options);

            // Filtrar por data e tipo na aplicação (mais flexível)
            const filtered = transactions.filter(t => {
                const txDate = t.transaction_date instanceof Date
                    ? t.transaction_date.toISOString().split("T")[0]
                    : String(t.transaction_date).split("T")[0];

                const dateOk = txDate >= start_date && txDate <= end_date;
                const typeOk = type ? t.type === type : true;
                return dateOk && typeOk;
            });

            return filtered.map(t => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount),
                type: t.type,
                transaction_date: txDate,
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
    try {
        // Primeira chamada: usuário faz a pergunta
        let messages = [
            { role: "user", content: userMessage }
        ];

        let response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages
        });

        // Processa tool calls se houver
        while (response.stop_reason === "tool_use") {
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
            response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
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
        throw new Error("Erro ao processar pergunta com IA.");
    }
}

module.exports = {
    chatWithAI,
    TOOLS
};
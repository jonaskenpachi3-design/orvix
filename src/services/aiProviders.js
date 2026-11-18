"use strict";

/**
 * Camada de provedores de IA do chat contábil.
 *
 * Cada provedor expõe a mesma interface:
 *     complete({ system, history, tools }) -> { text, toolCalls: [{ id, name, input, inputError? }] }
 *
 * `history` usa um formato neutro, que cada adaptador traduz para a API do provedor:
 *     { role: "user",      text }
 *     { role: "assistant", text, toolCalls: [{ id, name, input }] }
 *     { role: "tool",      results: [{ id, name, content, isError }] }
 *
 * Provedores:
 *     groq               -> plano gratuito (padrão). Variável: GROQ_API_KEY
 *     anthropic          -> Claude (pago).           Variável: ANTHROPIC_API_KEY
 *     openai-compatible  -> qualquer API no formato OpenAI (OpenRouter, Cerebras, Gemini...).
 *                           Variáveis: AI_API_KEY, AI_BASE_URL, AI_MODEL
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
// llama-3.3-70b-versatile foi desligado pela Groq em 16/08/2026 (plano gratuito); ver console.groq.com/docs/deprecations
const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5-5";
const DEFAULT_MAX_TOKENS = 3000; // modelos de raciocínio (gpt-oss) gastam tokens "pensando"
const DEFAULT_TIMEOUT_MS = 30000;

class ProviderError extends Error {
    constructor(message, { status = 0, code = null, retryAfter = null } = {}) {
        super(message);
        this.name = "ProviderError";
        this.status = status;
        this.code = code;
        this.retryAfter = retryAfter;
    }
}

function clean(value) {
    return typeof value === "string" ? value.trim() : "";
}

function positiveInt(value, fallback) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ========================================
// CONFIGURAÇÃO (a partir das variáveis de ambiente)
// ========================================

function resolveConfig(env = process.env) {
    let name = clean(env.AI_PROVIDER).toLowerCase();

    // Detecção automática, quando AI_PROVIDER não foi definido
    if (!name) {
        if (clean(env.GROQ_API_KEY)) name = "groq";
        else if (clean(env.ANTHROPIC_API_KEY)) name = "anthropic";
        else if (clean(env.AI_API_KEY) && clean(env.AI_BASE_URL)) name = "openai-compatible";
    }

    const common = {
        maxTokens: positiveInt(env.AI_MAX_TOKENS, DEFAULT_MAX_TOKENS),
        timeoutMs: positiveInt(env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
    };

    let config;

    switch (name) {
        case "groq":
            config = {
                name,
                apiKey: clean(env.GROQ_API_KEY) || clean(env.AI_API_KEY),
                baseUrl: clean(env.AI_BASE_URL) || GROQ_BASE_URL,
                model: clean(env.AI_MODEL) || GROQ_DEFAULT_MODEL
            };
            break;
        case "anthropic":
            config = {
                name,
                apiKey: clean(env.ANTHROPIC_API_KEY),
                model: clean(env.AI_MODEL) || clean(env.ANTHROPIC_MODEL) || ANTHROPIC_DEFAULT_MODEL
            };
            break;
        case "openai-compatible":
            config = {
                name,
                apiKey: clean(env.AI_API_KEY),
                baseUrl: clean(env.AI_BASE_URL),
                model: clean(env.AI_MODEL)
            };
            break;
        default:
            return { name: name || null, configured: false, ...common };
    }

    if (config.baseUrl) {
        config.baseUrl = config.baseUrl.replace(/\/+$/, "");
    }

    const configured =
        Boolean(config.apiKey) &&
        Boolean(config.model) &&
        (config.name === "anthropic" || Boolean(config.baseUrl));

    return { ...config, ...common, configured };
}

// ========================================
// ADAPTADOR: APIs NO FORMATO OPENAI (Groq e similares)
// ========================================

// Remove "format" dos JSON Schemas (nem todo modelo/provedor aceita "format": "date")
function stripFormat(schema) {
    if (Array.isArray(schema)) {
        return schema.map(stripFormat);
    }

    if (schema && typeof schema === "object") {
        const out = {};
        for (const [key, value] of Object.entries(schema)) {
            if (key === "format" && typeof value === "string") continue;
            out[key] = stripFormat(value);
        }
        return out;
    }

    return schema;
}

function toOpenAITools(tools) {
    return tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: stripFormat(tool.input_schema)
        }
    }));
}

function toOpenAIMessages(system, history) {
    const messages = [{ role: "system", content: system }];

    for (const turn of history) {
        if (turn.role === "user") {
            messages.push({ role: "user", content: turn.text });
        } else if (turn.role === "assistant") {
            const message = { role: "assistant", content: turn.text || null };
            if (turn.toolCalls?.length) {
                message.tool_calls = turn.toolCalls.map((call) => ({
                    id: call.id,
                    type: "function",
                    function: {
                        name: call.name,
                        arguments: JSON.stringify(call.input ?? {})
                    }
                }));
            }
            messages.push(message);
        } else if (turn.role === "tool") {
            for (const result of turn.results) {
                messages.push({
                    role: "tool",
                    tool_call_id: result.id,
                    name: result.name,
                    content: result.content
                });
            }
        }
    }

    return messages;
}

function parseToolArguments(raw) {
    if (raw === undefined || raw === null || raw === "") {
        return { input: {}, inputError: false };
    }

    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return { input: parsed, inputError: false };
        }
    } catch {
        // cai no retorno abaixo
    }

    return { input: {}, inputError: true };
}

function createOpenAICompatibleProvider(config, deps = {}) {
    const fetchImpl = deps.fetch || globalThis.fetch;

    return {
        name: config.name,
        model: config.model,

        async complete({ system, history, tools }) {
            const body = {
                model: config.model,
                messages: toOpenAIMessages(system, history),
                temperature: 0.2,
                max_tokens: config.maxTokens
            };

            // Sem ferramentas (ex.: categorização), não envia "tools" vazio
            if (tools?.length) {
                body.tools = toOpenAITools(tools);
                body.tool_choice = "auto";
            }

            // gpt-oss é um modelo de raciocínio: esforço baixo = respostas mais rápidas e menos tokens
            if (config.name === "groq" && config.model.startsWith("openai/gpt-oss")) {
                body.reasoning_effort = "low";
            }

            let response;

            try {
                response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(config.timeoutMs)
                });
            } catch (error) {
                const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
                throw new ProviderError(
                    timedOut ? "Tempo esgotado ao chamar o provedor." : "Falha de rede ao chamar o provedor.",
                    { code: timedOut ? "timeout" : "network" }
                );
            }

            let data = null;
            try {
                data = JSON.parse(await response.text());
            } catch {
                data = null;
            }

            if (!response.ok) {
                const apiError = data?.error;
                throw new ProviderError(apiError?.message || `HTTP ${response.status}`, {
                    status: response.status,
                    code: apiError?.code || apiError?.type || null,
                    retryAfter: response.headers.get("retry-after")
                });
            }

            const message = data?.choices?.[0]?.message;

            if (!message) {
                throw new ProviderError("Resposta vazia do provedor.", {
                    status: 502,
                    code: "empty_response"
                });
            }

            const toolCalls = (message.tool_calls || []).map((call) => ({
                id: call.id,
                name: call.function?.name,
                ...parseToolArguments(call.function?.arguments)
            }));

            return {
                text: typeof message.content === "string" ? message.content : "",
                toolCalls
            };
        }
    };
}

// ========================================
// ADAPTADOR: ANTHROPIC (Claude)
// ========================================

function toAnthropicMessages(history) {
    return history.map((turn) => {
        if (turn.role === "user") {
            return { role: "user", content: turn.text };
        }

        if (turn.role === "assistant") {
            const blocks = [];
            if (turn.text) {
                blocks.push({ type: "text", text: turn.text });
            }
            for (const call of turn.toolCalls || []) {
                blocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.input ?? {} });
            }
            return { role: "assistant", content: blocks };
        }

        return {
            role: "user",
            content: turn.results.map((result) => ({
                type: "tool_result",
                tool_use_id: result.id,
                content: result.content,
                ...(result.isError ? { is_error: true } : {})
            }))
        };
    });
}

function createAnthropicProvider(config, deps = {}) {
    let client = null;

    function getClient() {
        if (!client) {
            const factory =
                deps.createAnthropicClient ||
                ((apiKey, timeout) => {
                    // carregado só quando o provedor Anthropic é usado
                    const { Anthropic } = require("@anthropic-ai/sdk");
                    return new Anthropic({ apiKey, timeout });
                });
            client = factory(config.apiKey, config.timeoutMs);
        }
        return client;
    }

    return {
        name: config.name,
        model: config.model,

        async complete({ system, history, tools }) {
            let response;

            try {
                response = await getClient().messages.create({
                    model: config.model,
                    max_tokens: config.maxTokens,
                    system,
                    ...(tools?.length ? { tools } : {}),
                    messages: toAnthropicMessages(history)
                });
            } catch (error) {
                const headers = error?.headers;
                const retryAfter =
                    (typeof headers?.get === "function" ? headers.get("retry-after") : headers?.["retry-after"]) ?? null;
                const timedOut = /timeout/i.test(error?.name || "");

                throw new ProviderError(error?.message || "Erro do provedor.", {
                    status: Number(error?.status) || 0,
                    code: timedOut ? "timeout" : error?.error?.error?.type || null,
                    retryAfter
                });
            }

            const blocks = response?.content || [];

            return {
                text: blocks
                    .filter((block) => block.type === "text")
                    .map((block) => block.text)
                    .join("\n"),
                toolCalls: blocks
                    .filter((block) => block.type === "tool_use")
                    .map((block) => ({ id: block.id, name: block.name, input: block.input || {} }))
            };
        }
    };
}

// ========================================
// FÁBRICA
// ========================================

function createProvider(config, deps = {}) {
    if (!config?.configured) {
        return null;
    }

    return config.name === "anthropic"
        ? createAnthropicProvider(config, deps)
        : createOpenAICompatibleProvider(config, deps);
}

module.exports = {
    ProviderError,
    resolveConfig,
    createProvider,
    // exportados para teste
    toOpenAIMessages,
    toOpenAITools,
    toAnthropicMessages,
    stripFormat
};

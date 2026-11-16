const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

/**
 * Rate limiter específico para o endpoint de chat da IA.
 * Limita a 10 requisições por minuto por usuário (baseado no user_id do JWT).
 */
const aiChatRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10,             // máximo 10 requisições por janela
    message: {
        error: "Muitas requisições. Tente novamente em um minuto."
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Usa o user_id do token JWT como chave (requer authMiddleware antes)
    keyGenerator: (req) => {
        return req.user?.id || ipKeyGenerator(req);
    },
    // Skip se não tiver usuário autenticado (deixa o authMiddleware tratar)
    skip: (req) => !req.user
});

module.exports = {
    aiChatRateLimiter
};
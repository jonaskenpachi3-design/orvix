const express = require("express");

const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const { aiChatRateLimiter } = require("../middleware/aiRateLimit");

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// POST /api/ai/chat - Chat com agente de IA contábil (com rate limit)
router.post("/chat", aiChatRateLimiter, aiController.chat);

// GET /api/ai/tools - Listar tools disponíveis (para debug)
router.get("/tools", aiController.getTools);

module.exports = router;
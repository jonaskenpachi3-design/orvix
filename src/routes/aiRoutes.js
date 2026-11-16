const express = require("express");

const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// POST /api/ai/chat - Chat com agente de IA contábil
router.post("/chat", aiController.chat);

// GET /api/ai/tools - Listar tools disponíveis (para debug)
router.get("/tools", aiController.getTools);

module.exports = router;
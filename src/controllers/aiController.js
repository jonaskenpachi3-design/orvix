const aiAccountingService = require("../services/aiAccountingService");

// ========================================
// CHAT COM AGENTE DE IA CONTÁBIL
// ========================================

async function chat(req, res) {
    try {
        const { message } = req.body;

        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                error: "Mensagem é obrigatória."
            });
        }

        const normalizedMessage = message.trim();
        if (normalizedMessage.length > aiAccountingService.MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                error: `Mensagem muito longa. Máximo de ${aiAccountingService.MAX_MESSAGE_LENGTH} caracteres.`
            });
        }

        const response = await aiAccountingService.chatWithAI(req.user.id, normalizedMessage);

        return res.status(200).json({
            response
        });

    } catch (error) {
        console.error("Erro no chat com IA:", error);
        return res.status(500).json({
            error: "Erro interno do servidor ao processar pergunta."
        });
    }
}

// ========================================
// LISTAR TOOLS DISPONÍVEIS (para debug/frontend)
// ========================================

async function getTools(req, res) {
    try {
        return res.status(200).json({
            tools: aiAccountingService.TOOLS
        });
    } catch (error) {
        console.error("Erro ao buscar tools:", error);
        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

module.exports = {
    chat,
    getTools
};
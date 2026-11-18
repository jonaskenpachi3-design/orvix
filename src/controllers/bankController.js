const pluggyService = require("../services/pluggyService");

function handleError(res, error, context) {
    if (error instanceof pluggyService.PluggyError) {
        return res.status(error.status).json({ error: error.message });
    }
    console.error(`Erro em ${context}:`, error?.message);
    return res.status(500).json({ error: "Erro interno do servidor." });
}

// GET /api/bank/status
async function getStatus(req, res) {
    try {
        const connections = await pluggyService.listConnections(req.user.id);
        return res.status(200).json({
            configured: pluggyService.isConfigured(),
            connections
        });
    } catch (error) {
        return handleError(res, error, "status bancário");
    }
}

// POST /api/bank/connections  { itemId }
async function addConnection(req, res) {
    try {
        if (!pluggyService.isConfigured()) {
            return res.status(503).json({
                error: "Integração bancária indisponível: configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET."
            });
        }

        const connection = await pluggyService.addConnection(req.user.id, req.body?.itemId);
        return res.status(201).json(connection);
    } catch (error) {
        return handleError(res, error, "conectar banco");
    }
}

// POST /api/bank/sync
async function sync(req, res) {
    try {
        if (!pluggyService.isConfigured()) {
            return res.status(503).json({
                error: "Integração bancária indisponível: configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET."
            });
        }

        const summary = await pluggyService.syncUser(req.user.id);
        return res.status(200).json(summary);
    } catch (error) {
        return handleError(res, error, "sincronizar banco");
    }
}

// DELETE /api/bank/connections/:id
async function removeConnection(req, res) {
    try {
        const removed = await pluggyService.removeConnection(req.user.id, req.params.id);
        if (!removed) {
            return res.status(404).json({ error: "Conexão não encontrada." });
        }
        return res.status(204).send();
    } catch (error) {
        if (error?.code === "22P02") {
            return res.status(404).json({ error: "Conexão não encontrada." });
        }
        return handleError(res, error, "remover conexão");
    }
}

module.exports = { getStatus, addConnection, sync, removeConnection };

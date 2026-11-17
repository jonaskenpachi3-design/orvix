const transactionService = require("../services/transactionService");


async function createTransaction(req, res) {
    try {
        const {
            categoryId,
            description,
            amount,
            type,
            transactionDate,
            planId,
            installmentNumber,
            status
        } = req.body;

        if (!description || !amount || !type || !transactionDate) {
            return res.status(400).json({
                error: "Descrição, valor, tipo e data são obrigatórios."
            });
        }

        if (!["income", "expense"].includes(type)) {
            return res.status(400).json({
                error: "O tipo deve ser income ou expense."
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "O valor deve ser maior que zero."
            });
        }

        // Valida status se fornecido
        if (status && !["scheduled", "paid"].includes(status)) {
            return res.status(400).json({
                error: "Status deve ser 'scheduled' ou 'paid'."
            });
        }

        const transaction = await transactionService.createTransaction(
            req.user.id,
            categoryId,
            description.trim(),
            numericAmount,
            type,
            transactionDate,
            planId || null,
            installmentNumber || null,
            status || 'paid'
        );

        return res.status(201).json({
            message: "Transação criada com sucesso.",
            transaction
        });

    } catch (error) {
        console.error("Erro ao criar transação:", error);

        if (error.message === transactionService.CATEGORY_NOT_FOUND) {
            return res.status(400).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function getTransactions(req, res) {
    try {
        const {
            includeScheduled,
            startDate,
            endDate,
            type,
            categoryId
        } = req.query;

        const isDate = (value) =>
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value);

        const isUuid = (value) =>
            typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

        if (startDate && !isDate(startDate)) {
            return res.status(400).json({
                error: "startDate deve estar no formato YYYY-MM-DD."
            });
        }

        if (endDate && !isDate(endDate)) {
            return res.status(400).json({
                error: "endDate deve estar no formato YYYY-MM-DD."
            });
        }

        if (type && !["income", "expense"].includes(type)) {
            return res.status(400).json({
                error: "Tipo inválido."
            });
        }

        if (categoryId && !isUuid(categoryId)) {
            return res.status(400).json({
                error: "Categoria inválida."
            });
        }

        const transactions =
            await transactionService.getTransactionsByUser(req.user.id, {
                includeScheduled: includeScheduled === 'true',
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                type: type || undefined,
                categoryId: categoryId || undefined
            });

        return res.status(200).json({
            transactions
        });

    } catch (error) {
        console.error("Erro ao buscar transações:", error);

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

async function deleteTransaction(req, res) {
    try {
        const { id } = req.params;

        const transaction =
            await transactionService.deleteTransaction(
                req.user.id,
                id
            );

        if (!transaction) {
            return res.status(404).json({
                error: "Transação não encontrada."
            });
        }

        return res.status(200).json({
            message: "Transação excluída com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir transação:", error);

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

async function updateTransaction(req, res) {
    try {
        const { id } = req.params;

        const {
            categoryId,
            description,
            amount,
            type,
            transactionDate,
            planId,
            installmentNumber,
            status
        } = req.body;

        if (!description || !amount || !type || !transactionDate) {
            return res.status(400).json({
                error: "Descrição, valor, tipo e data são obrigatórios."
            });
        }

        if (!["income", "expense"].includes(type)) {
            return res.status(400).json({
                error: "O tipo deve ser income ou expense."
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "O valor deve ser maior que zero."
            });
        }

        // Valida status se fornecido
        if (status !== undefined && !["scheduled", "paid"].includes(status)) {
            return res.status(400).json({
                error: "Status deve ser 'scheduled' ou 'paid'."
            });
        }

        const transaction =
            await transactionService.updateTransaction(
                req.user.id,
                id,
                categoryId,
                description.trim(),
                numericAmount,
                type,
                transactionDate,
                planId !== undefined ? planId : null,
                installmentNumber !== undefined ? installmentNumber : null,
                status !== undefined ? status : null
            );

        if (!transaction) {
            return res.status(404).json({
                error: "Transação não encontrada."
            });
        }

        return res.status(200).json({
            message: "Transação atualizada com sucesso.",
            transaction
        });

    } catch (error) {
        console.error("Erro ao atualizar transação:", error);

        if (error.message === transactionService.CATEGORY_NOT_FOUND) {
            return res.status(400).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

module.exports = {
    createTransaction,
    getTransactions,
    deleteTransaction,
    updateTransaction
};
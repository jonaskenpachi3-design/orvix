const transactionService = require("../services/transactionService");


async function createTransaction(req, res) {
    try {
        const {
            categoryId,
            description,
            amount,
            type,
            transactionDate
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

        const transaction = await transactionService.createTransaction(
            req.user.id,
            categoryId,
            description.trim(),
            numericAmount,
            type,
            transactionDate
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
        const transactions =
            await transactionService.getTransactionsByUser(req.user.id);

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
            transactionDate
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

        const transaction =
            await transactionService.updateTransaction(
                req.user.id,
                id,
                categoryId,
                description.trim(),
                numericAmount,
                type,
                transactionDate
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
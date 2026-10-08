const budgetService = require("../services/budgetService");

async function getBudgets(req, res) {
    try {
        const { month } = req.query;

        if (!month) {
            return res.status(400).json({
                error: "O mês é obrigatório."
            });
        }

        const budgets = await budgetService.getBudgets(
            req.user.id,
            month
        );

        return res.status(200).json(budgets);

    } catch (error) {
        console.error("Erro ao buscar orçamentos:", error);

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function createBudget(req, res) {
    try {
        const {
            categoryId,
            amount,
            month
        } = req.body;

        if (!categoryId || !amount || !month) {
            return res.status(400).json({
                error: "Categoria, valor e mês são obrigatórios."
            });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({
                error: "O valor do orçamento deve ser maior que zero."
            });
        }

        const budget = await budgetService.createBudget(
            req.user.id,
            categoryId,
            Number(amount),
            month
        );

        return res.status(201).json({
            message: "Orçamento criado com sucesso.",
            budget
        });

    } catch (error) {
        console.error("Erro ao criar orçamento:", error);

        if (
            error.message === "Categoria não encontrada." ||
            error.message ===
                "Orçamentos só podem ser criados para categorias de despesas." ||
            error.message ===
                "Já existe um orçamento para esta categoria neste mês."
        ) {
            return res.status(400).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function updateBudget(req, res) {
    try {
        const { id } = req.params;

        const {
            categoryId,
            amount,
            month
        } = req.body;

        if (!categoryId || !amount || !month) {
            return res.status(400).json({
                error: "Categoria, valor e mês são obrigatórios."
            });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({
                error: "O valor do orçamento deve ser maior que zero."
            });
        }

        const budget = await budgetService.updateBudget(
            req.user.id,
            id,
            categoryId,
            Number(amount),
            month
        );

        return res.status(200).json({
            message: "Orçamento atualizado com sucesso.",
            budget
        });

    } catch (error) {
        console.error("Erro ao atualizar orçamento:", error);

        if (
            error.message === "Orçamento não encontrado." ||
            error.message === "Categoria não encontrada." ||
            error.message ===
                "Orçamentos só podem ser criados para categorias de despesas." ||
            error.message ===
                "Já existe um orçamento para esta categoria neste mês."
        ) {
            return res.status(400).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function deleteBudget(req, res) {
    try {
        const { id } = req.params;

        await budgetService.deleteBudget(
            req.user.id,
            id
        );

        return res.status(200).json({
            message: "Orçamento excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir orçamento:", error);

        if (error.message === "Orçamento não encontrado.") {
            return res.status(404).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function getBudgetUsage(req, res) {
    try {
        const { month } = req.query;

        if (!month) {
            return res.status(400).json({
                error: "O mês é obrigatório."
            });
        }

        const usage = await budgetService.getBudgetUsage(
            req.user.id,
            month
        );

        return res.status(200).json(usage);

    } catch (error) {
        console.error(
            "Erro ao buscar utilização dos orçamentos:",
            error
        );

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


module.exports = {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetUsage
};
const installmentService = require("../services/installmentService");

// ========================================
// CRIAR PLANO DE PARCELAMENTO
// ========================================

async function createInstallmentPlan(req, res) {
    try {
        const {
            description,
            totalAmount,
            installmentsTotal,
            firstDueDate,
            categoryId,
            cardId
        } = req.body;

        // Validações
        if (!description || !totalAmount || !installmentsTotal || !firstDueDate) {
            return res.status(400).json({
                error: "Descrição, valor total, número de parcelas e data da primeira parcela são obrigatórios."
            });
        }

        const numericTotalAmount = Number(totalAmount);
        const numericInstallmentsTotal = Number(installmentsTotal);

        if (!Number.isFinite(numericTotalAmount) || numericTotalAmount <= 0) {
            return res.status(400).json({
                error: "O valor total deve ser maior que zero."
            });
        }

        if (!Number.isInteger(numericInstallmentsTotal) || numericInstallmentsTotal <= 0) {
            return res.status(400).json({
                error: "O número de parcelas deve ser um inteiro maior que zero."
            });
        }

        // Valida data
        const dueDate = new Date(firstDueDate);
        if (isNaN(dueDate.getTime())) {
            return res.status(400).json({
                error: "Data da primeira parcela inválida. Use formato YYYY-MM-DD."
            });
        }

        const formattedDate = dueDate.toISOString().split("T")[0];

        const result = await installmentService.createInstallmentPlan(req.user.id, {
            description: description.trim(),
            totalAmount: numericTotalAmount,
            installmentsTotal: numericInstallmentsTotal,
            firstDueDate: formattedDate,
            categoryId,
            cardId
        });

        return res.status(201).json({
            message: "Plano de parcelamento criado com sucesso.",
            plan: result.plan,
            transactions: result.transactions
        });

    } catch (error) {
        console.error("Erro ao criar plano de parcelamento:", error);

        if (error.message === installmentService.PLAN_NOT_FOUND) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message === "Categoria não encontrada.") {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

// ========================================
// LISTAR PLANOS DE PARCELAMENTO
// ========================================

async function getInstallmentPlans(req, res) {
    try {
        const plans = await installmentService.getInstallmentPlans(req.user.id);

        return res.status(200).json({
            plans
        });

    } catch (error) {
        console.error("Erro ao buscar planos de parcelamento:", error);
        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

// ========================================
// BUSCAR PLANO COM PARCELAS
// ========================================

async function getInstallmentPlan(req, res) {
    try {
        const { id } = req.params;

        const plan = await installmentService.getInstallmentPlanWithTransactions(req.user.id, id);

        return res.status(200).json({
            plan
        });

    } catch (error) {
        console.error("Erro ao buscar plano de parcelamento:", error);

        if (error.message === installmentService.PLAN_NOT_FOUND) {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

// ========================================
// PARCELAS FUTURAS (PREVISÃO DE GASTOS)
// ========================================

async function getUpcomingInstallments(req, res) {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                error: "As datas inicial e final são obrigatórias."
            });
        }

        if (startDate > endDate) {
            return res.status(400).json({
                error: "A data inicial não pode ser maior que a data final."
            });
        }

        const installments = await installmentService.getUpcomingInstallments(
            req.user.id,
            startDate,
            endDate
        );

        return res.status(200).json({
            installments
        });

    } catch (error) {
        console.error("Erro ao buscar parcelas futuras:", error);
        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

// ========================================
// PAGAR PARCELA
// ========================================

async function payInstallment(req, res) {
    try {
        const { id } = req.params;

        const transaction = await installmentService.payInstallment(req.user.id, id);

        return res.status(200).json({
            message: "Parcela marcada como paga.",
            transaction
        });

    } catch (error) {
        console.error("Erro ao pagar parcela:", error);

        if (error.message === installmentService.INSTALLMENT_NOT_FOUND) {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

// ========================================
// EXCLUIR PLANO DE PARCELAMENTO
// ========================================

async function deleteInstallmentPlan(req, res) {
    try {
        const { id } = req.params;

        const result = await installmentService.deleteInstallmentPlan(req.user.id, id);

        if (!result) {
            return res.status(404).json({
                error: "Plano de parcelamento não encontrado."
            });
        }

        return res.status(200).json({
            message: "Plano de parcelamento excluído com sucesso. Parcelas pagas foram mantidas."
        });

    } catch (error) {
        console.error("Erro ao excluir plano de parcelamento:", error);
        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

// ========================================
// EXPORT
// ========================================

module.exports = {
    createInstallmentPlan,
    getInstallmentPlans,
    getInstallmentPlan,
    getUpcomingInstallments,
    payInstallment,
    deleteInstallmentPlan
};
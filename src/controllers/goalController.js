const goalService = require("../services/goalService");


function validateGoalData(
    name,
    targetAmount,
    currentAmount
) {

    if (
        !name ||
        typeof name !== "string" ||
        !name.trim()
    ) {

        return "Informe o nome da meta.";
    }


    if (
        targetAmount === undefined ||
        targetAmount === null ||
        Number(targetAmount) <= 0
    ) {

        return "O valor da meta deve ser maior que zero.";
    }


    if (
        currentAmount !== undefined &&
        currentAmount !== null &&
        Number(currentAmount) < 0
    ) {

        return "O valor atual não pode ser negativo.";
    }


    if (
        Number(currentAmount || 0) >
        Number(targetAmount)
    ) {

        return "O valor atual não pode ser maior que o valor da meta.";
    }


    return null;
}


/* =========================
   CRIAR
========================= */

async function createGoal(req, res) {

    try {

        const {
            name,
            targetAmount,
            currentAmount,
            deadline
        } = req.body;


        const validationError =
            validateGoalData(
                name,
                targetAmount,
                currentAmount
            );


        if (validationError) {

            return res.status(400).json({
                error: validationError
            });
        }


        const goal =
            await goalService.createGoal(
                req.user.id,
                name.trim(),
                Number(targetAmount),
                Number(currentAmount || 0),
                deadline || null
            );


        return res.status(201).json({
            message: "Meta criada com sucesso.",
            goal
        });

    } catch (error) {

        console.error(
            "Erro ao criar meta:",
            error
        );

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


/* =========================
   LISTAR
========================= */

async function getGoals(req, res) {

    try {

        const goals =
            await goalService.getGoalsByUser(
                req.user.id
            );


        return res.status(200).json({
            goals
        });

    } catch (error) {

        console.error(
            "Erro ao buscar metas:",
            error
        );

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


/* =========================
   BUSCAR POR ID
========================= */

async function getGoal(req, res) {

    try {

        const goal =
            await goalService.getGoalById(
                req.user.id,
                req.params.id
            );


        if (!goal) {

            return res.status(404).json({
                error: "Meta não encontrada."
            });
        }


        return res.status(200).json({
            goal
        });

    } catch (error) {

        console.error(
            "Erro ao buscar meta:",
            error
        );

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


/* =========================
   ATUALIZAR
========================= */

async function updateGoal(req, res) {

    try {

        const {
            name,
            targetAmount,
            currentAmount,
            deadline
        } = req.body;


        const validationError =
            validateGoalData(
                name,
                targetAmount,
                currentAmount
            );


        if (validationError) {

            return res.status(400).json({
                error: validationError
            });
        }


        const goal =
            await goalService.updateGoal(
                req.user.id,
                req.params.id,
                name.trim(),
                Number(targetAmount),
                Number(currentAmount || 0),
                deadline || null
            );


        if (!goal) {

            return res.status(404).json({
                error: "Meta não encontrada."
            });
        }


        return res.status(200).json({
            message: "Meta atualizada com sucesso.",
            goal
        });

    } catch (error) {

        console.error(
            "Erro ao atualizar meta:",
            error
        );

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


/* =========================
   EXCLUIR
========================= */

async function deleteGoal(req, res) {

    try {

        const deleted =
            await goalService.deleteGoal(
                req.user.id,
                req.params.id
            );


        if (!deleted) {

            return res.status(404).json({
                error: "Meta não encontrada."
            });
        }


        return res.status(200).json({
            message: "Meta excluída com sucesso."
        });

    } catch (error) {

        console.error(
            "Erro ao excluir meta:",
            error
        );

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}

/* =========================
   CONTRIBUTIONS
========================= */

async function addContribution(req, res) {
    try {
        const { goalId } = req.params;
        const {
            amount,
            description,
            contributionDate,
            installmentNumber,
            installmentsTotal,
            type
        } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "Valor da contribuição deve ser maior que zero." });
        }

        const contribution = await goalService.addGoalContribution(
            req.user.id,
            goalId,
            Number(amount),
            description?.trim() || null,
            contributionDate || null,
            installmentNumber ? Number(installmentNumber) : null,
            installmentsTotal ? Number(installmentsTotal) : null,
            type || 'manual'
        );

        return res.status(201).json({
            message: "Contribuição adicionada com sucesso.",
            contribution
        });

    } catch (error) {
        console.error("Erro ao adicionar contribuição:", error);

        if (error.message === "Meta não encontrada.") {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}


async function getContributions(req, res) {
    try {
        const { goalId } = req.params;

        const contributions = await goalService.getGoalContributions(
            req.user.id,
            goalId
        );

        return res.status(200).json({ contributions });

    } catch (error) {
        console.error("Erro ao buscar contribuições:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}


async function updateContribution(req, res) {
    try {
        const { goalId, contributionId } = req.params;
        const { amount, description, contributionDate } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "Valor da contribuição deve ser maior que zero." });
        }

        const contribution = await goalService.updateGoalContribution(
            req.user.id,
            goalId,
            contributionId,
            Number(amount),
            description?.trim() || null,
            contributionDate || null
        );

        return res.status(200).json({
            message: "Contribuição atualizada com sucesso.",
            contribution
        });

    } catch (error) {
        console.error("Erro ao atualizar contribuição:", error);

        if (error.message === "Contribuição não encontrada.") {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}


async function deleteContribution(req, res) {
    try {
        const { goalId, contributionId } = req.params;

        const deleted = await goalService.deleteGoalContribution(
            req.user.id,
            goalId,
            contributionId
        );

        if (!deleted) {
            return res.status(404).json({ error: "Contribuição não encontrada." });
        }

        return res.status(200).json({ message: "Contribuição excluída com sucesso." });

    } catch (error) {
        console.error("Erro ao excluir contribuição:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}


async function addRecurringContributions(req, res) {
    try {
        const { goalId } = req.params;
        const {
            amount,
            description,
            firstDate,
            installmentsTotal,
            frequencyMonths
        } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "Valor da parcela deve ser maior que zero." });
        }
        if (!installmentsTotal || Number(installmentsTotal) <= 0) {
            return res.status(400).json({ error: "Número de parcelas deve ser maior que zero." });
        }
        if (!firstDate) {
            return res.status(400).json({ error: "Data da primeira parcela é obrigatória." });
        }

        const contributions = await goalService.addRecurringContributions(
            req.user.id,
            goalId,
            Number(amount),
            description?.trim() || null,
            firstDate,
            Number(installmentsTotal),
            frequencyMonths ? Number(frequencyMonths) : 1
        );

        return res.status(201).json({
            message: `${contributions.length} contribuições recorrentes criadas com sucesso.`,
            contributions
        });

    } catch (error) {
        console.error("Erro ao criar contribuições recorrentes:", error);

        if (error.message === "Meta não encontrada.") {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}


module.exports = {
    createGoal,
    getGoals,
    getGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    getContributions,
    updateContribution,
    deleteContribution,
    addRecurringContributions
};
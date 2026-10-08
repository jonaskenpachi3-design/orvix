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


module.exports = {
    createGoal,
    getGoals,
    getGoal,
    updateGoal,
    deleteGoal
};
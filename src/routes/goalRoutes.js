const express = require("express");

const goalController =
    require("../controllers/goalController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router = express.Router();


router.get(
    "/",
    authMiddleware,
    goalController.getGoals
);


router.get(
    "/:id",
    authMiddleware,
    goalController.getGoal
);


router.post(
    "/",
    authMiddleware,
    goalController.createGoal
);


router.put(
    "/:id",
    authMiddleware,
    goalController.updateGoal
);


router.delete(
    "/:id",
    authMiddleware,
    goalController.deleteGoal
);

/* =========================
   CONTRIBUTIONS
========================= */

// POST /api/goals/:goalId/contributions - Adicionar contribuição
router.post(
    "/:goalId/contributions",
    authMiddleware,
    goalController.addContribution
);

// GET /api/goals/:goalId/contributions - Listar contribuições
router.get(
    "/:goalId/contributions",
    authMiddleware,
    goalController.getContributions
);

// PUT /api/goals/:goalId/contributions/:contributionId - Atualizar contribuição
router.put(
    "/:goalId/contributions/:contributionId",
    authMiddleware,
    goalController.updateContribution
);

// DELETE /api/goals/:goalId/contributions/:contributionId - Excluir contribuição
router.delete(
    "/:goalId/contributions/:contributionId",
    authMiddleware,
    goalController.deleteContribution
);

// POST /api/goals/:goalId/contributions/recurring - Criar contribuições recorrentes/parceladas
router.post(
    "/:goalId/contributions/recurring",
    authMiddleware,
    goalController.addRecurringContributions
);


module.exports = router;
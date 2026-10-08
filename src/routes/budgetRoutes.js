const express = require("express");

const budgetController = require("../controllers/budgetController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
    "/",
    budgetController.getBudgets
);

router.get(
    "/usage",
    budgetController.getBudgetUsage
);

router.post(
    "/",
    budgetController.createBudget
);

router.put(
    "/:id",
    budgetController.updateBudget
);

router.delete(
    "/:id",
    budgetController.deleteBudget
);

module.exports = router;
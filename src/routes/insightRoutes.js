const express = require("express");

const insightController =
    require("../controllers/insightController");

const authMiddleware =
    require("../middleware/authMiddleware");


const router =
    express.Router();


// ========================================
// INSIGHTS FINANCEIROS
// ========================================

router.get(
    "/financial",
    authMiddleware,
    insightController.getFinancialInsights
);


module.exports = router;
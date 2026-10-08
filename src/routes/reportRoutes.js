const express = require("express");

const reportController =
    require("../controllers/reportController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router =
    express.Router();


// ========================================
// RELATÓRIO FINANCEIRO
// ========================================

router.get(
    "/financial",
    authMiddleware,
    reportController.getFinancialReport
);


module.exports = router;
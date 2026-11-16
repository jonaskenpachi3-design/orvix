const express = require("express");

const installmentController = require("../controllers/installmentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// POST /api/installments - Criar plano de parcelamento
router.post("/", installmentController.createInstallmentPlan);

// GET /api/installments - Listar planos
router.get("/", installmentController.getInstallmentPlans);

// GET /api/installments/upcoming - Parcelas futuras (previsão)
router.get("/upcoming", installmentController.getUpcomingInstallments);

// GET /api/installments/:id - Buscar plano com parcelas
router.get("/:id", installmentController.getInstallmentPlan);

// PUT /api/installments/:id/pay - Pagar parcela
router.put("/:id/pay", installmentController.payInstallment);

// DELETE /api/installments/:id - Excluir plano
router.delete("/:id", installmentController.deleteInstallmentPlan);

module.exports = router;
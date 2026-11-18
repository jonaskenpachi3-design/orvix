const express = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const bankController = require("../controllers/bankController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Sincronizar chama uma API externa com cota limitada: no máximo 3 por minuto por usuário
const syncRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { error: "Muitas sincronizações. Tente novamente em um minuto." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
    skip: (req) => !req.user
});

router.use(authMiddleware);

router.get("/status", bankController.getStatus);
router.post("/connections", syncRateLimiter, bankController.addConnection);
router.delete("/connections/:id", bankController.removeConnection);
router.post("/sync", syncRateLimiter, bankController.sync);

module.exports = router;

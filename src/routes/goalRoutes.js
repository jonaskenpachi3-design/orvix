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


module.exports = router;
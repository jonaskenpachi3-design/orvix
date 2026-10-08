const express = require("express");

const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.get(
    "/",
    authMiddleware,
    categoryController.getCategories
);


router.post(
    "/",
    authMiddleware,
    categoryController.createCategory
);


router.put(
    "/:id",
    authMiddleware,
    categoryController.updateCategory
);


router.delete(
    "/:id",
    authMiddleware,
    categoryController.deleteCategory
);


module.exports = router;
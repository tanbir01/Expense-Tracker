const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budget.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Protect all budget routes
router.use(authMiddleware);

router.post("/", budgetController.upsertBudget);
router.get("/", budgetController.getBudgets);

module.exports = router;

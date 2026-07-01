const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public Bot routes (secured by bot secret header)
router.get("/telegram/daily-summaries", reportController.getTelegramDailySummaries);

// Protect all other report routes
router.use(authMiddleware);

router.get("/dashboard", reportController.getDashboardData);
router.get("/summary", reportController.getReportSummary);
router.get("/export", reportController.exportReport);

module.exports = router;

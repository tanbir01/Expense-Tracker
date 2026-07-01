const express = require("express");
const router = express.Router();
const settingController = require("../controllers/setting.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Protect all settings routes
router.use(authMiddleware);

router.post("/", settingController.upsertSetting);
router.get("/", settingController.getSettings);
router.get("/config", settingController.getPublicConfig);

module.exports = router;

const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public Bot routes (secured by bot secret header)
router.post("/telegram/text", transactionController.createViaTelegramText);
router.post("/telegram/voice", transactionController.createViaTelegramVoice);
router.post("/telegram/undo", transactionController.undoLastTelegramTransaction);

// Protect all other transaction routes
router.use(authMiddleware);

router.get("/", transactionController.getTransactions);
router.post("/", transactionController.createTransaction);
router.post("/ai", transactionController.createViaAI);
router.post("/receipt", transactionController.createViaReceipt);
router.post("/undo", transactionController.undoLastTransaction);
router.put("/:id", transactionController.updateTransaction);
router.delete("/:id", transactionController.deleteTransaction);

module.exports = router;

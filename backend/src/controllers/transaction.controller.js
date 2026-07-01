const prisma = require("../db");
const geminiService = require("../services/gemini.service");
const sheetsService = require("../services/sheets.service");
const telegramService = require("../services/telegram.service");

// CRUD: Create Transaction manually
exports.createTransaction = async (req, res) => {
  const userId = req.userId;
  const { type, amount, category, merchant, date, notes, paymentMethod } = req.body;

  if (!type || !amount || !category || !paymentMethod) {
    return res.status(400).json({ message: "Type, amount, category, and paymentMethod are required." });
  }

  try {
    const transactionDate = date ? new Date(date) : new Date();

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        amount: parseFloat(amount),
        category,
        merchant,
        date: transactionDate,
        notes,
        paymentMethod,
      },
    });

    // Run Sheet Sync and Budget Check asynchronously
    process.nextTick(async () => {
      await syncToSheetsAndCheckBudget(userId, transaction);
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ message: "Server error creating transaction." });
  }
};

// CRUD: Get Transactions with pagination and filters
exports.getTransactions = async (req, res) => {
  const userId = req.userId;
  const { page = 1, limit = 50, startDate, endDate, category, type, search } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    const where = { userId };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { merchant: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ message: "Server error fetching transactions." });
  }
};

// CRUD: Update Transaction
exports.updateTransaction = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { type, amount, category, merchant, date, notes, paymentMethod } = req.body;

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        type: type || existing.type,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        category: category || existing.category,
        merchant: merchant !== undefined ? merchant : existing.merchant,
        date: date ? new Date(date) : existing.date,
        notes: notes !== undefined ? notes : existing.notes,
        paymentMethod: paymentMethod || existing.paymentMethod,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ message: "Server error updating transaction." });
  }
};

// CRUD: Delete Transaction
exports.deleteTransaction = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    res.json({ message: "Transaction deleted successfully." });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ message: "Server error deleting transaction." });
  }
};

// Undo Last Transaction
exports.undoLastTransaction = async (req, res) => {
  const userId = req.userId;

  try {
    const lastTransaction = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!lastTransaction) {
      return res.status(404).json({ message: "No transactions found to undo." });
    }

    await prisma.transaction.delete({
      where: { id: lastTransaction.id },
    });

    res.json({
      message: "Last transaction undone successfully.",
      undoneTransaction: lastTransaction,
    });
  } catch (error) {
    console.error("Undo transaction error:", error);
    res.status(500).json({ message: "Server error performing undo operation." });
  }
};

// Create via Gemini AI Text input
exports.createViaAI = async (req, res) => {
  const userId = req.userId;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text input is required." });
  }

  try {
    const parsedData = await geminiService.parseExpenseText(text);

    // Save transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: parsedData.type || "EXPENSE",
        amount: parseFloat(parsedData.amount),
        category: parsedData.category || "Others",
        merchant: parsedData.merchant || null,
        date: parsedData.date ? new Date(parsedData.date) : new Date(),
        notes: parsedData.notes || text,
        paymentMethod: parsedData.paymentMethod || "Cash",
      },
    });

    // Run Sheet Sync and Budget Check asynchronously
    process.nextTick(async () => {
      await syncToSheetsAndCheckBudget(userId, transaction);
    });

    res.status(201).json({
      message: "AI parsed and recorded transaction successfully.",
      transaction,
    });
  } catch (error) {
    console.error("Create via AI error:", error);
    res.status(500).json({ message: "Server error parsing transaction using AI." });
  }
};

// Create via Receipt Upload (OCR base64)
exports.createViaReceipt = async (req, res) => {
  const userId = req.userId;
  const { image, mimeType } = req.body; // Expecting base64 image data and mimeType (e.g. image/jpeg, image/png)

  if (!image || !mimeType) {
    return res.status(400).json({ message: "Image base64 data and mimeType are required." });
  }

  try {
    const imageBuffer = Buffer.from(image, "base64");
    const parsedData = await geminiService.parseReceiptImage(imageBuffer, mimeType);

    // Save transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: parsedData.type || "EXPENSE",
        amount: parseFloat(parsedData.amount),
        category: parsedData.category || "Others",
        merchant: parsedData.merchant || null,
        date: parsedData.date ? new Date(parsedData.date) : new Date(),
        notes: parsedData.notes || "Receipt Upload",
        paymentMethod: parsedData.paymentMethod || "Credit Card",
      },
    });

    // Run Sheet Sync and Budget Check asynchronously
    process.nextTick(async () => {
      await syncToSheetsAndCheckBudget(userId, transaction);
    });

    res.status(201).json({
      message: "Receipt OCR complete.",
      transaction,
    });
  } catch (error) {
    console.error("Create via receipt error:", error);
    res.status(500).json({ message: "Server error processing receipt OCR." });
  }
};

// Helper function to sync to sheets and check monthly category budget thresholds
async function syncToSheetsAndCheckBudget(userId, transaction) {
  try {
    // 1. Sync to Google Sheets
    const syncSuccess = await sheetsService.appendTransaction(transaction);
    if (syncSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { sheetSynced: true },
      });
    }

    // 2. Only proceed with budget alerts for EXPENSE transactions
    if (transaction.type !== "EXPENSE") return;

    // Get date variables
    const date = new Date(transaction.date);
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    // Check if category budget is set for this month
    const budget = await prisma.budget.findUnique({
      where: {
        userId_category_month_year: {
          userId,
          category: transaction.category,
          month,
          year,
        },
      },
    });

    if (!budget) return; // No budget defined for this category

    // Calculate total spending in this category for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const expenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        category: transaction.category,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const currentSpending = expenses.reduce((sum, item) => sum + item.amount, 0);
    const prevSpending = currentSpending - transaction.amount;

    const budgetAmount = budget.amount;
    const prevPercent = (prevSpending / budgetAmount) * 100;
    const currentPercent = (currentSpending / budgetAmount) * 100;

    // Check settings for telegram chat id
    const chatSetting = await prisma.setting.findFirst({
      where: { userId, key: "telegram_chat_id" },
    });
    const chatId = chatSetting?.value;

    if (!chatId) return; // No Telegram chat ID linked

    // Send notifications based on threshold crossing
    if (prevPercent < 80 && currentPercent >= 80 && currentPercent < 100) {
      const remaining = budgetAmount - currentSpending;
      await telegramService.sendNotification(
        chatId,
        `⚠️ <b>Budget Alert</b>\n` +
        `Category: <b>${transaction.category}</b>\n` +
        `You have spent <b>${currentPercent.toFixed(1)}%</b> of your monthly budget (৳${budgetAmount}).\n` +
        `Remaining: <b>৳${remaining.toFixed(2)}</b>`
      );
    } else if (prevPercent < 100 && currentPercent >= 100) {
      const overspent = currentSpending - budgetAmount;
      await telegramService.sendNotification(
        chatId,
        `🚨 <b>Budget WARNING</b>\n` +
        `Category: <b>${transaction.category}</b>\n` +
        `You have exceeded <b>100%</b> of your monthly budget (৳${budgetAmount})!\n` +
        `Overspent by: <b>৳${overspent.toFixed(2)}</b>`
      );
    }
  } catch (error) {
    console.error("Sync and Budget check error:", error);
  }
}

// Bot Integration: Text Parse & Record
exports.createViaTelegramText = async (req, res) => {
  const botSecret = req.headers["x-bot-secret"];
  if (!botSecret || botSecret !== process.env.TELEGRAM_BOT_SECRET) {
    return res.status(401).json({ message: "Unauthorized bot access." });
  }

  const { chatId, text } = req.body;
  if (!chatId || !text) {
    return res.status(400).json({ message: "ChatId and text are required." });
  }

  try {
    // Look up user by setting
    const chatSetting = await prisma.setting.findFirst({
      where: { key: "telegram_chat_id", value: String(chatId) },
    });

    if (!chatSetting) {
      return res.status(404).json({ message: "Telegram account is not linked. Please register and set your Chat ID in the Web Dashboard." });
    }

    const userId = chatSetting.userId;

    // Parse text with Gemini
    const parsedData = await geminiService.parseExpenseText(text);

    // Save transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: parsedData.type || "EXPENSE",
        amount: parseFloat(parsedData.amount),
        category: parsedData.category || "Others",
        merchant: parsedData.merchant || null,
        date: parsedData.date ? new Date(parsedData.date) : new Date(),
        notes: parsedData.notes || text,
        paymentMethod: parsedData.paymentMethod || "Cash",
      },
    });

    // Run Sheet Sync and Budget Check in the background
    process.nextTick(async () => {
      await syncToSheetsAndCheckBudget(userId, transaction);
    });

    // Calculate remaining monthly budget
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const totalBudgetAggregate = await prisma.budget.aggregate({
      where: { userId, month, year },
      _sum: { amount: true },
    });
    const totalBudget = totalBudgetAggregate._sum.amount || 0;

    const totalExpenseAggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });
    const totalExpense = totalExpenseAggregate._sum.amount || 0;
    const remainingMonthlyBudget = totalBudget - totalExpense;

    res.status(201).json({
      success: true,
      transaction,
      remainingMonthlyBudget,
      totalBudget,
    });
  } catch (error) {
    console.error("Bot create text error:", error);
    res.status(500).json({ message: "Server error parsing Telegram text." });
  }
};

// Bot Integration: Voice Parse & Record
exports.createViaTelegramVoice = async (req, res) => {
  const botSecret = req.headers["x-bot-secret"];
  if (!botSecret || botSecret !== process.env.TELEGRAM_BOT_SECRET) {
    return res.status(401).json({ message: "Unauthorized bot access." });
  }

  const { chatId, audio, mimeType } = req.body; // audio as base64 string
  if (!chatId || !audio || !mimeType) {
    return res.status(400).json({ message: "ChatId, audio base64, and mimeType are required." });
  }

  try {
    // Look up user
    const chatSetting = await prisma.setting.findFirst({
      where: { key: "telegram_chat_id", value: String(chatId) },
    });

    if (!chatSetting) {
      return res.status(404).json({ message: "Telegram account is not linked. Please register and set your Chat ID in the Web Dashboard." });
    }

    const userId = chatSetting.userId;

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, "base64");

    // Parse audio with Gemini
    const parsedData = await geminiService.parseExpenseAudio(audioBuffer, mimeType);

    // Save transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: parsedData.type || "EXPENSE",
        amount: parseFloat(parsedData.amount),
        category: parsedData.category || "Others",
        merchant: parsedData.merchant || null,
        date: parsedData.date ? new Date(parsedData.date) : new Date(),
        notes: parsedData.notes || "Voice Entry",
        paymentMethod: parsedData.paymentMethod || "Cash",
      },
    });

    // Run Sheet Sync and Budget Check in the background
    process.nextTick(async () => {
      await syncToSheetsAndCheckBudget(userId, transaction);
    });

    // Calculate remaining monthly budget
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const totalBudgetAggregate = await prisma.budget.aggregate({
      where: { userId, month, year },
      _sum: { amount: true },
    });
    const totalBudget = totalBudgetAggregate._sum.amount || 0;

    const totalExpenseAggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });
    const totalExpense = totalExpenseAggregate._sum.amount || 0;
    const remainingMonthlyBudget = totalBudget - totalExpense;

    res.status(201).json({
      success: true,
      transaction,
      remainingMonthlyBudget,
      totalBudget,
    });
  } catch (error) {
    console.error("Bot create voice error:", error);
    res.status(500).json({ message: "Server error parsing Telegram voice." });
  }
};

// Bot Integration: Undo last transaction
exports.undoLastTelegramTransaction = async (req, res) => {
  const botSecret = req.headers["x-bot-secret"];
  if (!botSecret || botSecret !== process.env.TELEGRAM_BOT_SECRET) {
    return res.status(401).json({ message: "Unauthorized bot access." });
  }

  const { chatId } = req.body;
  if (!chatId) {
    return res.status(400).json({ message: "ChatId is required." });
  }

  try {
    const chatSetting = await prisma.setting.findFirst({
      where: { key: "telegram_chat_id", value: String(chatId) },
    });

    if (!chatSetting) {
      return res.status(404).json({ message: "Telegram account is not linked." });
    }

    const userId = chatSetting.userId;

    const lastTransaction = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!lastTransaction) {
      return res.status(404).json({ message: "No transactions found to undo." });
    }

    await prisma.transaction.delete({
      where: { id: lastTransaction.id },
    });

    res.json({
      success: true,
      undoneTransaction: lastTransaction,
    });
  } catch (error) {
    console.error("Bot undo transaction error:", error);
    res.status(500).json({ message: "Server error performing bot undo." });
  }
};

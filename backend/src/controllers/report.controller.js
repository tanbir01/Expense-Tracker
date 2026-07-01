const prisma = require("../db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { Readable } = require("stream");

// GET /api/reports/dashboard - metrics for the web dashboard
exports.getDashboardData = async (req, res) => {
  const userId = req.userId;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  try {
    const startOfToday = new Date(year, month - 1, now.getDate(), 0, 0, 0);
    const endOfToday = new Date(year, month - 1, now.getDate(), 23, 59, 59);

    // Get start of current week (assume Sunday start)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(year, month - 1, now.getDate() - dayOfWeek, 0, 0, 0);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // 1. Calculate Today's Spending
    const todayExpenses = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startOfToday, lte: endOfToday },
      },
      _sum: { amount: true },
    });
    const todaySpending = todayExpenses._sum.amount || 0;

    // 2. Calculate This Week's Spending
    const weekExpenses = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startOfWeek, lte: now },
      },
      _sum: { amount: true },
    });
    const weekSpending = weekExpenses._sum.amount || 0;

    // 3. Calculate This Month's Income, Expenses
    const monthAggregates = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    let monthIncome = 0;
    let monthExpense = 0;

    monthAggregates.forEach((item) => {
      if (item.type === "INCOME") {
        monthIncome = item._sum.amount || 0;
      } else if (item.type === "EXPENSE") {
        monthExpense = item._sum.amount || 0;
      }
    });

    const monthSavings = monthIncome - monthExpense;

    // 4. Calculate Budget Progress
    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
    });

    const budgetProgress = [];
    let totalBudget = 0;
    let totalBudgetSpent = 0;

    for (const budget of budgets) {
      totalBudget += budget.amount;

      const spentAggregate = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          category: budget.category,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      });

      const spent = spentAggregate._sum.amount || 0;
      totalBudgetSpent += spent;

      budgetProgress.push({
        category: budget.category,
        budget: budget.amount,
        spent,
        percent: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      });
    }

    const remainingBudget = totalBudget - totalBudgetSpent;

    // 5. Recent Transactions (last 10)
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
    });

    // 6. Category Breakdown for Pie Chart (this month's expenses)
    const categoryBreakdown = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    const categoryDistribution = categoryBreakdown.map((item) => ({
      category: item.category,
      amount: item._sum.amount || 0,
    }));

    // 7. Cash Flow Graph / Monthly Trend (Last 6 Months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const mStart = new Date(y, m - 1, 1);
      const mEnd = new Date(y, m, 0, 23, 59, 59);

      const sums = await prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId,
          date: { gte: mStart, lte: mEnd },
        },
        _sum: { amount: true },
      });

      let inc = 0;
      let exp = 0;

      sums.forEach((item) => {
        if (item.type === "INCOME") inc = item._sum.amount || 0;
        if (item.type === "EXPENSE") exp = item._sum.amount || 0;
      });

      const monthName = d.toLocaleString("default", { month: "short" });
      monthlyTrend.push({
        month: `${monthName} ${y}`,
        income: inc,
        expense: exp,
        savings: inc - exp,
      });
    }

    // 8. Upcoming Bills
    const upcomingBills = await prisma.recurringBill.findMany({
      where: {
        userId,
        isActive: true,
        dueDate: { gte: new Date(year, month - 1, now.getDate()) },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    res.json({
      todaySpending,
      weekSpending,
      monthIncome,
      monthExpense,
      monthSavings,
      remainingBudget,
      totalBudget,
      recentTransactions,
      categoryDistribution,
      monthlyTrend,
      budgetProgress,
      upcomingBills,
    });
  } catch (error) {
    console.error("Dashboard calculation error:", error);
    res.status(500).json({ message: "Server error aggregating dashboard data." });
  }
};

// GET /api/reports/summary - advanced reporting metrics
exports.getReportSummary = async (req, res) => {
  const userId = req.userId;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "startDate and endDate are required." });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where = { userId, date: { gte: start, lte: end } };

    // Total income and expenses
    const aggregates = await prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    aggregates.forEach((item) => {
      if (item.type === "INCOME") totalIncome = item._sum.amount || 0;
      if (item.type === "EXPENSE") totalExpense = item._sum.amount || 0;
    });

    // Largest Expense
    const largestExpense = await prisma.transaction.findFirst({
      where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
      orderBy: { amount: "desc" },
    });

    // Top Category
    const topCategoryAgg = await prisma.transaction.groupBy({
      by: ["category"],
      where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    });

    const topCategory = topCategoryAgg.length > 0 ? {
      category: topCategoryAgg[0].category,
      amount: topCategoryAgg[0]._sum.amount,
    } : null;

    // Top Merchant
    const topMerchantAgg = await prisma.transaction.groupBy({
      by: ["merchant"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: end },
        merchant: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    });

    const topMerchant = topMerchantAgg.length > 0 ? {
      merchant: topMerchantAgg[0].merchant,
      amount: topMerchantAgg[0]._sum.amount,
    } : null;

    // Calculating Averages
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const avgDailySpending = totalExpense / diffDays;
    const avgMonthlySpending = totalExpense / (diffDays / 30 || 1);

    res.json({
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      largestExpense,
      topCategory,
      topMerchant,
      avgDailySpending,
      avgMonthlySpending,
      rangeDays: diffDays,
    });
  } catch (error) {
    console.error("Summary report generation error:", error);
    res.status(500).json({ message: "Server error generating report summary." });
  }
};

// GET /api/reports/export - export transaction lists
exports.exportReport = async (req, res) => {
  const userId = req.userId;
  const { format, startDate, endDate, category, type } = req.query;

  try {
    const where = { userId };
    if (type) where.type = type;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59);
        where.date.lte = d;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "asc" },
    });

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');

      let csv = "Date,Type,Category,Merchant,Amount,Payment Method,Notes\n";
      transactions.forEach((tx) => {
        const dateStr = new Date(tx.date).toISOString().split("T")[0];
        const notesEscaped = tx.notes ? `"${tx.notes.replace(/"/g, '""')}"` : "";
        const merchantEscaped = tx.merchant ? `"${tx.merchant.replace(/"/g, '""')}"` : "";
        csv += `${dateStr},${tx.type},"${tx.category}",${merchantEscaped},${tx.amount},"${tx.paymentMethod}",${notesEscaped}\n`;
      });

      return res.send(csv);
    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Transactions");

      worksheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Type", key: "type", width: 12 },
        { header: "Category", key: "category", width: 20 },
        { header: "Merchant", key: "merchant", width: 20 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Notes", key: "notes", width: 30 },
      ];

      transactions.forEach((tx) => {
        worksheet.addRow({
          date: new Date(tx.date).toISOString().split("T")[0],
          type: tx.type,
          category: tx.category,
          merchant: tx.merchant || "",
          amount: tx.amount,
          paymentMethod: tx.paymentMethod,
          notes: tx.notes || "",
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.xlsx"');

      await workbook.xlsx.write(res);
      return res.end();
    } else if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="transactions.pdf"');

      doc.pipe(res);

      doc.fontSize(20).text("Personal Expense Statement", { align: "center" });
      doc.moveDown();

      const user = await prisma.user.findUnique({ where: { id: userId } });
      doc.fontSize(10).text(`Statement For: ${user.name || user.email}`);
      doc.text(`Generated At: ${new Date().toLocaleString()}`);
      doc.moveDown();

      // Header row
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Date", 50, doc.y, { width: 70, continued: true });
      doc.text("Type", 120, doc.y, { width: 60, continued: true });
      doc.text("Category", 180, doc.y, { width: 100, continued: true });
      doc.text("Amount", 280, doc.y, { width: 60, continued: true });
      doc.text("Method", 340, doc.y, { width: 75, continued: true });
      doc.text("Notes", 415, doc.y);
      doc.font("Helvetica");
      doc.moveDown(0.5);
      doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Rows
      transactions.forEach((tx) => {
        const dateStr = new Date(tx.date).toISOString().split("T")[0];
        const initialY = doc.y;

        doc.text(dateStr, 50, initialY, { width: 70 });
        doc.text(tx.type, 120, initialY, { width: 60 });
        doc.text(tx.category, 180, initialY, { width: 100 });
        doc.text(tx.amount.toFixed(2), 280, initialY, { width: 60 });
        doc.text(tx.paymentMethod, 340, initialY, { width: 75 });
        doc.text(tx.notes || tx.merchant || "", 415, initialY, { width: 135 });
        
        doc.moveDown(1);
      });

      doc.end();
      return;
    } else {
      return res.status(400).json({ message: "Invalid format. Choose csv, excel, or pdf." });
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Server error during file export." });
  }
};

// Bot Integration: Generate daily summaries for all linked chats
exports.getTelegramDailySummaries = async (req, res) => {
  const botSecret = req.headers["x-bot-secret"];
  if (!botSecret || botSecret !== process.env.TELEGRAM_BOT_SECRET) {
    return res.status(401).json({ message: "Unauthorized bot access." });
  }

  try {
    const chatSettings = await prisma.setting.findMany({
      where: { key: "telegram_chat_id" },
    });

    const summaries = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const startOfToday = new Date(year, month - 1, now.getDate(), 0, 0, 0);
    const endOfToday = new Date(year, month - 1, now.getDate(), 23, 59, 59);
    const startOfMonth = new Date(year, month - 1, 1);

    for (const setting of chatSettings) {
      const chatId = setting.value;
      const userId = setting.userId;

      // 1. Today's expense total
      const expenseAgg = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { amount: true },
      });
      const todayExpense = expenseAgg._sum.amount || 0;

      // 2. Top category of the day
      const topCategoryAgg = await prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 1,
      });
      const topCategory = topCategoryAgg.length > 0 ? topCategoryAgg[0].category : "None";

      // 3. Remaining monthly budget
      const totalBudgetAggregate = await prisma.budget.aggregate({
        where: { userId, month, year },
        _sum: { amount: true },
      });
      const totalBudget = totalBudgetAggregate._sum.amount || 0;

      const totalExpenseAggregate = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: startOfMonth, lte: endOfToday },
        },
        _sum: { amount: true },
      });
      const totalExpense = totalExpenseAggregate._sum.amount || 0;
      const remainingMonthlyBudget = totalBudget - totalExpense;

      // Build message
      let message = `📝 <b>Daily Summary</b>\n\n`;
      message += `Today's Expense: <b>৳${todayExpense.toFixed(2)}</b>\n`;
      message += `Top Category: <b>${topCategory}</b>\n`;
      if (totalBudget > 0) {
        message += `Remaining Monthly Budget: <b>৳${remainingMonthlyBudget.toFixed(2)}</b>`;
      }

      summaries.push({
        chatId,
        message,
      });
    }

    res.json({ summaries });
  } catch (error) {
    console.error("Error generating daily summaries:", error);
    res.status(500).json({ message: "Server error generating daily summaries." });
  }
};

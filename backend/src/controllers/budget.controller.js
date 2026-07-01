const prisma = require("../db");

exports.upsertBudget = async (req, res) => {
  const userId = req.userId;
  const { category, amount, month, year } = req.body;

  if (!category || amount === undefined || !month || !year) {
    return res.status(400).json({ message: "Category, amount, month, and year are required." });
  }

  try {
    const budget = await prisma.budget.upsert({
      where: {
        userId_category_month_year: {
          userId,
          category,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        amount: parseFloat(amount),
      },
      create: {
        userId,
        category,
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    res.json(budget);
  } catch (error) {
    console.error("Upsert budget error:", error);
    res.status(500).json({ message: "Server error setting category budget." });
  }
};

exports.getBudgets = async (req, res) => {
  const userId = req.userId;
  const { month, year } = req.query;

  try {
    const where = { userId };
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: { category: "asc" },
    });

    res.json(budgets);
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ message: "Server error fetching budgets." });
  }
};

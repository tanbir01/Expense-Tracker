const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. Clear existing data
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.recurringBill.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Cleared existing data.");

  // 2. Create default user
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      passwordHash,
      name: "Tanvir Ahmed",
    },
  });

  console.log(`Created default user: ${user.email} (Password: password123)`);

  // 3. Create Settings
  await prisma.setting.createMany({
    data: [
      { userId: user.id, key: "telegram_chat_id", value: "123456789" },
      { userId: user.id, key: "google_sheets_spreadsheet_id", value: "spreadsheet_sample_id_abc123" },
    ],
  });

  console.log("Created sample user settings.");

  // 4. Create Category Budgets for the current month/year
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: "Food & Drinks", amount: 5000, month: currentMonth, year: currentYear },
      { userId: user.id, category: "Transport", amount: 4000, month: currentMonth, year: currentYear },
      { userId: user.id, category: "Entertainment", amount: 3000, month: currentMonth, year: currentYear },
      { userId: user.id, category: "Utilities", amount: 2500, month: currentMonth, year: currentYear },
      { userId: user.id, category: "Others", amount: 5000, month: currentMonth, year: currentYear },
    ],
  });

  console.log("Created category budgets.");

  // 5. Create Recurring Bills
  const futureDueDate = new Date();
  futureDueDate.setDate(futureDueDate.getDate() + 5);

  await prisma.recurringBill.createMany({
    data: [
      { userId: user.id, title: "Monthly Internet Bill", amount: 1500, category: "Utilities", frequency: "MONTHLY", dueDate: futureDueDate },
      { userId: user.id, title: "Netflix Subscription", amount: 350, category: "Entertainment", frequency: "MONTHLY", dueDate: new Date(currentYear, currentMonth - 1, 28) },
    ],
  });

  console.log("Created sample recurring bills.");

  // 6. Create Transactions (for current and previous months)
  const transactionsData = [];

  // Helper to subtract days
  const getPastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  // Income entries
  transactionsData.push({
    userId: user.id,
    type: "INCOME",
    amount: 30000,
    category: "Income",
    merchant: "Tech Corp",
    date: getPastDate(15),
    notes: "Monthly Salary Payment",
    paymentMethod: "Bank",
    sheetSynced: true,
  });

  transactionsData.push({
    userId: user.id,
    type: "INCOME",
    amount: 2500,
    category: "Income",
    merchant: "Fiverr",
    date: getPastDate(5),
    notes: "Freelance Writing Work",
    paymentMethod: "bKash",
    sheetSynced: true,
  });

  // Food Expenses
  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 120,
    category: "Food & Drinks",
    merchant: "Chillox",
    date: getPastDate(0),
    notes: "Burger & Drinks",
    paymentMethod: "Cash",
    sheetSynced: true,
  });

  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 350,
    category: "Food & Drinks",
    merchant: "Star Kabab",
    date: getPastDate(2),
    notes: "Lunch with friend",
    paymentMethod: "Nagad",
    sheetSynced: true,
  });

  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 20,
    category: "Food & Drinks",
    merchant: "Local Tea Stall",
    date: getPastDate(1),
    notes: "Tea and Biscuits",
    paymentMethod: "Cash",
    sheetSynced: true,
  });

  // Transport Expenses
  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 350,
    category: "Transport",
    merchant: "Uber",
    date: getPastDate(1),
    notes: "Ride to office",
    paymentMethod: "Credit Card",
    sheetSynced: true,
  });

  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 80,
    category: "Transport",
    merchant: "Local Rickshaw",
    date: getPastDate(3),
    notes: "Rickshaw fare to market",
    paymentMethod: "Cash",
    sheetSynced: true,
  });

  // Utilities Expenses
  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 1500,
    category: "Utilities",
    merchant: "DESCO",
    date: getPastDate(10),
    notes: "Electricity Bill",
    paymentMethod: "bKash",
    sheetSynced: true,
  });

  // Healthcare Expenses
  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 560,
    category: "Healthcare",
    merchant: "Lazz Pharma",
    date: getPastDate(4),
    notes: "Monthly Medicines",
    paymentMethod: "Debit Card",
    sheetSynced: true,
  });

  // Shopping / Others
  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 2200,
    category: "Shopping",
    merchant: "Aarong",
    date: getPastDate(8),
    notes: "Clothes shopping",
    paymentMethod: "Credit Card",
    sheetSynced: true,
  });

  transactionsData.push({
    userId: user.id,
    type: "EXPENSE",
    amount: 450,
    category: "Others",
    merchant: "Pathao",
    date: getPastDate(6),
    notes: "Delivery service charge",
    paymentMethod: "Cash",
    sheetSynced: true,
  });

  // Mock transactions for past months to populate trend charts
  for (let i = 1; i <= 5; i++) {
    const pastMonthDate = new Date();
    pastMonthDate.setMonth(pastMonthDate.getMonth() - i);
    
    // Add income for that month
    transactionsData.push({
      userId: user.id,
      type: "INCOME",
      amount: 28000 + (i * 200),
      category: "Income",
      merchant: "Tech Corp",
      date: pastMonthDate,
      notes: "Salary payment",
      paymentMethod: "Bank",
      sheetSynced: true,
    });

    // Add general expense for that month
    transactionsData.push({
      userId: user.id,
      type: "EXPENSE",
      amount: 12000 + (i * 500),
      category: "Others",
      merchant: "Multiple Merchants",
      date: pastMonthDate,
      notes: "Aggregated monthly spendings",
      paymentMethod: "Bank",
      sheetSynced: true,
    });
  }

  // Save transactions
  for (const tx of transactionsData) {
    await prisma.transaction.create({ data: tx });
  }

  console.log(`Inserted ${transactionsData.length} mock transactions.`);
  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

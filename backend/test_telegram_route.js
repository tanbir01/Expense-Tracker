const prisma = require("./src/db");
const geminiService = require("./src/services/gemini.service");
const sheetsService = require("./src/services/sheets.service");
const telegramService = require("./src/services/telegram.service");

// Mock request execution
async function runTest() {
  console.log("Mocking Telegram request for text: 'Singara 40'...");
  const chatId = "1217178019";
  const text = "Singara 40";
  
  try {
    // 1. Look up user by setting
    const chatSetting = await prisma.setting.findFirst({
      where: { key: "telegram_chat_id", value: String(chatId) },
    });

    if (!chatSetting) {
      console.log("ERROR: Telegram account not linked.");
      return;
    }

    const userId = chatSetting.userId;
    console.log("Found User ID:", userId);

    // 2. Parse text with Gemini
    console.log("Parsing text with Gemini...");
    const parsedData = await geminiService.parseExpenseText(text);
    console.log("Parsed Data:", parsedData);

    // 3. Save transaction
    console.log("Creating transaction record...");
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
    console.log("Transaction saved in DB:", transaction.id);

    // 4. Run Sheet Sync directly
    console.log("Syncing to Google Sheets...");
    const syncSuccess = await sheetsService.appendTransaction(transaction);
    console.log("Sync Success Result:", syncSuccess);
    if (syncSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { sheetSynced: true },
      });
      console.log("Transaction marked as synced in DB!");
    } else {
      console.log("ERROR: Sheets sync failed.");
    }
  } catch (error) {
    console.error("TEST_FAILED_ERROR:", error);
  }
}

runTest()
  .finally(() => prisma.$disconnect());

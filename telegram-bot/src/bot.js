const { Telegraf } = require("telegraf");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const backendUrl = process.env.BACKEND_API_URL || "http://localhost:5000/api";
const botSecret = process.env.TELEGRAM_BOT_SECRET || "default_bot_secret";

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN is not defined in environment variables!");
  process.exit(1);
}

const bot = new Telegraf(botToken);

// Middleware to print incoming updates
bot.use((ctx, next) => {
  console.log(`Received message from chat ${ctx.chat.id}:`, ctx.message?.text || "[Media/Other]");
  return next();
});

// Command: /start
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  ctx.replyWithHTML(
    `👋 <b>Welcome to the AI Personal Expense Automation System!</b>\n\n` +
    `To log your transactions, please link this Telegram account on the Web Dashboard.\n\n` +
    `Your Telegram Chat ID: <code>${chatId}</code>\n\n` +
    `Copy and paste this ID in the <b>Settings</b> page of your dashboard. Once linked, you can send messages here to instantly record expenses!\n\n` +
    `<b>Try formats like:</b>\n` +
    `• Tea 20\n` +
    `• Uber 350\n` +
    `• Salary 25000\n` +
    `• Internet Bill 1500\n\n` +
    `<i>You can also send voice notes!</i>`
  );
});

// Command: /help
bot.help((ctx) => {
  ctx.replyWithHTML(
    `ℹ️ <b>How to use the bot:</b>\n\n` +
    `• Send text messages like <code>Lunch 200</code> or <code>bKash send 1000 to home</code>.\n` +
    `• Send voice messages like <i>"Bought coffee for 150 taka"</i>.\n` +
    `• Use /undo to delete the last transaction you recorded.\n` +
    `• Use /start to see your Chat ID again.`
  );
});

// Command: /undo
bot.command("undo", async (ctx) => {
  const chatId = ctx.chat.id;
  try {
    // Send bot secret and chatId to backend undo endpoint
    // Wait! Since standard undo route is protected by JWT, let's create a bot-specific undo route: /api/transactions/telegram/undo
    const response = await axios.post(
      `${backendUrl}/transactions/telegram/undo`,
      { chatId },
      { headers: { "x-bot-secret": botSecret } }
    );

    if (response.data.success) {
      const tx = response.data.undoneTransaction;
      ctx.replyWithHTML(
        `↩️ <b>Transaction Undone Successfully!</b>\n` +
        `Deleted: <b>${tx.notes || tx.category}</b> - ৳${tx.amount}`
      );
    }
  } catch (error) {
    if (error.response?.status === 404) {
      ctx.reply("❌ No transaction found to undo, or your account is not linked.");
    } else {
      console.error("Bot undo error:", error.message);
      ctx.reply("❌ Error undoing transaction. Please try from the web dashboard.");
    }
  }
});

// Handle Voice Messages
bot.on("voice", async (ctx) => {
  const chatId = ctx.chat.id;
  const voice = ctx.message.voice;

  ctx.reply("🎙️ Processing voice note...");

  try {
    // 1. Get file link from Telegram
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    
    // 2. Download file as array buffer
    const response = await axios.get(fileLink.href, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(response.data);
    const base64Audio = fileBuffer.toString("base64");

    // 3. Send to backend
    const backendResponse = await axios.post(
      `${backendUrl}/transactions/telegram/voice`,
      {
        chatId,
        audio: base64Audio,
        mimeType: "audio/ogg",
      },
      { headers: { "x-bot-secret": botSecret } }
    );

    if (backendResponse.data.success) {
      const tx = backendResponse.data.transaction;
      const remaining = backendResponse.data.remainingMonthlyBudget;
      const totalBudget = backendResponse.data.totalBudget;

      let msg = `✅ <b>Transaction Recorded</b>\n`;
      msg += `Type: <b>${tx.type}</b>\n`;
      msg += `Category: <b>${tx.category}</b>\n`;
      msg += `Amount: <b>৳${tx.amount}</b>\n`;
      if (tx.merchant) msg += `Merchant: <b>${tx.merchant}</b>\n`;
      if (tx.notes) msg += `Notes: <b>${tx.notes}</b>\n`;
      
      if (totalBudget > 0) {
        msg += `\nRemaining Monthly Budget:\n<b>৳${remaining.toFixed(2)}</b>`;
      }

      ctx.replyWithHTML(msg);
    }
  } catch (error) {
    if (error.response?.status === 404) {
      ctx.replyWithHTML(
        `⚠️ <b>Account Not Linked</b>\n\n` +
        `Please link your account in the web dashboard first using your Chat ID: <code>${chatId}</code>`
      );
    } else {
      console.error("Bot voice error:", error.response?.data || error.message);
      ctx.reply("❌ Sorry, I couldn't understand the audio. Please type it or try again.");
    }
  }
});

// Handle Plain Text Messages
bot.on("text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  // Ignore commands
  if (text.startsWith("/")) return;

  try {
    const response = await axios.post(
      `${backendUrl}/transactions/telegram/text`,
      { chatId, text },
      { headers: { "x-bot-secret": botSecret } }
    );

    if (response.data.success) {
      const tx = response.data.transaction;
      const remaining = response.data.remainingMonthlyBudget;
      const totalBudget = response.data.totalBudget;

      let msg = `✅ <b>Transaction Recorded</b>\n`;
      msg += `Type: <b>${tx.type}</b>\n`;
      msg += `Category: <b>${tx.category}</b>\n`;
      msg += `Amount: <b>৳${tx.amount}</b>\n`;
      if (tx.merchant) msg += `Merchant: <b>${tx.merchant}</b>\n`;
      if (tx.notes) msg += `Notes: <b>${tx.notes}</b>\n`;

      if (totalBudget > 0) {
        msg += `\nRemaining Monthly Budget:\n<b>৳${remaining.toFixed(2)}</b>`;
      }

      ctx.replyWithHTML(msg);
    }
  } catch (error) {
    if (error.response?.status === 404) {
      ctx.replyWithHTML(
        `⚠️ <b>Account Not Linked</b>\n\n` +
        `Please link your account in the web dashboard first using your Chat ID: <code>${chatId}</code>`
      );
    } else {
      console.error("Bot text error:", error.response?.data || error.message);
      ctx.reply("❌ Error recording expense. Make sure the input contains an amount.");
    }
  }
});

// Scheduled Notification: Daily Summary at 10 PM
cron.schedule("0 22 * * *", async () => {
  console.log("Running scheduled daily summary cron job at 10 PM...");
  try {
    const response = await axios.get(
      `${backendUrl}/reports/telegram/daily-summaries`,
      { headers: { "x-bot-secret": botSecret } }
    );

    const summaries = response.data.summaries || [];
    for (const item of summaries) {
      try {
        await bot.telegram.sendMessage(item.chatId, item.message, { parse_mode: "HTML" });
      } catch (err) {
        console.error(`Failed to send summary to chatId ${item.chatId}:`, err.message);
      }
    }
  } catch (error) {
    console.error("Error executing daily summaries cron job:", error.message);
  }
});

// Start bot
bot.launch().then(() => {
  console.log("Telegram Bot worker started successfully.");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

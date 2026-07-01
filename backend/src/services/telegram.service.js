const axios = require("axios");

class TelegramService {
  async sendNotification(chatId, text) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !chatId) {
      console.warn("Telegram Bot Token or Chat ID not configured. Skipping notification.");
      return false;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      });
      return true;
    } catch (error) {
      console.error("Error sending Telegram message:", error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new TelegramService();

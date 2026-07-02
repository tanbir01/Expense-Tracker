const axios = require("axios");

async function test() {
  const backendUrl = "https://expense-tracker-xpxj.onrender.com/api";
  const botSecret = "antigravity_bot_secret_pass";
  const chatId = "1217178019";
  const text = "Tea 25";

  console.log(`Sending POST to ${backendUrl}/transactions/telegram/text...`);
  try {
    const response = await axios.post(
      `${backendUrl}/transactions/telegram/text`,
      { chatId, text },
      { headers: { "x-bot-secret": botSecret } }
    );
    console.log("SUCCESS:", response.status, response.data);
  } catch (error) {
    console.error("FAILED:");
    if (error.response) {
      console.error("Status Code:", error.response.status);
      console.error("Error Response Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error Message:", error.message);
    }
  }
}

test();

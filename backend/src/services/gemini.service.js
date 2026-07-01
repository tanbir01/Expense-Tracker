const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables");
    }
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async parseExpenseText(text) {
    if (!this.genAI) {
      throw new Error("Gemini API key is not configured.");
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const categories = [
      "Food & Drinks", "Transport", "Healthcare", "Entertainment",
      "Utilities", "Income", "Shopping", "Electronics", "Education",
      "Fitness", "Others"
    ];

    const systemPrompt = `You are an expert personal finance assistant. Parse the following expense or income text into a structured JSON object.
    
    The JSON object must have the following keys:
    - type: "EXPENSE" or "INCOME"
    - amount: number (e.g. 20)
    - category: string (choose from: ${categories.join(", ")}, or create an appropriate one if it does not fit)
    - merchant: string (name of the merchant, store, or app, or null if not applicable)
    - notes: string (any additional details, or null)
    - date: string (ISO 8601 date, default to current date if not specified)
    - paymentMethod: string (choose one: "Cash", "bKash", "Nagad", "Bank", "Credit Card", "Debit Card", "Others")
    
    Current date context: ${new Date().toISOString().split('T')[0]}
    
    Examples:
    "Tea 20" -> {"type": "EXPENSE", "amount": 20, "category": "Food & Drinks", "merchant": null, "notes": "Tea", "paymentMethod": "Cash"}
    "Salary 30000" -> {"type": "INCOME", "amount": 30000, "category": "Income", "merchant": null, "notes": "Salary", "paymentMethod": "Bank"}
    "Uber 350" -> {"type": "EXPENSE", "amount": 350, "category": "Transport", "merchant": "Uber", "notes": "Uber ride", "paymentMethod": "Credit Card"}
    "Gift from Rahim 1000" -> {"type": "INCOME", "amount": 1000, "category": "Income", "merchant": null, "notes": "Gift from Rahim", "paymentMethod": "bKash"}
    "Bought tea for 20 taka via bKash" -> {"type": "EXPENSE", "amount": 20, "category": "Food & Drinks", "merchant": null, "notes": "Tea", "paymentMethod": "bKash"}`;

    const response = await model.generateContent(`${systemPrompt}\n\nInput text: "${text}"`);
    const resultText = response.response.text();
    return JSON.parse(resultText);
  }

  async parseReceiptImage(imageBuffer, mimeType) {
    if (!this.genAI) {
      throw new Error("Gemini API key is not configured.");
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType
        }
      }
    ];

    const prompt = `Analyze this receipt image and extract the following details into a JSON object:
    - type: always "EXPENSE"
    - amount: total amount paid (number)
    - category: appropriate category (e.g. Food & Drinks, Transport, Utilities, Shopping, Electronics, Others)
    - merchant: name of the store, restaurant, or business
    - date: date of the transaction (ISO 8601 string, or today's date if not clear)
    - notes: short summary of items purchased or invoice number
    - paymentMethod: estimated payment method (e.g., "Credit Card", "Cash", "Others")`;

    const response = await model.generateContent([prompt, ...imageParts]);
    const resultText = response.response.text();
    return JSON.parse(resultText);
  }

  async parseExpenseAudio(audioBuffer, mimeType) {
    if (!this.genAI) {
      throw new Error("Gemini API key is not configured.");
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const audioParts = [
      {
        inlineData: {
          data: audioBuffer.toString("base64"),
          mimeType
        }
      }
    ];

    const categories = [
      "Food & Drinks", "Transport", "Healthcare", "Entertainment",
      "Utilities", "Income", "Shopping", "Electronics", "Education",
      "Fitness", "Others"
    ];

    const prompt = `You are an expert personal finance assistant. Listen to the audio and extract the expense or income details into a JSON object.
    
    The JSON object must have the following keys:
    - type: "EXPENSE" or "INCOME"
    - amount: number (e.g. 20)
    - category: string (choose from: ${categories.join(", ")}, or create an appropriate one if it does not fit)
    - merchant: string (name of the merchant, store, or app, or null if not applicable)
    - notes: string (any additional details, or null)
    - date: string (ISO 8601 date, default to current date if not specified)
    - paymentMethod: string (choose one: "Cash", "bKash", "Nagad", "Bank", "Credit Card", "Debit Card", "Others")
    
    Current date context: ${new Date().toISOString().split('T')[0]}`;

    const response = await model.generateContent([prompt, ...audioParts]);
    const resultText = response.response.text();
    return JSON.parse(resultText);
  }
}

module.exports = new GeminiService();

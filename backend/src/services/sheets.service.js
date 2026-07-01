const { google } = require("googleapis");
const prisma = require("../db");

class SheetsService {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    this.credentials = null;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      try {
        this.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
        if (this.credentials && this.credentials.private_key) {
          this.credentials.private_key = this.credentials.private_key.replace(/\\n/g, "\n");
        }
      } catch (e) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON string:", e.message);
      }
    }
  }

  async getSheetsClient(spreadsheetId) {
    const activeSpreadsheetId = spreadsheetId || this.spreadsheetId;
    if (!this.credentials || !activeSpreadsheetId) {
      console.warn("Google Sheets Integration is not fully configured (missing CREDENTIALS or SPREADSHEET_ID).");
      return null;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: this.credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      return google.sheets({ version: "v4", auth });
    } catch (e) {
      console.error("Failed to initialize Google Sheets Auth:", e.message);
      return null;
    }
  }

  async appendTransaction(transaction) {
    let spreadsheetId = this.spreadsheetId;
    try {
      const userSetting = await prisma.setting.findUnique({
        where: {
          userId_key: {
            userId: transaction.userId,
            key: "google_sheets_spreadsheet_id",
          },
        },
      });
      if (userSetting && userSetting.value) {
        spreadsheetId = userSetting.value;
      }
    } catch (err) {
      console.error("Failed to fetch user spreadsheet ID setting, using default:", err.message);
    }

    if (!spreadsheetId) {
      console.warn("No spreadsheet ID configured for user.");
      return false;
    }

    const sheets = await this.getSheetsClient(spreadsheetId);
    if (!sheets) return false;

    try {
      // 1. Check if headers exist by reading Sheet1!A1:I1
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: "Sheet1!A1:I1",
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        // Headers are missing, create them
        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: "Sheet1!A1:I1",
          valueInputOption: "RAW",
          resource: {
            values: [
              ["Date", "Type", "Category", "Description", "Amount", "Payment Method", "Merchant", "Notes", "Running Balance"],
            ],
          },
        });
      }

      // 2. Fetch the last row to calculate running balance
      const checkRangeResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: "Sheet1!A:I",
      });

      const allRows = checkRangeResponse.data.values || [];
      let runningBalance = 0;
      if (allRows.length > 1) {
        const lastRow = allRows[allRows.length - 1];
        // Running Balance is in the 9th column (index 8)
        const lastBalance = parseFloat(lastRow[8]) || 0;
        runningBalance = lastBalance;
      }

      // Update running balance based on current transaction
      if (transaction.type === "INCOME") {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }

      // 3. Append the new transaction row
      const newRow = [
        new Date(transaction.date).toISOString().split("T")[0],
        transaction.type,
        transaction.category,
        transaction.notes || "",
        transaction.amount,
        transaction.paymentMethod,
        transaction.merchant || "",
        transaction.notes || "",
        runningBalance,
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: "Sheet1!A:I",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [newRow],
        },
      });

      return true;
    } catch (error) {
      console.error("Error appending transaction to Google Sheets:", error);
      return false;
    }
  }
}

module.exports = new SheetsService();

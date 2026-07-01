# AI Personal Expense Automation System

An automated, cross-platform personal expense tracking system that logs transactions in real-time from either a **Telegram Bot** or a **Web Dashboard**.

The system features:
1. **Gemini AI Categorization**: Automatically classifies raw text inputs (e.g. `Tea 20`, `Salary 25000`) and voice notes (e.g. *"Bought coffee for 150 taka using bKash"*), extracting type, amount, category, merchant, and notes.
2. **Google Sheets Sync**: Dynamically updates your spreadsheet ledger and automatically computes running balances.
3. **Responsive Dashboard**: Beautiful, responsive layout for laptops, mobile, and tablets. It shows KPIs (Today's Spending, monthly savings, remaining budget), cash flow graphs, category distribution, budgets progress, and upcoming bills.
4. **Category Budgets & Alerts**: Alerts you via Telegram Bot at 80% budget consumption and sends warning notifications at 100% budget limit.
5. **Report Exports**: Download statement records instantly in CSV, Excel, or PDF formats.

---

## Tech Stack
* **Frontend**: Next.js 15, React, Tailwind CSS, TypeScript, Lucide Icons, Recharts
* **Backend**: Node.js, Express.js, Prisma ORM
* **Database**: PostgreSQL (Dockerized)
* **AI Engine**: Google Gemini API (model `gemini-1.5-flash` for text, voice, and receipt OCR analysis)
* **Bot Worker**: Telegraf (Telegram Bot API)
* **Deployment**: Docker, Docker Compose

---

## Directory Structure
```
frontend/          # Next.js frontend React dashboard
backend/           # Node Express API server and Prisma configuration
telegram-bot/      # Telegram bot worker daemon
docker-compose.yml # Coordinated multi-container launcher
.env.example       # Template env configuration file
```

---

## Environment Variables Configuration

Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

Fill in the required keys:
* `TELEGRAM_BOT_TOKEN`: Generate a token by messaging `@BotFather` on Telegram.
* `TELEGRAM_BOT_SECRET`: Set a custom password string for bot-to-backend authentication.
* `GEMINI_API_KEY`: Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
* `GOOGLE_SHEETS_SPREADSHEET_ID`: Create a Google Sheet and copy its ID from the URL.
* `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`: Follow the Google Sheets Setup Guide below to generate this JSON key.

---

## Google Sheets API Setup Guide
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Sheets API** and **Google Drive API**.
3. Go to the **Credentials** page, click **Create Credentials**, select **Service Account**, and name it (e.g., `expense-tracker`).
4. Select the newly created Service Account, click on **Keys** tab, choose **Add Key** -> **Create New Key** (JSON format).
5. Open the downloaded JSON key file, copy its entire contents, and paste it as a single-line string for `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` in your `.env` file.
6. Open your Google Sheet, click the **Share** button, invite the service account's `client_email` address (found in the JSON key), and give it **Editor** permissions.

---

## Docker Deployment (Recommended)

To run the complete system (Database, Backend API, Frontend Dashboard, and Bot Worker) in a coordinated dockerized environment, run:

```bash
# Build and launch all services in the background
docker-compose up --build -d
```

Once running:
* **Web Dashboard**: Access at [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: Access at [http://localhost:5000](http://localhost:5000)
* **Postgres Database**: Port `5432`

---

## Local Development Setup

If you wish to run the services individually for development:

### 1. Database
Make sure you have a local PostgreSQL instance running and configured in `.env`.

### 2. Backend API
```bash
cd backend
npm install
# Run migrations and seed sample data
npx prisma migrate dev --name init
npx prisma db seed
# Start backend server
npm run dev
```
*Default login credentials seeded: `test@example.com` / `password123`*

### 3. Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Runs at [http://localhost:3000](http://localhost:3000).

### 4. Telegram Bot Worker
```bash
cd telegram-bot
npm install
npm run dev
```

---

## Telegram Bot Quick Commands
* `/start`: Displays a welcome message and returns your unique **Telegram Chat ID**. Enter this ID in the web dashboard **Settings** page to link this chat to your account.
* `/help`: Display helper tips.
* `/undo`: Revert the last logged transaction.
* Send plain text or voice messages to log expenses immediately.

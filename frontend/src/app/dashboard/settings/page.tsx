"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Send, 
  FileSpreadsheet, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Copy,
  Info
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  
  // Settings values
  const [telegramChatId, setTelegramChatId] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    setError("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      // 1. Fetch user settings
      const settingsRes = await fetch(`${apiUrl}/settings`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const settingsData = await settingsRes.json();
      
      // Parse settings keys
      settingsData.forEach((setting: { key: string, value: string }) => {
        if (setting.key === "telegram_chat_id") setTelegramChatId(setting.value);
        if (setting.key === "google_sheets_spreadsheet_id") setSpreadsheetId(setting.value);
      });

      // 2. Fetch public configuration
      const configRes = await fetch(`${apiUrl}/settings/config`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const configData = await configRes.json();
      setServiceAccountEmail(configData.serviceAccountEmail || "Service account credentials not loaded in .env");
    } catch (err) {
      setError("Failed to retrieve settings configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    setActionLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      const response = await fetch(`${apiUrl}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${key}.`);
      }

      setMessage(`Setting updated successfully!`);
      fetchSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-900 rounded-lg w-1/4"></div>
        <div className="h-44 bg-slate-900 rounded-2xl border border-slate-800"></div>
        <div className="h-64 bg-slate-900 rounded-2xl border border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-400 text-xs mt-1">Configure your Telegram bot and Google Sheets automation details.</p>
      </div>

      {/* Message feedback */}
      {(message || error) && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs leading-relaxed ${
          error 
            ? "bg-red-500/10 border-red-500/20 text-red-400" 
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-medium">{error || message}</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* Telegram Configuration */}
        <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
              <Send className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-200">Telegram Bot Integration</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Link your Telegram account to record transactions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Telegram Chat ID</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveSetting("telegram_chat_id", telegramChatId)}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-blue-600/10"
                  >
                    <Save className="h-4 w-4" />
                    <span>Link Account</span>
                  </button>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-900/60 flex items-start space-x-3 text-xs leading-relaxed text-slate-400">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-200 mb-1">How to obtain your Chat ID:</h4>
                  <p>1. Open Telegram and search for your deployed Bot username.</p>
                  <p>2. Send a <code>/start</code> command to the bot.</p>
                  <p>3. The bot will automatically reply back with your <b>Telegram Chat ID</b>.</p>
                  <p>4. Copy and paste it in the field above and click <b>Link Account</b>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Google Sheets Configuration */}
        <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-200">Google Sheets Synchronization</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Automate transactions logging directly to a sheet.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {/* Service Account Email Info */}
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-1.5">Service Account Email</span>
                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs text-slate-300 font-mono flex-1 break-all truncate select-all">{serviceAccountEmail}</span>
                    <button
                      onClick={handleCopyEmail}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title="Copy email"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Spreadsheet ID Input */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Spreadsheet ID</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                      className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleSaveSetting("google_sheets_spreadsheet_id", spreadsheetId)}
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
                    >
                      <Save className="h-4 w-4" />
                      <span>Link Sheet</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-step Setup instructions */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-900/60 flex items-start space-x-3 text-xs leading-relaxed text-slate-400">
                  <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-1">How to setup Sheets automation:</h4>
                    <p>1. Copy the <b>Service Account Email</b> shown above.</p>
                    <p>2. Open the Google Sheet where you want to sync your transactions.</p>
                    <p>3. Click the <b>Share</b> button in the top-right corner.</p>
                    <p>4. Add the Service Account email as an <b>Editor</b> and save.</p>
                    <p>5. Copy the **Spreadsheet ID** from the sheet's URL (the string between <code>/d/</code> and <code>/edit</code>).</p>
                    <p>6. Paste it into the **Spreadsheet ID** input above and click **Link Sheet**.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  FileDown, 
  Trash2, 
  Edit3, 
  Mic, 
  MicOff, 
  Upload, 
  Sparkles, 
  Undo,
  X,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  merchant: string | null;
  date: string;
  notes: string | null;
  paymentMethod: string;
}

const CATEGORIES = [
  "Food & Drinks", "Transport", "Healthcare", "Entertainment",
  "Utilities", "Income", "Shopping", "Electronics", "Education",
  "Fitness", "Others"
];

const METHODS = [
  "Cash", "bKash", "Nagad", "Bank", "Credit Card", "Debit Card", "Others"
];

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Forms
  const [txType, setTxType] = useState("EXPENSE");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Food & Drinks");
  const [txMerchant, setTxMerchant] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txMethod, setTxMethod] = useState("Cash");

  // AI Inputs
  const [aiText, setAiText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, [page, type, category, startDate, endDate]);

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    setError("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    
    // Construct query parameters
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (search) params.append("search", search);
    if (type) params.append("type", type);
    if (category) params.append("category", category);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    try {
      const response = await fetch(`${apiUrl}/transactions?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve transactions.");
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchTransactions();
    }
  };

  // AI Voice Recognition (Browser Web Speech API)
  const toggleSpeech = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Web Speech API is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListening(true);
      setError("");
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setError("Speech recognition error. Please try typing.");
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiText(transcript);
    };

    rec.start();
  };

  // Submit parsed text via Gemini API
  const handleAIParsing = async () => {
    if (!aiText) return;
    setActionLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      const response = await fetch(`${apiUrl}/transactions/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text: aiText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to process text using AI.");
      }

      setMessage("AI parsed and saved transaction!");
      setAiText("");
      setPage(1);
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // OCR Receipt Scanner Upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      const base64 = await convertToBase64(file);
      const cleanBase64 = base64.split(",")[1]; // strip header

      const response = await fetch(`${apiUrl}/transactions/receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ image: cleanBase64, mimeType: file.type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Receipt OCR processing failed.");
      }

      setMessage(`OCR Complete: Recorded ${data.transaction.category} from ${data.transaction.merchant || "Receipt"}`);
      setPage(1);
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Undo Last transaction
  const handleUndo = async () => {
    setActionLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      const response = await fetch(`${apiUrl}/transactions/undo`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Undo failed.");
      }

      setMessage(`Undone last transaction: ${data.undoneTransaction.notes || data.undoneTransaction.category}`);
      setPage(1);
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create or Update Manual Transaction
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const body = {
      type: txType,
      amount: parseFloat(txAmount),
      category: txCategory,
      merchant: txMerchant || null,
      date: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
      notes: txNotes || null,
      paymentMethod: txMethod,
    };

    const url = editingTransaction 
      ? `${apiUrl}/transactions/${editingTransaction.id}` 
      : `${apiUrl}/transactions`;
    
    const method = editingTransaction ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save transaction.");
      }

      setMessage(editingTransaction ? "Transaction updated!" : "Transaction recorded!");
      setShowManualModal(false);
      setEditingTransaction(null);
      resetManualForm();
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxType(tx.type);
    setTxAmount(String(tx.amount));
    setTxCategory(tx.category);
    setTxMerchant(tx.merchant || "");
    setTxDate(new Date(tx.date).toISOString().split("T")[0]);
    setTxNotes(tx.notes || "");
    setTxMethod(tx.paymentMethod);
    setShowManualModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    setActionLoading(true);
    setError("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      const response = await fetch(`${apiUrl}/transactions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction.");
      }

      setMessage("Transaction deleted.");
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = (format: string) => {
    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const params = new URLSearchParams({ format });
    if (type) params.append("type", type);
    if (category) params.append("category", category);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    // Redirect to the download URL passing the auth token as query param
    // Wait, the backend export route uses JWT Auth header. To trigger file download, we can fetch, get blob, and download in client!
    // This is clean and secures the download endpoint without using unauthenticated query URLs.
    fetch(`${apiUrl}/reports/export?${params.toString()}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(async (res) => {
      if (!res.ok) throw new Error("Export failed.");
      return res.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      let extension = "csv";
      if (format === "excel") extension = "xlsx";
      if (format === "pdf") extension = "pdf";

      a.download = `expense_report_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch((err) => {
      setError("Failed to download statement.");
    });
  };

  const resetManualForm = () => {
    setTxType("EXPENSE");
    setTxAmount("");
    setTxCategory("Food & Drinks");
    setTxMerchant("");
    setTxDate("");
    setTxNotes("");
    setTxMethod("Cash");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-slate-400 text-xs mt-1">Manage and export your expense or income ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Download Exports */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button 
              onClick={() => handleExport("pdf")}
              className="px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-[10px] font-semibold border-r border-slate-800 flex items-center space-x-1 cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => handleExport("excel")}
              className="px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-[10px] font-semibold border-r border-slate-800 flex items-center space-x-1 cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Excel</span>
            </button>
            <button 
              onClick={() => handleExport("csv")}
              className="px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-[10px] font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>

          <button 
            onClick={handleUndo}
            disabled={actionLoading}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Undo className="h-4 w-4" />
            <span>Undo Last</span>
          </button>

          <button 
            onClick={() => {
              setEditingTransaction(null);
              resetManualForm();
              setShowManualModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-blue-600/10 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Manual</span>
          </button>
        </div>
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
          <button 
            onClick={() => { setError(""); setMessage(""); }}
            className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* AI input section */}
      <div className="bg-slate-900/20 border border-slate-850 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
          <span>Quick AI Log (Text or Voice)</span>
        </h3>
        
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAIParsing()}
              placeholder='Try typing "Tea 20", "Uber 350", "Bought coffee for 150 taka using bKash"...'
              className="w-full pr-10 pl-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={toggleSpeech}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                isListening 
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={handleAIParsing}
            disabled={actionLoading || !aiText}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors shadow-lg shadow-blue-600/10"
          >
            {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Parse</span>
          </button>

          {/* OCR Receipt Scanner */}
          <div className="relative">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleReceiptUpload}
              id="receipt-file"
              className="hidden"
            />
            <label
              htmlFor="receipt-file"
              className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02]"
              title="Scan Receipt (OCR)"
            >
              <Upload className="h-4 w-4" />
            </label>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search notes, merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs placeholder-slate-600 focus:outline-none focus:border-slate-700"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
        </div>

        {/* Type Filter */}
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-slate-700"
        >
          <option value="">All Types</option>
          <option value="EXPENSE">Expenses Only</option>
          <option value="INCOME">Income Only</option>
        </select>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-slate-700"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Start Date */}
        <input 
          type="date" 
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-none focus:border-slate-700"
        />

        {/* End Date */}
        <input 
          type="date" 
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-none focus:border-slate-700"
        />
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/10 border border-slate-850 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Fetching transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No transactions match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Notes / Merchant</th>
                  <th className="p-4">Method</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/20">
                    <td className="p-4 text-slate-400">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="bg-slate-900 px-2.5 py-0.5 rounded text-[10px] text-slate-300 border border-slate-800/80">
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-200">{tx.notes || "-"}</p>
                      {tx.merchant && <p className="text-[10px] text-slate-500 mt-0.5">at {tx.merchant}</p>}
                    </td>
                    <td className="p-4 text-slate-400">{tx.paymentMethod}</td>
                    <td className={`p-4 text-right font-bold ${tx.type === "INCOME" ? "text-emerald-400" : "text-slate-200"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}৳{tx.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center space-x-2.5">
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-blue-400 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(tx.id)}
                          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-red-400 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-900 pt-4 px-2">
          <p className="text-[10px] text-slate-500">
            Page <b>{page}</b> of <b>{totalPages}</b>
          </p>
          <div className="flex space-x-1.5">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 p-2 rounded-xl text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 p-2 rounded-xl text-slate-300 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Manual Add/Edit Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button 
              onClick={() => setShowManualModal(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-slate-100 mb-4">
              {editingTransaction ? "Edit Transaction" : "New Transaction"}
            </h3>

            <form onSubmit={handleSaveManual} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Type selection */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Amount (৳)</label>
                  <input
                    type="number"
                    step="any"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    required
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  >
                    {METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-350"
                  />
                </div>

                {/* Merchant */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Merchant</label>
                  <input
                    type="text"
                    value={txMerchant}
                    onChange={(e) => setTxMerchant(e.target.value)}
                    placeholder="e.g. Uber, Foodpanda"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Notes</label>
                <textarea
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Dinner with clients"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                {actionLoading && <RefreshCw className="h-4.5 w-4.5 animate-spin" />}
                <span>{editingTransaction ? "Update Transaction" : "Record Transaction"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

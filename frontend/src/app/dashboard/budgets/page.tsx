"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Target, 
  Plus, 
  Trash2, 
  Sparkles,
  AlertCircle,
  RefreshCw,
  Wallet,
  PieChart
} from "lucide-react";

interface Budget {
  id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
}

interface BudgetProgress {
  category: string;
  budget: number;
  spent: number;
  percent: number;
}

const CATEGORIES = [
  "Food & Drinks", "Transport", "Healthcare", "Entertainment",
  "Utilities", "Income", "Shopping", "Electronics", "Education",
  "Fitness", "Others"
];

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Form
  const [category, setCategory] = useState("Food & Drinks");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchBudgetData();
  }, [selectedMonth, selectedYear]);

  const fetchBudgetData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    setError("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      // 1. Fetch budgets list
      const budgetsRes = await fetch(`${apiUrl}/budgets?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const budgetsData = await budgetsRes.json();
      setBudgets(budgetsData);

      // 2. Fetch dashboard data (provides progress metrics)
      const dashboardRes = await fetch(`${apiUrl}/reports/dashboard`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const dashboardData = await dashboardRes.json();
      setProgress(dashboardData.budgetProgress || []);
    } catch (err: any) {
      setError("Failed to fetch budget metrics.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      const response = await fetch(`${apiUrl}/budgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save budget.");
      }

      setMessage(`Monthly budget set for ${category}!`);
      setAmount("");
      fetchBudgetData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-slate-400 text-xs mt-1">Set limits for expenditure categories and keep spending under control.</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 self-start sm:self-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-transparent border-0 text-xs text-slate-350 focus:ring-0 cursor-pointer py-1.5 px-2.5 font-medium focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m} className="bg-slate-950">
                {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-transparent border-0 text-xs text-slate-350 focus:ring-0 cursor-pointer py-1.5 px-2.5 font-medium focus:outline-none border-l border-slate-850"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y} className="bg-slate-950">
                {y}
              </option>
            ))}
          </select>
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
        </div>
      )}

      {/* Budget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Set Budget Column */}
        <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl h-fit">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
            <Target className="h-4.5 w-4.5 text-blue-500" />
            <span>Set Category Budget</span>
          </h3>

          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Expense Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
              >
                {CATEGORIES.filter(c => c !== "Income").map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Monthly Limit (৳)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="e.g. 5000"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              {actionLoading ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Plus className="h-4.5 w-4.5" />}
              <span>Save Budget Limit</span>
            </button>
          </form>
        </div>

        {/* Budgets Progress Column */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
            <PieChart className="h-4.5 w-4.5 text-blue-500" />
            <span>Budget Utilization</span>
          </h3>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 animate-pulse">Loading budgets...</div>
          ) : progress.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No budgets established for {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long" })} {selectedYear}.
            </div>
          ) : (
            <div className="space-y-6">
              {progress.map((bp) => {
                const remaining = bp.budget - bp.spent;
                const isOver = bp.spent >= bp.budget;

                return (
                  <div key={bp.category} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">{bp.category}</span>
                        <span className="text-[10px] text-slate-500 ml-2">
                          {isOver 
                            ? `Overspent by ৳${Math.abs(remaining).toFixed(2)}` 
                            : `৳${remaining.toFixed(2)} remaining`}
                        </span>
                      </div>
                      <span className="font-bold text-slate-400">
                        ৳{bp.spent.toLocaleString()} / <span className="text-slate-500">৳{bp.budget.toLocaleString()}</span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          bp.percent >= 100 
                            ? "bg-rose-500 animate-pulse" 
                            : bp.percent >= 80 
                            ? "bg-amber-500" 
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.min(bp.percent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

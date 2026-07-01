"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Wallet, 
  Activity,
  ArrowRight,
  Plus,
  AlertCircle,
  Clock
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell
} from "recharts";
import Link from "next/link";

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

interface BudgetProgress {
  category: string;
  budget: number;
  spent: number;
  percent: number;
}

interface DashboardData {
  todaySpending: number;
  weekSpending: number;
  monthIncome: number;
  monthExpense: number;
  monthSavings: number;
  remainingBudget: number;
  totalBudget: number;
  recentTransactions: Transaction[];
  categoryDistribution: { category: string; amount: number }[];
  monthlyTrend: { month: string; income: number; expense: number; savings: number }[];
  budgetProgress: BudgetProgress[];
  upcomingBills: { id: string; title: string; amount: number; category: string; dueDate: string }[];
}

const COLORS = [
  "#2563eb", "#10b981", "#f59e0b", "#ef4444", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", 
  "#f97316", "#64748b", "#3b82f6"
];

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchDashboard = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      try {
        const response = await fetch(`${apiUrl}/reports/dashboard`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            router.push("/");
            return;
          }
          throw new Error("Failed to load dashboard data.");
        }

        const resData = await response.json();
        setData(resData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-900 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-80 bg-slate-900 rounded-2xl border border-slate-800"></div>
          <div className="h-80 bg-slate-900 rounded-2xl border border-slate-800"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center space-x-3">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Error Loading Dashboard</h3>
          <p className="text-sm">{error || "Could not retrieve statistics."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-slate-400 text-xs mt-1">Here is your financial status summary for this month.</p>
        </div>
        <Link 
          href="/dashboard/transactions"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-600/10 active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Transaction</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Today's Spending */}
        <div className="bg-slate-900/35 border border-slate-800/40 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Today's Spending</span>
            <div className="bg-slate-950 p-2 rounded-lg"><Clock className="h-4 w-4 text-slate-400" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">৳{data.todaySpending.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-500 block mt-1">Week spending: ৳{data.weekSpending.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI: Monthly Income */}
        <div className="bg-slate-900/35 border border-slate-800/40 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Monthly Income</span>
            <div className="bg-emerald-500/10 p-2 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-400" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-400">৳{data.monthIncome.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-500/60 block mt-1">Recorded this month</span>
          </div>
        </div>

        {/* KPI: Monthly Expense */}
        <div className="bg-slate-900/35 border border-slate-800/40 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Monthly Expense</span>
            <div className="bg-rose-500/10 p-2 rounded-lg"><TrendingDown className="h-4 w-4 text-rose-400" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-rose-400">৳{data.monthExpense.toLocaleString()}</h3>
            <span className="text-[10px] text-rose-500/60 block mt-1">Savings: ৳{data.monthSavings.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI: Remaining Budget */}
        <div className="bg-slate-900/35 border border-slate-800/40 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Remaining Budget</span>
            <div className="bg-blue-500/10 p-2 rounded-lg"><Wallet className="h-4 w-4 text-blue-400" /></div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold ${data.remainingBudget < 0 ? "text-rose-400" : "text-blue-400"}`}>
              ৳{data.remainingBudget.toLocaleString()}
            </h3>
            <span className="text-[10px] text-slate-500 block mt-1">
              Total Budget: ৳{data.totalBudget.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Graph */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-850 p-6 rounded-2xl flex flex-col">
          <h3 className="font-bold text-sm text-slate-200 mb-4">Cash Flow Graph (Last 6 Months)</h3>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ fontWeight: "bold", color: "#f8fafc" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="income" fill="#10b981" name="Income (৳)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense (৳)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown (Pie Chart) */}
        <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl flex flex-col">
          <h3 className="font-bold text-sm text-slate-200 mb-4">Category Distribution (This Month)</h3>
          <div className="flex-1 min-h-[220px] flex items-center justify-center relative">
            {data.categoryDistribution.length === 0 ? (
              <span className="text-xs text-slate-500">No monthly expenses recorded yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                    itemStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Custom legends for categories */}
          <div className="mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {data.categoryDistribution.map((item, index) => (
              <div key={item.category} className="flex items-center space-x-1.5 bg-slate-900/40 px-2 py-1 rounded-md text-[10px]">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-slate-400 font-medium">{item.category}</span>
                <span className="text-slate-200 font-semibold">৳{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budgets & Lists Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm text-slate-200">Recent Transactions</h3>
            <Link 
              href="/dashboard/transactions" 
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          
          <div className="space-y-3.5">
            {data.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No transactions recorded yet.</div>
            ) : (
              data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between bg-slate-900/35 border border-slate-900 hover:border-slate-850 p-4 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-200 truncate">{tx.notes || tx.category}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1.5">
                      <span className="bg-slate-950 px-2 py-0.5 rounded text-[9px] text-slate-400">{tx.category}</span>
                      <span>•</span>
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{tx.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-bold text-xs ${tx.type === "INCOME" ? "text-emerald-400" : "text-slate-100"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}৳{tx.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Budget Progress & Upcoming Bills */}
        <div className="space-y-6">
          {/* Budget Progress Bars */}
          <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
            <h3 className="font-bold text-sm text-slate-200 mb-4">Budget Progress</h3>
            <div className="space-y-4">
              {data.budgetProgress.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  <span>No budgets defined for this month. </span>
                  <Link href="/dashboard/budgets" className="text-blue-400 font-semibold hover:underline">Setup budgets</Link>
                </div>
              ) : (
                data.budgetProgress.map((bp) => (
                  <div key={bp.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{bp.category}</span>
                      <span className="text-slate-400">
                        ৳{bp.spent.toLocaleString()} / <span className="text-slate-500">৳{bp.budget.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          bp.percent >= 100 
                            ? "bg-rose-500" 
                            : bp.percent >= 80 
                            ? "bg-amber-500" 
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.min(bp.percent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Bills */}
          <div className="bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
            <h3 className="font-bold text-sm text-slate-200 mb-4">Upcoming Bills</h3>
            <div className="space-y-3">
              {data.upcomingBills.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">No active upcoming bills.</div>
              ) : (
                data.upcomingBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between bg-slate-900/30 p-3.5 rounded-xl border border-slate-900">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-300 truncate">{bill.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                        <Calendar className="h-3 w-3 inline text-slate-600" />
                        <span>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-xs text-rose-400">৳{bill.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

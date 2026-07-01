"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Bot, FileSpreadsheet, KeyRound, Sparkles, Send, Mic, RefreshCw } from "lucide-react";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin ? { email, password } : { email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Visual / Marketing Column */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 md:px-16 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-black select-none border-b md:border-b-0 md:border-r border-slate-900">
        <div className="max-w-md mx-auto space-y-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600/25 p-3 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Wallet className="h-8 w-8 text-blue-400" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Antigravity Expense</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Personal Finance, <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Automated by AI.</span>
            </h1>
            <p className="text-slate-400 leading-relaxed text-sm md:text-base">
              Track expenses in real-time. Text or speak to our Telegram Bot, let Gemini classify your spending, sync everything with Google Sheets, and view rich analytics instantly.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900/60 hover:border-slate-800/80 transition-all duration-300">
              <Bot className="h-5 w-5 text-blue-400 mb-2" />
              <h3 className="font-semibold text-sm text-slate-200">Gemini Categorization</h3>
              <p className="text-xs text-slate-500 mt-1">Automatic classification of text & voice entries.</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900/60 hover:border-slate-800/80 transition-all duration-300">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400 mb-2" />
              <h3 className="font-semibold text-sm text-slate-200">Google Sheets Sync</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time ledger updates with running balance.</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900/60 hover:border-slate-800/80 transition-all duration-300">
              <Send className="h-5 w-5 text-blue-400 mb-2" />
              <h3 className="font-semibold text-sm text-slate-200">Telegram Client</h3>
              <p className="text-xs text-slate-500 mt-1">Text inputs like "Tea 20" or voice entries recorded instantly.</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900/60 hover:border-slate-800/80 transition-all duration-300">
              <KeyRound className="h-5 w-5 text-violet-400 mb-2" />
              <h3 className="font-semibold text-sm text-slate-200">Secure Storage</h3>
              <p className="text-xs text-slate-500 mt-1">JWT encrypted sessions and password hashing.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form Column */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-2xl font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className="text-slate-400 text-xs">
              {isLogin ? "Enter your credentials to access your dashboard" : "Sign up to automate your personal finance"}
            </p>
          </div>

          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 disabled:text-slate-400 font-semibold text-sm rounded-lg text-slate-100 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{loading ? "Authenticating..." : isLogin ? "Sign In" : "Register"}</span>
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500">
            <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-blue-400 hover:underline font-semibold ml-1 cursor-pointer"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

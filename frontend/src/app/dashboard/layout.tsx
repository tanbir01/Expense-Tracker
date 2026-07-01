"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Receipt, 
  Target, 
  Settings, 
  LogOut, 
  Wallet,
  Menu,
  X,
  User as UserIcon
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token) {
      router.push("/");
    } else {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          setUserName(userObj.name || "User");
          setUserEmail(userObj.email || "");
        } catch (e) {
          console.error("Error parsing user details");
        }
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
    { name: "Budgets", href: "/dashboard/budgets", icon: Target },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  if (!isAuthenticated) {
    return (
      <div className="flex-1 bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header Nav */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <Wallet className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-sm tracking-wide">Antigravity Expense</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded bg-slate-800 text-slate-200"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[49px] bg-slate-950/95 backdrop-blur-md z-30 flex flex-col p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-6 border-b border-slate-900">
            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
          </div>

          <nav className="flex flex-col space-y-4 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    active 
                      ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/10" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-slate-900 hover:text-red-300 rounded-xl transition-all text-left"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Desktop Sidebar Nav */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 border-r border-slate-800 flex-col p-6 space-y-8 select-none">
        <div className="flex items-center space-x-3">
          <Wallet className="h-7 w-7 text-blue-500" />
          <span className="font-bold text-base tracking-wide">Antigravity Expense</span>
        </div>

        <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/50 border border-slate-850">
          <div className="h-9 w-9 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-xs truncate">{userName}</p>
            <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>

        <nav className="flex flex-col space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all ${
                  active 
                    ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/10" 
                    : "text-slate-400 hover:bg-slate-950 hover:text-slate-200"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-2.5 text-red-400 hover:bg-slate-950 hover:text-red-300 rounded-xl transition-all text-left cursor-pointer text-sm"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main dashboard content container */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

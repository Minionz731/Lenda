import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Search, TrendingUp, Users,
  ShieldCheck, BarChart3, LogOut, Menu, X, Bell, ChevronDown,
  CreditCard, ClipboardList,
} from 'lucide-react';

const NAV_CONFIG = {
  borrower: [
    { to: '/borrower', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/borrower/apply', label: 'Apply for Loan', icon: FileText },
    { to: '/borrower/loans', label: 'My Applications', icon: ClipboardList },
    { to: '/borrower/kyc', label: 'Verification (KYC)', icon: ShieldCheck },
  ],
  lender: [
    { to: '/lender', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/lender/marketplace', label: 'Marketplace', icon: Search },
    { to: '/lender/investments', label: 'My Investments', icon: TrendingUp },
    { to: '/lender/kyc', label: 'Verification (KYC)', icon: ShieldCheck },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/loans', label: 'Loan Applications', icon: FileText },
    { to: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
};

const ROLE_COLORS = {
  borrower: 'bg-blue-500/10 text-blue-400',
  lender: 'bg-emerald-500/10 text-emerald-400',
  admin: 'bg-purple-500/10 text-purple-400',
};

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_CONFIG[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-400 rounded-sm rotate-45 flex-shrink-0" />
          <span className="text-xl font-bold text-white tracking-tight">LendFlow</span>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user?.role]}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === `/${user?.role}`}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-amber-400/10 text-amber-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed inset-y-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-white font-semibold">{title}</h1>
          </div>
          <button className="relative text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
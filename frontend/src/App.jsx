import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages — Auth
import Login    from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Pages — Borrower
import BorrowerDashboard from './pages/borrower/Dashboard';
import BorrowerLoans     from './pages/borrower/Loans';
import BorrowerApply     from './pages/borrower/Apply';
import BorrowerKYC       from './pages/borrower/KYC';

// Pages — Lender
import LenderDashboard   from './pages/lender/Dashboard';
import LenderMarketplace from './pages/lender/Marketplace';
import LenderInvestments from './pages/lender/Investments';
import LenderKYC         from './pages/lender/KYC';

// Pages — Admin
import AdminDashboard    from './pages/admin/Dashboard';
import AdminUsers        from './pages/admin/Users';
import AdminLoans        from './pages/admin/Loans';
import AdminKYC          from './pages/admin/KYC';
import AdminAnalytics    from './pages/admin/Analytics';

// ─────────────────────────────────────────────
// Loading spinner shown while auth is resolving
// ─────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Private route — redirects to login if not authed,
// redirects to own dashboard if wrong role
// ─────────────────────────────────────────────
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
}

// ─────────────────────────────────────────────
// Public route — redirects authed users to their dashboard
// ─────────────────────────────────────────────
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to={`/${user.role}`} replace />;
  return children;
}

// ─────────────────────────────────────────────
// All routes
// ─────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Borrower */}
      <Route path="/borrower"       element={<PrivateRoute allowedRoles={['borrower']}><BorrowerDashboard /></PrivateRoute>} />
      <Route path="/borrower/apply" element={<PrivateRoute allowedRoles={['borrower']}><BorrowerApply /></PrivateRoute>} />
      <Route path="/borrower/loans" element={<PrivateRoute allowedRoles={['borrower']}><BorrowerLoans /></PrivateRoute>} />
      <Route path="/borrower/kyc"   element={<PrivateRoute allowedRoles={['borrower']}><BorrowerKYC /></PrivateRoute>} />

      {/* Lender */}
      <Route path="/lender"              element={<PrivateRoute allowedRoles={['lender']}><LenderDashboard /></PrivateRoute>} />
      <Route path="/lender/marketplace"  element={<PrivateRoute allowedRoles={['lender']}><LenderMarketplace /></PrivateRoute>} />
      <Route path="/lender/investments"  element={<PrivateRoute allowedRoles={['lender']}><LenderInvestments /></PrivateRoute>} />
      <Route path="/lender/kyc"          element={<PrivateRoute allowedRoles={['lender']}><LenderKYC /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin"            element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/users"      element={<PrivateRoute allowedRoles={['admin']}><AdminUsers /></PrivateRoute>} />
      <Route path="/admin/loans"      element={<PrivateRoute allowedRoles={['admin']}><AdminLoans /></PrivateRoute>} />
      <Route path="/admin/kyc"        element={<PrivateRoute allowedRoles={['admin']}><AdminKYC /></PrivateRoute>} />
      <Route path="/admin/analytics"  element={<PrivateRoute allowedRoles={['admin']}><AdminAnalytics /></PrivateRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
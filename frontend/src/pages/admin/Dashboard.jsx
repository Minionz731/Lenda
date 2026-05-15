import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axios } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { Users, FileText, ShieldCheck, DollarSign, TrendingUp, ArrowRight, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentLoans, setRecentLoans] = useState([]);
  const [pendingKYC, setPendingKYC] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, loansRes, kycRes] = await Promise.all([
          axios.get('/admin/analytics'),
          axios.get('/admin/loans?status=submitted&limit=5'),
          axios.get('/admin/kyc?status=pending'),
        ]);
        setAnalytics(analyticsRes.data);
        setRecentLoans(loansRes.data.data);
        setPendingKYC(kycRes.data.slice(0, 5));
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const userCount = analytics?.users?.reduce((s, r) => s + parseInt(r.count), 0) || 0;
  const loanCounts = analytics?.loans || [];
  const totalFunded = parseFloat(analytics?.total_funded || 0);
  const totalFees = parseFloat(analytics?.total_fees || 0);

  const getCount = (status) => loanCounts.find(l => l.status === status)?.count || 0;

  if (loading) return (
    <Layout title="Admin Dashboard">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: userCount, icon: Users, color: 'text-blue-400', sub: 'All roles' },
            { label: 'Pending Review', value: getCount('submitted'), icon: FileText, color: 'text-yellow-400', sub: 'Loan applications' },
            { label: 'KYC Pending', value: pendingKYC.length, icon: ShieldCheck, color: 'text-purple-400', sub: 'Awaiting review' },
            { label: 'Total Funded', value: `$${totalFunded.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', sub: `$${totalFees.toLocaleString()} in fees` },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-xs">{label}</p>
                <Icon size={16} className={color} />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{value}</p>
              <p className="text-slate-500 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* Loan Status Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Loan Pipeline</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              ['Draft', 'draft', 'text-slate-400'],
              ['Submitted', 'submitted', 'text-blue-400'],
              ['In Review', 'under_review', 'text-yellow-400'],
              ['Approved', 'approved', 'text-emerald-400'],
              ['Listed', 'listed', 'text-amber-400'],
              ['Funded', 'funded', 'text-purple-400'],
            ].map(([label, status, color]) => (
              <div key={status} className="bg-slate-800 rounded-lg p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{getCount(status)}</p>
                <p className="text-slate-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Loans Awaiting Review */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Awaiting Review</h2>
              <Link to="/admin/loans" className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentLoans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No pending applications</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentLoans.map((loan) => (
                  <div key={loan.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">{loan.borrower_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {loan.currency} {parseFloat(loan.amount).toLocaleString()} · {loan.purpose} · {loan.country}
                      </p>
                    </div>
                    <Link
                      to="/admin/loans"
                      className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400 hover:text-slate-900 transition-all"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KYC Pending */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Pending KYC</h2>
              <Link to="/admin/kyc" className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {pendingKYC.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No pending KYC verifications</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {pendingKYC.map((kyc) => (
                  <div key={kyc.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">{kyc.full_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {kyc.role} · {kyc.country} · {kyc.id_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Clock size={12} />
                      {new Date(kyc.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
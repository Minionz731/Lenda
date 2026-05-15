import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axios } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FileText, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const map = {
    draft:        'bg-slate-700 text-slate-300',
    submitted:    'bg-blue-500/20 text-blue-400',
    under_review: 'bg-yellow-500/20 text-yellow-400',
    approved:     'bg-emerald-500/20 text-emerald-400',
    listed:       'bg-amber-500/20 text-amber-400',
    funded:       'bg-purple-500/20 text-purple-400',
    rejected:     'bg-red-500/20 text-red-400',
    active:       'bg-emerald-500/20 text-emerald-400',
    completed:    'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status] || 'bg-slate-700 text-slate-300'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function BorrowerDashboard() {
  const [loans, setLoans] = useState([]);
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [loansRes, profileRes] = await Promise.all([
          axios.get('/borrower/loans'),
          axios.get('/auth/me'),
        ]);
        setLoans(loansRes.data);
        setKyc(profileRes.data.kyc_status);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = {
    total: loans.length,
    active: loans.filter(l => ['listed', 'funded', 'active'].includes(l.status)).length,
    pending: loans.filter(l => ['submitted', 'under_review'].includes(l.status)).length,
    totalAmount: loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0),
  };

  return (
    <Layout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KYC Banner */}
          {kyc !== 'approved' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Complete your identity verification</p>
                  <p className="text-slate-400 text-xs mt-0.5">KYC is required before you can submit a loan application.</p>
                </div>
              </div>
              <Link
                to="/borrower/kyc"
                className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Verify Now
              </Link>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Applications', value: stats.total, icon: FileText, color: 'text-blue-400' },
              { label: 'Active/Listed', value: stats.active, icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Under Review', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
              { label: 'Total Requested', value: `$${stats.totalAmount.toLocaleString()}`, icon: CheckCircle, color: 'text-amber-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-400 text-xs">{label}</p>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Recent Applications */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Recent Applications</h2>
              <div className="flex items-center gap-3">
                <Link to="/borrower/loans" className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
                <Link
                  to="/borrower/apply"
                  className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  New Application
                </Link>
              </div>
            </div>

            {loans.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={32} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No applications yet.</p>
                <Link
                  to="/borrower/apply"
                  className="mt-4 inline-flex items-center gap-2 text-amber-400 text-sm hover:text-amber-300"
                >
                  <Plus size={14} />
                  Apply for your first loan
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {loans.slice(0, 5).map((loan) => (
                  <div key={loan.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-white text-sm font-medium capitalize">{loan.purpose.replace('_', ' ')}</p>
                        <StatusBadge status={loan.status} />
                      </div>
                      <p className="text-slate-400 text-xs">
                        {loan.currency} {parseFloat(loan.amount).toLocaleString()} · {loan.term_months} months
                        {loan.interest_rate && ` · ${loan.interest_rate}% p.a.`}
                      </p>
                    </div>
                    <p className="text-slate-500 text-xs">{new Date(loan.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
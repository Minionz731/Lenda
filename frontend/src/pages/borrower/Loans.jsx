import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { axios } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, FileText, Clock, ChevronDown, ChevronUp, Download } from 'lucide-react';

const STATUS_COLOR = {
  draft:        'bg-slate-700 text-slate-300',
  submitted:    'bg-blue-500/20 text-blue-400',
  under_review: 'bg-yellow-500/20 text-yellow-400',
  approved:     'bg-emerald-500/20 text-emerald-400',
  listed:       'bg-amber-500/20 text-amber-400',
  funded:       'bg-purple-500/20 text-purple-400',
  active:       'bg-emerald-500/20 text-emerald-400',
  completed:    'bg-slate-500/20 text-slate-400',
  rejected:     'bg-red-500/20 text-red-400',
  defaulted:    'bg-red-700/20 text-red-500',
};

function LoanCard({ loan }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-medium capitalize">
                {loan.purpose?.replace('_', ' ')}
              </p>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[loan.status] || 'bg-slate-700 text-slate-300'}`}>
                {loan.status?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              ZAR {parseFloat(loan.amount).toLocaleString()} · {loan.term_months} months
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-slate-500 text-xs hidden sm:block">
            {new Date(loan.created_at).toLocaleDateString('en-ZA')}
          </p>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Amount', `ZAR ${parseFloat(loan.amount).toLocaleString()}`],
              ['Term', `${loan.term_months} months`],
              ['Interest Rate', loan.interest_rate ? `${loan.interest_rate}% p.a.` : 'Pending'],
              ['Monthly Payment', loan.monthly_payment ? `ZAR ${parseFloat(loan.monthly_payment).toLocaleString()}` : 'Pending'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-500 text-xs mb-0.5">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {loan.purpose_detail && (
            <div>
              <p className="text-slate-500 text-xs mb-1">Purpose Detail</p>
              <p className="text-slate-300 text-sm">{loan.purpose_detail}</p>
            </div>
          )}

          {loan.admin_notes && (
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Admin Notes</p>
              <p className="text-slate-300 text-sm">{loan.admin_notes}</p>
            </div>
          )}

          {/* Progress bar for funded loans */}
          {loan.listing_status && loan.amount_funded != null && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Funding Progress</span>
                <span>{Math.round((loan.amount_funded / loan.amount) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min((loan.amount_funded / loan.amount) * 100, 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-1">
                ZAR {parseFloat(loan.amount_funded || 0).toLocaleString()} of ZAR {parseFloat(loan.amount).toLocaleString()} raised
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {loan.status === 'draft' && (
              <Link
                to="/borrower/apply"
                className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400 hover:text-slate-900 transition-all"
              >
                Continue Application
              </Link>
            )}
            {loan.status === 'active' && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Clock size={12} /> Repayments in progress
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BorrowerLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/borrower/loans');
        setLoans(data);
      } catch {
        toast.error('Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const FILTERS = ['all', 'draft', 'submitted', 'under_review', 'approved', 'listed', 'active', 'completed', 'rejected'];

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter);

  return (
    <Layout title="My Applications">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">{loans.length} application{loans.length !== 1 ? 's' : ''} total</p>
          <Link
            to="/borrower/apply"
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> New Application
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? `All (${loans.length})` : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {filter === 'all' ? "You haven't applied for any loans yet." : `No ${filter.replace('_', ' ')} applications.`}
            </p>
            {filter === 'all' && (
              <Link to="/borrower/apply" className="mt-4 inline-flex items-center gap-2 text-amber-400 text-sm hover:text-amber-300">
                <Plus size={14} /> Apply for your first loan
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(loan => <LoanCard key={loan.id} loan={loan} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
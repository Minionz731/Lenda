import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { Check, X, Eye, ChevronDown } from 'lucide-react';

const STATUS_TABS = ['submitted', 'under_review', 'approved', 'rejected', 'listed', 'funded'];

const StatusBadge = ({ status }) => {
  const map = {
    submitted:    'bg-blue-500/20 text-blue-400',
    under_review: 'bg-yellow-500/20 text-yellow-400',
    approved:     'bg-emerald-500/20 text-emerald-400',
    listed:       'bg-amber-500/20 text-amber-400',
    funded:       'bg-purple-500/20 text-purple-400',
    rejected:     'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status] || 'bg-slate-700 text-slate-300'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

function ApproveModal({ loan, onClose, onSuccess }) {
  const [rate, setRate] = useState('12');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!rate || parseFloat(rate) <= 0) { toast.error('Enter a valid interest rate'); return; }
    setLoading(true);
    try {
      await api.put(`/admin/loans/${loan.id}/approve`, { interest_rate: parseFloat(rate), admin_notes: notes });
      toast.success('Loan approved and listed on marketplace!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-white font-semibold mb-4">Approve Loan Application</h3>

        <div className="bg-slate-800 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Borrower</span><span className="text-white">{loan.borrower_name}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="text-white">{loan.currency} {parseFloat(loan.amount).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Term</span><span className="text-white">{loan.term_months} months</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Purpose</span><span className="text-white capitalize">{loan.purpose}</span></div>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Interest Rate (% per annum) *</label>
            <input
              type="number"
              min="1"
              max="50"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Notes for borrower</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none transition-colors"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2.5 transition-colors">Cancel</button>
          <button onClick={handle} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-50">
            {loading ? 'Approving...' : 'Approve & List'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ loan, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setLoading(true);
    try {
      await api.put(`/admin/loans/${loan.id}/reject`, { admin_notes: reason });
      toast.success('Application rejected');
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-white font-semibold mb-4">Reject Application</h3>
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1.5">Rejection Reason *</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-400 resize-none transition-colors"
            placeholder="Explain why this application is being rejected..."
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2.5 transition-colors">Cancel</button>
          <button onClick={handle} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-50">
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submitted');
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/loans?status=${activeTab}`);
      setLoans(data.data);
    } catch {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, [activeTab]);

  return (
    <Layout title="Loan Applications">
      {approveTarget && <ApproveModal loan={approveTarget} onClose={() => setApproveTarget(null)} onSuccess={fetchLoans} />}
      {rejectTarget && <RejectModal loan={rejectTarget} onClose={() => setRejectTarget(null)} onSuccess={fetchLoans} />}

      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === s
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loans.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No {activeTab.replace('_',' ')} applications.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
                    <th className="text-left px-5 py-3">Borrower</th>
                    <th className="text-left px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Purpose</th>
                    <th className="text-left px-5 py-3">Country</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Submitted</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white font-medium">{loan.borrower_name}</p>
                        <p className="text-slate-500 text-xs">{loan.borrower_email}</p>
                      </td>
                      <td className="px-5 py-4 text-white font-medium">
                        {loan.currency} {parseFloat(loan.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-slate-300 capitalize">{loan.purpose?.replace('_', ' ')}</td>
                      <td className="px-5 py-4 text-slate-300">{loan.country}</td>
                      <td className="px-5 py-4"><StatusBadge status={loan.status} /></td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {['submitted', 'under_review'].includes(loan.status) && (
                            <>
                              <button
                                onClick={() => setApproveTarget(loan)}
                                className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(loan)}
                                className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500 hover:text-white transition-all"
                              >
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
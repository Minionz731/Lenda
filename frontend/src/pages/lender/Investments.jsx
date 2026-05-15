import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { TrendingUp, Globe, Calendar } from 'lucide-react';

const STATUS_COLOR = {
  active:    'bg-emerald-500/20 text-emerald-400',
  pending:   'bg-yellow-500/20 text-yellow-400',
  repaid:    'bg-blue-500/20 text-blue-400',
  defaulted: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-slate-700 text-slate-400',
};

const RISK_COLOR = {
  A: 'bg-emerald-500/20 text-emerald-400',
  B: 'bg-blue-500/20 text-blue-400',
  C: 'bg-yellow-500/20 text-yellow-400',
  D: 'bg-orange-500/20 text-orange-400',
  E: 'bg-red-500/20 text-red-400',
};

export default function LenderInvestments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/lender/investments');
        setInvestments(data);
      } catch {
        toast.error('Failed to load investments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === 'all' ? investments : investments.filter(i => i.status === filter);

  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalActive   = investments.filter(i => i.status === 'active').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalRepaid   = investments.filter(i => i.status === 'repaid').reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  return (
    <Layout title="My Investments">
      <div className="space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Invested',  value: `ZAR ${totalInvested.toLocaleString()}`,  sub: `${investments.length} investments` },
            { label: 'Active Capital',  value: `ZAR ${totalActive.toLocaleString()}`,    sub: `${investments.filter(i=>i.status==='active').length} active loans` },
            { label: 'Total Repaid',    value: `ZAR ${totalRepaid.toLocaleString()}`,    sub: `${investments.filter(i=>i.status==='repaid').length} completed` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-slate-400 text-xs mb-2">{label}</p>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-slate-500 text-xs mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'pending', 'repaid', 'defaulted'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-amber-400 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? `All (${investments.length})` : f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <TrendingUp size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No investments found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
                    <th className="text-left px-5 py-3">Loan</th>
                    <th className="text-left px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Rate</th>
                    <th className="text-left px-5 py-3">Grade</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white font-medium capitalize">{inv.purpose?.replace('_', ' ')}</p>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                          <Globe size={11} />
                          {inv.borrower_country}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white font-semibold">
                        ZAR {parseFloat(inv.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-emerald-400 font-medium">
                        {inv.interest_rate}% p.a.
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${RISK_COLOR[inv.risk_grade] || 'bg-slate-700 text-slate-300'}`}>
                          {inv.risk_grade || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[inv.status] || 'bg-slate-700 text-slate-300'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Calendar size={11} />
                          {new Date(inv.invested_at).toLocaleDateString('en-ZA')}
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
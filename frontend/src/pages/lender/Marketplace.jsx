import { useEffect, useState } from 'react';
import { axios } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { Search, Filter, TrendingUp, Clock, Globe, DollarSign, X } from 'lucide-react';

const RISK_COLORS = {
  A: 'bg-emerald-500/20 text-emerald-400',
  B: 'bg-blue-500/20 text-blue-400',
  C: 'bg-yellow-500/20 text-yellow-400',
  D: 'bg-orange-500/20 text-orange-400',
  E: 'bg-red-500/20 text-red-400',
};

function InvestModal({ listing, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const remaining = parseFloat(listing.amount_remaining || 0);

  const handleInvest = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || val > remaining) {
      toast.error(`Enter an amount between $1 and $${remaining.toLocaleString()}`);
      return;
    }
    setLoading(true);
    try {
      await axios.post(`/lender/marketplace/${listing.id}/invest`, { amount: val });
      toast.success('Investment placed successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Investment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold">Invest in this Loan</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Interest Rate</span>
            <span className="text-emerald-400 font-medium">{listing.interest_rate}% p.a.</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Term</span>
            <span className="text-white">{listing.term_months} months</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Risk Grade</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_COLORS[listing.risk_grade] || 'bg-slate-700 text-slate-300'}`}>
              {listing.risk_grade || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Max Investable</span>
            <span className="text-white font-medium">${remaining.toLocaleString()}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-1.5">Investment Amount (USD)</label>
          <input
            type="number"
            min="1"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
            placeholder={`Max: $${remaining.toLocaleString()}`}
          />
        </div>

        <button
          onClick={handleInvest}
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-3 transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Invest $${parseFloat(amount || 0).toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}

export default function LenderMarketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [filters, setFilters] = useState({ risk_grade: '', term_months: '' });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.risk_grade) params.set('risk_grade', filters.risk_grade);
      if (filters.term_months) params.set('term_months', filters.term_months);
      const { data } = await axios.get(`/lender/marketplace?${params}`);
      setListings(data.data);
    } catch {
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, [filters]);

  return (
    <Layout title="Marketplace">
      {selectedListing && (
        <InvestModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onSuccess={fetchListings}
        />
      )}

      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.risk_grade}
            onChange={(e) => setFilters(f => ({ ...f, risk_grade: e.target.value }))}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="">All Risk Grades</option>
            {['A','B','C','D','E'].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select
            value={filters.term_months}
            onChange={(e) => setFilters(f => ({ ...f, term_months: e.target.value }))}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="">All Terms</option>
            {[3,6,12,18,24,36,48,60].map(t => <option key={t} value={t}>{t < 12 ? `${t} months` : `${t/12} year${t>12?'s':''}`}</option>)}
          </select>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <Search size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No listings available right now.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const pct = parseFloat(listing.funded_pct || 0);
              return (
                <div key={listing.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white font-semibold capitalize">{listing.purpose?.replace('_', ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Globe size={12} className="text-slate-500" />
                        <span className="text-slate-500 text-xs">{listing.borrower_country}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${RISK_COLORS[listing.risk_grade] || 'bg-slate-700 text-slate-300'}`}>
                      {listing.risk_grade || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Loan Amount</p>
                      <p className="text-white text-sm font-semibold">
                        {listing.currency} {parseFloat(listing.amount_needed).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Interest Rate</p>
                      <p className="text-emerald-400 text-sm font-semibold">{listing.interest_rate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Term</p>
                      <p className="text-white text-sm">{listing.term_months} months</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">Remaining</p>
                      <p className="text-white text-sm font-medium">
                        ${parseFloat(listing.amount_remaining || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Funded</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedListing(listing)}
                    className="w-full bg-amber-400/10 hover:bg-amber-400 text-amber-400 hover:text-slate-900 border border-amber-400/30 hover:border-amber-400 font-medium text-sm rounded-lg py-2 transition-all"
                  >
                    Invest Now
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
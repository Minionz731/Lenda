import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { TrendingUp, DollarSign, Search, AlertCircle, ArrowRight, Wallet } from 'lucide-react';

export default function LenderDashboard() {
  const [profile, setProfile]       = useState(null);
  const [investments, setInvestments] = useState([]);
  const [listings, setListings]     = useState([]);
  const [kyc, setKyc]               = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, invRes, listRes, meRes] = await Promise.all([
          api.get('/lender/profile'),
          api.get('/lender/investments'),
          api.get('/lender/marketplace?limit=3'),
          api.get('/auth/me'),
        ]);
        setProfile(profRes.data);
        setInvestments(invRes.data);
        setListings(listRes.data.data || []);
        setKyc(meRes.data.kyc_status);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalInvested  = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const activeCount    = investments.filter(i => i.status === 'active').length;
  const balance        = parseFloat(profile?.available_balance || 0);

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
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Complete identity verification</p>
                  <p className="text-slate-400 text-xs">KYC required before investing.</p>
                </div>
              </div>
              <Link to="/lender/kyc" className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Verify Now
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Available Balance', value: `ZAR ${balance.toLocaleString()}`, icon: Wallet,      color: 'text-amber-400' },
              { label: 'Total Invested',    value: `ZAR ${totalInvested.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
              { label: 'Active Loans',      value: activeCount,   icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Investments',       value: investments.length, icon: Search, color: 'text-purple-400' },
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

          {/* Top up wallet CTA */}
          <div className="bg-gradient-to-r from-amber-400/10 to-amber-600/5 border border-amber-400/20 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Top Up Your Wallet</p>
              <p className="text-slate-400 text-sm mt-0.5">Add ZAR funds via Stitch instant EFT or Ozow Pay by Bank.</p>
            </div>
            <Link
              to="/lender/marketplace"
              className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Add Funds
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Investments */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-white font-semibold">Recent Investments</h2>
                <Link to="/lender/investments" className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {investments.length === 0 ? (
                <div className="p-10 text-center">
                  <TrendingUp size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No investments yet.</p>
                  <Link to="/lender/marketplace" className="mt-3 inline-block text-amber-400 text-sm hover:text-amber-300">
                    Browse marketplace →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {investments.slice(0, 4).map(inv => (
                    <div key={inv.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium capitalize">{inv.purpose?.replace('_', ' ')}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{inv.interest_rate}% p.a. · {inv.term_months} months · {inv.borrower_country}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">ZAR {parseFloat(inv.amount).toLocaleString()}</p>
                        <p className={`text-xs ${inv.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>{inv.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Marketplace Listings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-white font-semibold">Open Opportunities</h2>
                <Link to="/lender/marketplace" className="text-amber-400 text-sm hover:text-amber-300 flex items-center gap-1">
                  Browse all <ArrowRight size={14} />
                </Link>
              </div>
              {listings.length === 0 ? (
                <div className="p-10 text-center">
                  <Search size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No open listings right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {listings.map(l => (
                    <div key={l.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium capitalize">{l.purpose?.replace('_', ' ')}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          ZAR {parseFloat(l.amount_needed).toLocaleString()} · {l.borrower_country}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-sm font-semibold">{l.interest_rate}% p.a.</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${l.risk_grade === 'A' ? 'bg-emerald-500/20 text-emerald-400' : l.risk_grade === 'B' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          Grade {l.risk_grade || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
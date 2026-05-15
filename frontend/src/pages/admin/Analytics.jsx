import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444', '#64748b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {typeof p.value === 'number' && p.value > 1000 ? `ZAR ${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get('/admin/analytics');
        setData(res);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Layout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  // Compute totals from data
  const totalUsers   = data?.users?.reduce((s, r) => s + parseInt(r.count), 0) || 0;
  const totalFunded  = data?.total_funded || 0;
  const totalFees    = data?.total_fees || 0;

  const loanStatusData = (data?.loans || []).map(l => ({
    name: l.status.replace('_', ' '),
    value: parseInt(l.count),
  }));

  const userRoleData = (data?.users || []).map(u => ({
    name: u.role,
    count: parseInt(u.count),
  }));

  const totalLoans = loanStatusData.reduce((s, l) => s + l.value, 0);

  return (
    <Layout title="Analytics">
      <div className="space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users',    value: totalUsers,                           icon: Users,      color: 'text-blue-400' },
            { label: 'Total Loans',    value: totalLoans,                           icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Total Funded',   value: `ZAR ${parseFloat(totalFunded).toLocaleString()}`, icon: DollarSign, color: 'text-amber-400' },
            { label: 'Platform Fees',  value: `ZAR ${parseFloat(totalFees).toLocaleString()}`,  icon: Percent,    color: 'text-purple-400' },
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Loan Status Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-5">Loan Status Breakdown</h2>
            {loanStatusData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No loan data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={loanStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {loanStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Users by Role */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-5">Users by Role</h2>
            {userRoleData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No user data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={userRoleData} barSize={40}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Loan Status Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Loan Pipeline Detail</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-800">
                  <th className="text-left pb-3">Status</th>
                  <th className="text-right pb-3">Count</th>
                  <th className="text-right pb-3">% of Total</th>
                  <th className="text-right pb-3">Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loanStatusData.sort((a,b) => b.value - a.value).map((row, i) => (
                  <tr key={row.name}>
                    <td className="py-3 text-white capitalize">{row.name}</td>
                    <td className="py-3 text-right text-white font-semibold">{row.value}</td>
                    <td className="py-3 text-right text-slate-400">{totalLoans ? ((row.value / totalLoans) * 100).toFixed(1) : 0}%</td>
                    <td className="py-3 text-right pl-4 w-32">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${totalLoans ? (row.value / totalLoans) * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Revenue Summary</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Capital Funded',  value: `ZAR ${parseFloat(totalFunded).toLocaleString()}`,  desc: 'Total loans funded by lenders' },
              { label: 'Platform Fees Earned',  value: `ZAR ${parseFloat(totalFees).toLocaleString()}`,    desc: 'Commission, application & listing fees' },
              { label: 'Fee Rate',              value: totalFunded > 0 ? `${((totalFees / totalFunded) * 100).toFixed(2)}%` : '—', desc: 'Fees as % of funded capital' },
            ].map(({ label, value, desc }) => (
              <div key={label} className="bg-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">{label}</p>
                <p className="text-white text-xl font-bold">{value}</p>
                <p className="text-slate-500 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
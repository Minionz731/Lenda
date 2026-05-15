import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, Shield, Ban, CheckCircle } from 'lucide-react';

const STATUS_COLOR = {
  active:      'bg-emerald-500/20 text-emerald-400',
  pending_kyc: 'bg-yellow-500/20 text-yellow-400',
  suspended:   'bg-orange-500/20 text-orange-400',
  banned:      'bg-red-500/20 text-red-400',
};

const ROLE_COLOR = {
  borrower: 'bg-blue-500/20 text-blue-400',
  lender:   'bg-purple-500/20 text-purple-400',
  admin:    'bg-amber-500/20 text-amber-400',
};

export default function AdminUsers() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all')   params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get(`/admin/users?${params}&limit=50`);
      setUsers(data.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, statusFilter]);

  const updateStatus = async (userId, status) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { status });
      toast.success(`User ${status}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Users">
      <div className="space-y-5">

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-400">
            <option value="all">All Roles</option>
            <option value="borrower">Borrower</option>
            <option value="lender">Lender</option>
            <option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-400">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_kyc">Pending KYC</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
                    <th className="text-left px-5 py-3">User</th>
                    <th className="text-left px-5 py-3">Role</th>
                    <th className="text-left px-5 py-3">Country</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Joined</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(user => (
                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.full_name}</p>
                            <p className="text-slate-500 text-xs">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLOR[user.role] || 'bg-slate-700 text-slate-300'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{user.country || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[user.status] || 'bg-slate-700 text-slate-300'}`}>
                          {user.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {new Date(user.created_at).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {user.status !== 'active' && (
                            <button onClick={() => updateStatus(user.id, 'active')}
                              className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                              <CheckCircle size={11} /> Activate
                            </button>
                          )}
                          {user.status === 'active' && user.role !== 'admin' && (
                            <button onClick={() => updateStatus(user.id, 'suspended')}
                              className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2.5 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition-all">
                              <Shield size={11} /> Suspend
                            </button>
                          )}
                          {user.status !== 'banned' && user.role !== 'admin' && (
                            <button onClick={() => { if (confirm(`Ban ${user.full_name}?`)) updateStatus(user.id, 'banned'); }}
                              className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                              <Ban size={11} /> Ban
                            </button>
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
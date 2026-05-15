import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { axios } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, X, Check, Eye, Clock, AlertTriangle } from 'lucide-react';

const DHA_STATUS_COLOR = {
  verified:     'text-emerald-400',
  failed:       'text-red-400',
  deceased:     'text-red-500',
  blocked:      'text-red-500',
  not_checked:  'text-slate-500',
};

function KYCDetailModal({ kyc, onClose, onAction }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('details');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await axios.put(`/admin/kyc/${kyc.id}/approve`);
      toast.success('KYC approved');
      onAction();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { toast.error('Please enter a rejection reason'); return; }
    setLoading(true);
    try {
      await axios.put(`/admin/kyc/${kyc.id}/reject`, { rejection_reason: reason });
      toast.success('KYC rejected');
      onAction();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-white font-semibold">{kyc.full_name}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{kyc.email} · {kyc.role}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {['details','decision'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${tab === t ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'details' && (
            <div className="space-y-4">
              {/* Identity */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Identity</p>
                <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                  {[
                    ['SA ID Number', kyc.sa_id_number || '—'],
                    ['Date of Birth', kyc.date_of_birth ? new Date(kyc.date_of_birth).toLocaleDateString('en-ZA') : '—'],
                    ['Province', kyc.province || '—'],
                    ['Role', kyc.role],
                    ['Submitted', new Date(kyc.submitted_at).toLocaleString('en-ZA')],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-400">{k}</span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Checks */}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Automated Checks</p>
                <div className="space-y-2">
                  {[
                    { label: 'DHA Verification',    value: kyc.dha_check_status,  key: 'dha_check_status' },
                    { label: 'DHA Alive Status',    value: kyc.dha_alive_status,  key: 'dha_alive_status' },
                    { label: 'DHA Name Match',      value: kyc.dha_name_match ? 'Yes' : kyc.dha_name_match === false ? 'No' : '—', key: 'name' },
                    { label: 'SAFPS Fraud Check',   value: kyc.safps_status || '—', key: 'safps' },
                    { label: 'Bank AVS',            value: kyc.avs_status || '—', key: 'avs' },
                    { label: 'Face Match Score',    value: kyc.face_match_score ? `${kyc.face_match_score}%` : '—', key: 'face' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-800 rounded-lg px-4 py-2.5 flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className={`text-sm font-medium ${
                        value === 'verified' || value === 'alive' || value === 'Yes' || value === 'clear' ? 'text-emerald-400' :
                        value === 'failed' || value === 'deceased' || value === 'No' ? 'text-red-400' :
                        'text-slate-300'
                      }`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              {(kyc.selfie_url || kyc.id_front_url) && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Documents</p>
                  <div className="grid grid-cols-2 gap-2">
                    {kyc.selfie_url && (
                      <a href={kyc.selfie_url} target="_blank" rel="noreferrer"
                        className="bg-slate-800 rounded-lg p-3 text-center text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                        <Eye size={16} className="mx-auto mb-1" /> Selfie
                      </a>
                    )}
                    {kyc.id_front_url && (
                      <a href={kyc.id_front_url} target="_blank" rel="noreferrer"
                        className="bg-slate-800 rounded-lg p-3 text-center text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                        <Eye size={16} className="mx-auto mb-1" /> ID Front
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'decision' && (
            <div className="space-y-4">
              {/* Warnings */}
              {(kyc.dha_check_status === 'failed' || kyc.safps_status === 'listed_fraudster' || kyc.dha_alive_status === 'deceased') && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
                  <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-red-400 font-medium">Automated flags detected</p>
                    {kyc.dha_check_status === 'failed' && <p className="text-slate-300 mt-1">DHA verification failed</p>}
                    {kyc.safps_status === 'listed_fraudster' && <p className="text-slate-300 mt-1">Listed as fraudster on SAFPS</p>}
                    {kyc.dha_alive_status === 'deceased' && <p className="text-slate-300 mt-1">DHA records show ID holder as deceased</p>}
                  </div>
                </div>
              )}

              <button onClick={handleApprove} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-50">
                <Check size={16} /> Approve KYC
              </button>

              <div className="space-y-2">
                <label className="block text-sm text-slate-400">Rejection Reason (required to reject)</label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-400 resize-none transition-colors"
                  placeholder="e.g. ID photo unclear, name mismatch, documents expired..." />
                <button onClick={handleReject} disabled={loading || !reason.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-semibold rounded-lg py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <X size={16} /> Reject KYC
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminKYC() {
  const [queue, setQueue]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/admin/kyc?status=${status}`);
      setQueue(data);
    } catch {
      toast.error('Failed to load KYC queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, [status]);

  return (
    <Layout title="KYC Review">
      {selected && <KYCDetailModal kyc={selected} onClose={() => setSelected(null)} onAction={fetchQueue} />}

      <div className="space-y-5">
        {/* Status filter */}
        <div className="flex gap-2">
          {['pending','in_review','approved','rejected'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                status === s ? 'bg-amber-400 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <div className="p-16 text-center">
              <ShieldCheck size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No {status.replace('_',' ')} KYC submissions.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {queue.map(kyc => (
                <div key={kyc.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {kyc.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{kyc.full_name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{kyc.email} · {kyc.role} · {kyc.country}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${DHA_STATUS_COLOR[kyc.dha_check_status] || 'text-slate-500'}`}>
                          DHA: {kyc.dha_check_status?.replace('_',' ') || 'pending'}
                        </span>
                        {kyc.safps_status && (
                          <span className={`text-xs ${kyc.safps_status === 'clear' ? 'text-emerald-400' : 'text-red-400'}`}>
                            SAFPS: {kyc.safps_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1 text-slate-500 text-xs">
                      <Clock size={11} />
                      {new Date(kyc.submitted_at).toLocaleDateString('en-ZA')}
                    </div>
                    <button onClick={() => setSelected(kyc)}
                      className="flex items-center gap-1.5 bg-amber-400/10 text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg text-xs hover:bg-amber-400 hover:text-slate-900 transition-all">
                      <Eye size={12} /> Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
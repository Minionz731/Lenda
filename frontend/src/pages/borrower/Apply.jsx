import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { Upload, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const PURPOSES = [
  { value: 'business', label: '🏢 Business', desc: 'Start or grow a business' },
  { value: 'education', label: '🎓 Education', desc: 'Tuition and study costs' },
  { value: 'medical', label: '🏥 Medical', desc: 'Healthcare expenses' },
  { value: 'home_improvement', label: '🏠 Home Improvement', desc: 'Renovations and repairs' },
  { value: 'debt_consolidation', label: '💳 Debt Consolidation', desc: 'Combine existing debts' },
  { value: 'personal', label: '👤 Personal', desc: 'Other personal needs' },
];

const TERMS = [3, 6, 12, 18, 24, 36, 48, 60];

const STEP_LABELS = ['Loan Details', 'Documents', 'Review & Submit'];

export default function BorrowerApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    amount: '',
    currency: 'USD',
    purpose: '',
    purpose_detail: '',
    term_months: 12,
  });

  const updateForm = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Step 1 — Create draft
  const handleDetailsSubmit = async () => {
    if (!form.purpose || !form.amount || form.amount < 100) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/borrower/loans', form);
      setApplicationId(data.id);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Upload documents
  const handleDocUpload = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    try {
      await api.post(`/borrower/loans/${applicationId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles((prev) => [...prev, { name: file.name, type: docType }]);
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  // Step 3 — Submit
  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/borrower/loans/${applicationId}/submit`);
      toast.success('Application submitted! We will review it within 2–3 business days.');
      navigate('/borrower/loans');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const monthlyEst = form.amount && form.term_months
    ? (parseFloat(form.amount) / form.term_months * 1.08).toFixed(2)
    : null;

  return (
    <Layout title="Apply for a Loan">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i <= step ? 'text-white' : 'text-slate-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${i < step ? 'bg-amber-400 text-slate-900' : i === step ? 'border-2 border-amber-400 text-amber-400' : 'border-2 border-slate-700 text-slate-500'}`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className="text-sm hidden sm:block">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? 'bg-amber-400' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8">
          {/* STEP 0 — Loan Details */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-lg font-semibold mb-1">Loan Details</h2>
                <p className="text-slate-400 text-sm">Tell us about the loan you need.</p>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm text-slate-400 mb-3">Loan Purpose *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSES.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm('purpose', value)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        form.purpose === value
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-sm text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1.5">Loan Amount *</label>
                  <input
                    type="number"
                    min="100"
                    value={form.amount}
                    onChange={(e) => updateForm('amount', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => updateForm('currency', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
                  >
                    {['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Term */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Repayment Term</label>
                <div className="flex flex-wrap gap-2">
                  {TERMS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateForm('term_months', t)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        form.term_months === t
                          ? 'bg-amber-400 text-slate-900 font-medium'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t < 12 ? `${t}mo` : `${t / 12}yr`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail */}
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Additional Details</label>
                <textarea
                  value={form.purpose_detail}
                  onChange={(e) => updateForm('purpose_detail', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  placeholder="Briefly describe how you plan to use this loan..."
                />
              </div>

              {/* Estimate */}
              {monthlyEst && (
                <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                  <p className="text-slate-400 text-sm">Estimated monthly payment</p>
                  <p className="text-white font-semibold">{form.currency} {parseFloat(monthlyEst).toLocaleString()}</p>
                </div>
              )}

              <button
                onClick={handleDetailsSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-3 transition-colors disabled:opacity-50"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 1 — Documents */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-lg font-semibold mb-1">Supporting Documents</h2>
                <p className="text-slate-400 text-sm">Upload at least one document to support your application.</p>
              </div>

              {[
                { type: 'bank_statement', label: 'Bank Statement', desc: 'Last 3 months' },
                { type: 'payslip', label: 'Payslip / Income Proof', desc: 'Most recent payslip' },
                { type: 'tax_return', label: 'Tax Return', desc: 'Most recent year' },
                { type: 'business_registration', label: 'Business Registration', desc: 'If self-employed' },
              ].map(({ type, label, desc }) => {
                const uploaded = files.find(f => f.type === type);
                return (
                  <div key={type} className={`border rounded-xl p-4 transition-colors ${uploaded ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-slate-500 text-xs">{desc}</p>
                      </div>
                      {uploaded ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                          <Check size={14} />
                          Uploaded
                        </div>
                      ) : (
                        <label className="cursor-pointer flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-3 py-1.5 rounded-lg transition-colors">
                          <Upload size={14} />
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleDocUpload(e.target.files[0], type)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-3 transition-colors">
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={files.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Review */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-lg font-semibold mb-1">Review & Submit</h2>
                <p className="text-slate-400 text-sm">Please review your application before submitting.</p>
              </div>

              <div className="bg-slate-800 rounded-xl p-5 space-y-3">
                {[
                  ['Purpose', PURPOSES.find(p => p.value === form.purpose)?.label || form.purpose],
                  ['Amount', `${form.currency} ${parseFloat(form.amount).toLocaleString()}`],
                  ['Term', `${form.term_months} months`],
                  ['Est. Monthly', `${form.currency} ${monthlyEst}`],
                  ['Documents', `${files.length} file(s) uploaded`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{k}</span>
                    <span className="text-white text-sm font-medium">{v}</span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
                By submitting, you confirm the information provided is accurate and consent to our{' '}
                <span className="text-amber-400 cursor-pointer">Terms of Service</span>.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-3 transition-colors">
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-3 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
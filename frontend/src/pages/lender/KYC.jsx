import { useState } from 'react';
import { axios } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { ShieldCheck, Building2, Info, Check, ChevronRight } from 'lucide-react';

const SA_BANKS = [
  { value: 'absa',          label: 'ABSA Bank',              code: '632005' },
  { value: 'fnb',           label: 'First National Bank (FNB)', code: '250655' },
  { value: 'standard_bank', label: 'Standard Bank',          code: '051001' },
  { value: 'nedbank',       label: 'Nedbank',                code: '198765' },
  { value: 'capitec',       label: 'Capitec Bank',           code: '470010' },
  { value: 'african_bank',  label: 'African Bank',           code: '430000' },
  { value: 'discovery',     label: 'Discovery Bank',         code: '679000' },
  { value: 'tyme_bank',     label: 'TymeBank',               code: '678910' },
  { value: 'investec',      label: 'Investec',               code: '580105' },
];

const PROVINCES = [
  'Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
  'Limpopo','Mpumalanga','North West','Free State','Northern Cape',
];

const decodeSAID = (id) => {
  if (!id || id.length < 6) return null;
  const yy = parseInt(id.substring(0, 2));
  const mm = parseInt(id.substring(2, 4));
  const dd = parseInt(id.substring(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = yy >= 0 && yy <= 25 ? 2000 + yy : 1900 + yy;
  const genderDigits = id.length >= 10 ? parseInt(id.substring(6, 10)) : null;
  const citizenDigit = id.length >= 11 ? parseInt(id[10]) : null;
  return {
    dob: `${dd}/${mm}/${year}`,
    gender: genderDigits !== null ? (genderDigits >= 5000 ? 'Male' : 'Female') : null,
    citizen: citizenDigit !== null ? (citizenDigit === 0 ? 'SA Citizen' : 'Permanent Resident') : null,
    age: new Date().getFullYear() - year,
  };
};

const STEPS = ['SA Identity', 'Bank Account', 'Consent & Submit'];

export default function LenderKYC() {
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const [form, setForm] = useState({
    sa_id_number: '',
    province: '',
    city: '',
    street_address: '',
    postal_code: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    account_type: 'cheque',
    popia_consent: false,
    nca_consent: false,
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const decoded = decodeSAID(form.sa_id_number);

  const handleStep0 = () => {
    if (form.sa_id_number.length !== 13) { toast.error('SA ID number must be 13 digits'); return; }
    if (!decoded || decoded.age < 18)    { toast.error('You must be 18 or older'); return; }
    if (!form.province || !form.city || !form.street_address) { toast.error('Please fill in all address fields'); return; }
    setStep(1);
  };

  const handleStep1 = () => {
    if (!form.bank_name || !form.bank_account_number) { toast.error('Please enter your bank details'); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.popia_consent || !form.nca_consent) { toast.error('Please provide both consents'); return; }
    setLoading(true);
    try {
      await axios.post('/kyc/submit', form);
      setDone(true);
      toast.success('KYC submitted! Verification in progress.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Layout title="Verification (KYC)">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Verification Submitted</h2>
          <p className="text-slate-400 text-sm">Your identity is being verified against DHA and credit bureau records. You'll be notified within 1 business day.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Identity Verification (KYC)">
      <div className="max-w-xl mx-auto">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex gap-3">
          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-300 text-sm">As a lender, your identity is verified against the <strong className="text-white">Department of Home Affairs (DHA)</strong> before you can invest. Required by FICA and POPIA.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                  ${i < step ? 'bg-amber-400 text-slate-900' : i === step ? 'border-2 border-amber-400 text-amber-400' : 'border-2 border-slate-700 text-slate-500'}`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-slate-500'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-amber-400' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {/* Step 0 — SA ID + Address */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-white text-lg font-semibold">SA Identity Number</h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">SA ID Number *</label>
                <input
                  type="text"
                  maxLength={13}
                  value={form.sa_id_number}
                  onChange={(e) => update('sa_id_number', e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg tracking-widest font-mono focus:outline-none focus:border-amber-400 transition-colors"
                  placeholder="0000000000000"
                />
                {decoded && form.sa_id_number.length >= 10 && (
                  <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-slate-500 text-xs">DOB</p><p className="text-white">{decoded.dob}</p></div>
                    <div><p className="text-slate-500 text-xs">Gender</p><p className="text-white">{decoded.gender}</p></div>
                    <div><p className="text-slate-500 text-xs">Citizenship</p><p className="text-white">{decoded.citizen}</p></div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1.5">Street Address *</label>
                  <input value={form.street_address} onChange={e => update('street_address', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400" placeholder="123 Main Street, Sandton" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">City *</label>
                  <input value={form.city} onChange={e => update('city', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400" placeholder="Johannesburg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Postal Code</label>
                  <input value={form.postal_code} onChange={e => update('postal_code', e.target.value.replace(/\D/g,'').slice(0,4))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400" placeholder="2196" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1.5">Province *</label>
                  <select value={form.province} onChange={e => update('province', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400">
                    <option value="">Select Province</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleStep0}
                className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-3 transition-colors">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1 — Bank Account */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                <Building2 size={18} className="text-amber-400" /> Bank Account
              </h2>
              <p className="text-slate-400 text-sm">This is where your investment returns will be paid out.</p>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Bank *</label>
                <select value={form.bank_name} onChange={e => { const b = SA_BANKS.find(x => x.value === e.target.value); update('bank_name', e.target.value); update('bank_branch_code', b?.code||''); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400">
                  <option value="">Select your bank</option>
                  {SA_BANKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
                {form.bank_branch_code && <p className="text-slate-500 text-xs mt-1">Branch code: <span className="text-slate-300">{form.bank_branch_code}</span></p>}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Account Number *</label>
                <input value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value.replace(/\D/g,''))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-amber-400" placeholder="000 000 0000" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Account Type</label>
                <div className="flex gap-3">
                  {['cheque','savings'].map(t => (
                    <button key={t} onClick={() => update('account_type', t)}
                      className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${form.account_type === t ? 'bg-amber-400 text-slate-900 font-medium' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {t === 'cheque' ? 'Cheque / Current' : 'Savings'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2.5 transition-colors">Back</button>
                <button onClick={handleStep1} className="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-2.5 transition-colors">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Consent */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-white text-lg font-semibold">Consent & Submit</h2>

              <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                {[
                  ['SA ID Number', `${form.sa_id_number.slice(0,6)}•••••••`],
                  ['Date of Birth', decoded?.dob || '—'],
                  ['Province', form.province],
                  ['Bank', SA_BANKS.find(b => b.value === form.bank_name)?.label || '—'],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-white">{v}</span>
                  </div>
                ))}
              </div>

              {[
                { key: 'popia_consent', label: 'POPIA Consent', text: 'I consent to Lenda verifying my identity against the Department of Home Affairs (DHA), SAFPS, and SA credit bureaus under POPIA.' },
                { key: 'nca_consent',   label: 'FICA Consent',  text: 'I consent to Lenda using my information for FICA compliance and anti-money laundering checks as required by SA law.' },
              ].map(({ key, label, text }) => (
                <label key={key} className={`flex gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${form[key] ? 'border-amber-400/50 bg-amber-400/5' : 'border-slate-700'}`}>
                  <input type="checkbox" checked={form[key]} onChange={e => update(key, e.target.checked)} className="mt-1 flex-shrink-0 accent-amber-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{text}</p>
                  </div>
                </label>
              ))}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2.5 transition-colors">Back</button>
                <button onClick={handleSubmit} disabled={loading || !form.popia_consent || !form.nca_consent}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
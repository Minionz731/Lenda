import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PROVINCES = [
  'Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
  'Limpopo','Mpumalanga','North West','Free State','Northern Cape',
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'borrower',
    country: 'South Africa',
    province: '',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      // ─── FIX: build payload manually instead of destructuring
      //          so ESLint doesn't complain about "assigned but never used"
      const payload = {
        full_name: form.full_name,
        email:     form.email,
        phone:     form.phone,
        password:  form.password,
        role:      form.role,
        country:   form.country,
        province:  form.province,
      };

      const user = await register(payload);
      toast.success(`Welcome to Lenda, ${user.full_name.split(' ')[0]}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-400 rounded-sm rotate-45" />
            <span className="text-2xl font-bold text-white tracking-tight">Lenda</span>
          </div>
          <p className="text-slate-400 text-sm">South African P2P Lending</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-white mb-6">Create your account</h1>

          {/* Role Selector */}
          <div className="flex gap-3 mb-5">
            {['borrower', 'lender'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => update('role', r)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  form.role === r
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                I want to {r === 'borrower' ? 'borrow' : 'lend'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Thabo Nkosi"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="you@example.co.za"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="+27 82 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Province</label>
              <select
                value={form.province}
                onChange={e => update('province', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
              >
                <option value="">Select Province</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => update('password', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Min 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirm_password}
                onChange={e => update('confirm_password', e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors ${
                  form.confirm_password && form.password !== form.confirm_password
                    ? 'border-red-500'
                    : 'border-slate-700 focus:border-amber-400'
                }`}
                placeholder="Repeat password"
              />
              {form.confirm_password && form.password !== form.confirm_password && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (form.confirm_password && form.password !== form.confirm_password)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-lg py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
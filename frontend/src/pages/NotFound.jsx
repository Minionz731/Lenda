import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-amber-400 rounded-sm rotate-45" />
          <span className="text-xl font-bold text-white tracking-tight">Lenda</span>
        </div>
        <p className="text-7xl font-bold text-amber-400 mb-4">404</p>
        <p className="text-white text-xl font-semibold mb-2">Page not found</p>
        <p className="text-slate-400 text-sm mb-8">The page you're looking for doesn't exist.</p>
        <Link
          to={user ? `/${user.role}` : '/login'}
          className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
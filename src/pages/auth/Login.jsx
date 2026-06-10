import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { LogIn, Key, Mail, ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';

export const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all credentials fields.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const logged = await login(email, password);
      if (logged.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/shop');
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand-green-600 text-white flex items-center justify-center mx-auto shadow-md">
            <LogIn className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Wholesales Sign In</h3>
          <p className="text-xs text-slate-400">Access products, custom invoicing, and transfer receipts.</p>
        </div>

        {/* Errors */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Email address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="buyer@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="w-full py-3.5 rounded-xl mt-2"
          >
            Authenticate User
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-5 space-y-4.5">
          {/* Quick links */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">New wholesale outlet?</span>
            <Link to="/register" className="font-bold text-brand-green-700 hover:underline">
              Register Business
            </Link>
          </div>


        </div>

      </div>
    </div>
  );
};

export default Login;

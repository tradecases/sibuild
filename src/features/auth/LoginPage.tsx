import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-500 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent-500 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-elevated mb-4">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SI Building Solutions</h1>
          <p className="text-slate-400 mt-1 text-sm">Enterprise Resource Planning</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-modal p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@sibuildingsolutions.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-xs text-danger-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            Having trouble signing in? Contact your system administrator.
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          SI Building Solutions ERP &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Eye, EyeOff, Loader2, Lock, Mail, User, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

type Mode = 'login' | 'setup';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Setup fields
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [showSetupPwd, setShowSetupPwd] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    checkFirstRun();
  }, []);

  async function checkFirstRun() {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (count === 0) {
        setIsFirstRun(true);
        setMode('setup');
      }
    } catch {
      // ignore — just show login
    } finally {
      setCheckingSetup(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
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
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!setupName.trim()) return setError('Full name is required.');
    if (!setupEmail.trim()) return setError('Email is required.');
    if (setupPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (setupPassword !== setupConfirm) return setError('Passwords do not match.');

    setSetupLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: setupEmail,
        password: setupPassword,
        options: {
          data: { full_name: setupName, role: 'super_admin' },
        },
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!data.user) throw new Error('Account creation failed.');

      // Ensure profile has super_admin role (in case trigger ran with default)
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: setupEmail,
          full_name: setupName,
          role: 'super_admin',
          is_active: true,
        });

      setSetupDone(true);
      // Auto sign in
      setTimeout(async () => {
        const { error: loginErr } = await signIn(setupEmail, setupPassword);
        if (!loginErr) navigate('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -right-48 w-96 h-96 rounded-full bg-primary-600/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 rounded-full bg-accent-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-900/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-elevated mb-4 ring-4 ring-primary-500/20">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SI Building Solutions</h1>
          <p className="text-slate-400 mt-1 text-sm">Enterprise Resource Planning</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Mode tabs (only shown after first run is done) */}
          {!isFirstRun && (
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-primary-700 border-b-2 border-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
            </div>
          )}

          <div className="px-8 py-7">

            {/* ── FIRST RUN SETUP ─────────────────────────────── */}
            {mode === 'setup' && (
              <>
                {setupDone ? (
                  <div className="flex flex-col items-center py-6 gap-3 text-center">
                    <div className="w-14 h-14 bg-success-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={28} className="text-success-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">Admin account created!</h2>
                    <p className="text-sm text-slate-500">Signing you in automatically…</p>
                    <Loader2 size={18} className="animate-spin text-primary-500 mt-2" />
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        First-time Setup
                      </div>
                      <h2 className="text-xl font-semibold text-slate-900">Create your admin account</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        This account will have full Super Admin access.
                      </p>
                    </div>

                    <form onSubmit={handleSetup} className="space-y-4">
                      {/* Full name */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={setupName}
                            onChange={e => setSetupName(e.target.value)}
                            placeholder="Your full name"
                            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="email"
                            value={setupEmail}
                            onChange={e => setSetupEmail(e.target.value)}
                            placeholder="admin@sibuildingsolutions.com"
                            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type={showSetupPwd ? 'text' : 'password'}
                            value={setupPassword}
                            onChange={e => setSetupPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <button type="button" onClick={() => setShowSetupPwd(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showSetupPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="password"
                            value={setupConfirm}
                            onChange={e => setSetupConfirm(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                          <p className="text-xs text-danger-700">{error}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={setupLoading}
                        className="w-full h-10 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-2"
                      >
                        {setupLoading
                          ? <><Loader2 size={15} className="animate-spin" /> Creating account…</>
                          : <><span>Initialize System</span><ChevronRight size={15} /></>
                        }
                      </button>
                    </form>
                  </>
                )}
              </>
            )}

            {/* ── LOGIN ────────────────────────────────────────── */}
            {mode === 'login' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
                  <p className="text-sm text-slate-500 mt-1">Sign in to continue to your workspace</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@sibuildingsolutions.com"
                        autoFocus
                        autoComplete="email"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                      <p className="text-xs text-danger-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-2"
                  >
                    {isLoading
                      ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                      : 'Sign In'
                    }
                  </button>
                </form>

                <p className="text-xs text-center text-slate-400 mt-6">
                  Need access? Contact your system administrator.
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          SI Building Solutions ERP &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

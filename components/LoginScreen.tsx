
// components/LoginScreen.tsx
//
// Full-screen login screen matching the GreenChem dark UI aesthetic.
// Shows company logo, email/password fields, and branch assignment feedback.

import React, { useState, useCallback } from 'react';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { login } from '../services/authService';
import Logo from '../Logo';

interface LoginScreenProps {
  /** Optional error from AuthContext (e.g., "No profile found") */
  authError?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  const displayError = error || authError;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Ambient glow behind card */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-8">
            <Logo className="h-12 sm:h-16 w-auto mb-4" />
            <h1 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
              Stock Manager
            </h1>
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-300">{displayError}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bywood@greenchem.com"
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/60 text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/60 text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-60 disabled:pointer-events-none"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] font-bold text-slate-600 mt-6 tracking-wide">
          Contact your administrator if you need access.
        </p>
      </form>
    </div>
  );
};

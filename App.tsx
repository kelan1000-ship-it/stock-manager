
// App.tsx
//
// Updated root component with authentication gating.
// - Shows LoginScreen if not authenticated
// - Shows loading spinner while checking auth
// - Wraps the app in AuthProvider for global auth state
// - Shows error screen if user has no Firestore profile

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RetailStockManager from './components/RetailStockManager';
import { LoginScreen } from './components/LoginScreen';
import { Loader2 } from 'lucide-react';
import Logo from './Logo';
import { GlobalTooltip } from './components/GlobalTooltip';
import { subscribeToStockManagerConfig } from './services/firestoreService';

/**
 * Inner component that reads auth state from context.
 */
const AppContent: React.FC = () => {
  const { firebaseUser, appUser, loading, error, signOut } = useAuth();

  useEffect(() => {
    return subscribeToStockManagerConfig((config) => {
      const fontSize = config?.productTitleFontSize || 16;
      document.documentElement.style.setProperty('--product-title-size', `${fontSize}px`);
    });
  }, []);

  // ─── Loading state (checking auth on app launch) ──────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <Logo className="h-12 w-auto opacity-60" />
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
          Loading...
        </p>
      </div>
    );
  }

  // ─── Not logged in ────────────────────────────────────────────
  if (!firebaseUser) {
    return <LoginScreen />;
  }

  // ─── Logged in but no Firestore profile ───────────────────────
  // This happens if someone creates an Auth account but the admin
  // hasn't set up their Firestore profile yet.
  if (!appUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Logo className="h-12 w-auto mb-6 opacity-60" />
        <div className="max-w-sm p-8 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3">Account Not Configured</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {error || 'Your account exists but has not been set up by an administrator. Please ask the owner to assign your branch access.'}
          </p>
          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ─── Fully authenticated — show the app ───────────────────────
  return (
    <div className="min-h-screen">
      <GlobalTooltip />
      <RetailStockManager />
    </div>
  );
};

/**
 * Root App component — wraps everything in AuthProvider.
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;


// contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { AppUser, BranchId, BRANCH_DISPLAY_NAMES } from '../types/auth';
import { onAuthChange, getUserProfile, subscribeToUserProfile, logout } from '../services/authService';

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  currentBranch: BranchId;
  setCurrentBranch: (branch: BranchId) => void;
  allowedBranches: BranchId[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

function safeBranches(profile: AppUser | null): BranchId[] {
  if (!profile) return [];
  return Array.isArray(profile.assignedBranches) ? profile.assignedBranches : [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBranch, setCurrentBranchRaw] = useState<BranchId>('bywood');
  const [error, setError] = useState<string | null>(null);

  // ─── Listen to Firebase Auth state ──────────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);

        if (!profile) {
          setError('No user profile found. Ask an admin to set up your account.');
          setAppUser(null);
          setLoading(false);
          return;
        }

        const branches = Array.isArray(profile.assignedBranches) ? profile.assignedBranches : [];
        const safeProfile: AppUser = { ...profile, assignedBranches: branches };

        setAppUser(safeProfile);
        setError(null);

        // ALWAYS set branch from profile on login
        // Admin → default to first branch (bywood)
        // Branch user → set to their assigned branch
        if (branches.length > 0) {
          setCurrentBranchRaw(branches[0]);
        }
      } catch (e) {
        console.error('Failed to fetch user profile:', e);
        setError('Failed to load user profile.');
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  // ─── Real-time profile subscription ─────────────────────────────
  // Only starts AFTER initial load is complete, so it doesn't
  // interfere with the branch being set from the login flow.
  useEffect(() => {
    if (!firebaseUser || loading) return;

    const unsub = subscribeToUserProfile(firebaseUser.uid, (profile) => {
      if (!profile) return;

      const branches = Array.isArray(profile.assignedBranches) ? profile.assignedBranches : [];
      const safeProfile: AppUser = { ...profile, assignedBranches: branches };
      setAppUser(safeProfile);

      // Only override branch if current one was revoked by admin
      if (branches.length > 0 && !branches.includes(currentBranch)) {
        setCurrentBranchRaw(branches[0]);
      }
    });

    return unsub;
  }, [firebaseUser, loading, currentBranch]);

  // ─── Branch switching ───────────────────────────────────────────
  const setCurrentBranch = useCallback((branch: BranchId) => {
    if (!appUser) return;
    if (appUser.role === 'admin') {
      setCurrentBranchRaw(branch);
      return;
    }
    const branches = safeBranches(appUser);
    if (branches.includes(branch)) {
      setCurrentBranchRaw(branch);
    }
  }, [appUser]);

  const allowedBranches: BranchId[] = appUser
    ? appUser.role === 'admin'
      ? (['bywood', 'broom'] as BranchId[])
      : safeBranches(appUser)
    : [];

  const isAdmin = appUser?.role === 'admin';

  const handleSignOut = useCallback(async () => {
    await logout();
    setAppUser(null);
    setError(null);
  }, []);

  // ─── DON'T RENDER CHILDREN UNTIL LOADING IS DONE ───────────────
  // This is the key fix: by not rendering children while loading,
  // no component ever sees the default 'bywood' value. They only
  // render after currentBranch has been set from the profile.

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        currentBranch,
        setCurrentBranch,
        allowedBranches,
        isAdmin,
        signOut: handleSignOut,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

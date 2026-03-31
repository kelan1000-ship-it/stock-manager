
// components/AdminPanel.tsx
//
// Slide-over panel for admin user management.
// - View all users and their branch assignments
// - Create new branch users
// - Assign/revoke branches
// - Promote/demote roles

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, UserPlus, Shield, ShieldCheck, Store, Trash2,
  Loader2, Check, AlertCircle, ChevronDown, Users, Settings
} from 'lucide-react';
import { AppUser, BranchId, BRANCH_DISPLAY_NAMES, UserRole } from '../types/auth';
import { BranchKey, EposConfig } from '../types';
import {
  subscribeToAllUsers,
  createBranchUser,
  updateUserBranches,
  updateUserRole,
  removeUser,
} from '../services/authService';
import { subscribeToEposConfig, saveEposConfig } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { logPermissionChange } from '../services/auditService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_BRANCHES: BranchId[] = ['bywood', 'broom'];

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { appUser: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Section Toggles
  const [isEposSettingsOpen, setIsEposSettingsOpen] = useState(false);
  const [isAllUsersOpen, setIsAllUsersOpen] = useState(true);

  // EPOS Configs
  const [bywoodEposConfig, setBywoodEposConfig] = useState<EposConfig | null>(null);
  const [broomEposConfig, setBroomEposConfig] = useState<EposConfig | null>(null);

  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('branch');
  const [newBranches, setNewBranches] = useState<BranchId[]>([]);

  // Subscribe to all users
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAllUsers(setUsers);
    
    const unsubBywood = subscribeToEposConfig('bywood', setBywoodEposConfig);
    const unsubBroom = subscribeToEposConfig('broom', setBroomEposConfig);

    return () => {
      unsub();
      unsubBywood();
      unsubBroom();
    };
  }, [isOpen]);

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const resetForm = () => {
    setNewEmail('');
    setNewPassword('');
    setNewDisplayName('');
    setNewRole('viewer');
    setNewBranches([]);
    setIsCreating(false);
    setError(null);
  };

  const handleUpdateEposConfig = async (branch: BranchKey, percent: number) => {
    setActionLoading(`epos-${branch}`);
    try {
      await saveEposConfig(branch, {
        id: 'default',
        branch,
        staffDiscountPercent: percent
      });
      setSuccess(`Updated EPOS config for ${BRANCH_DISPLAY_NAMES[branch]}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = useCallback(async () => {
    if (!newEmail || !newPassword || !newDisplayName) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newRole !== 'admin' && newBranches.length === 0) {
      setError('Branch users must be assigned at least one branch.');
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      // We need the admin's credentials to re-authenticate after creation.
      // In a production app you'd use Firebase Admin SDK via a Cloud Function.
      // For this internal app, we prompt for the admin password.
      const adminPassword = prompt('Enter your admin password to confirm user creation:');
      if (!adminPassword || !currentAdmin?.email) {
        setActionLoading(null);
        return;
      }

      const branches = newRole === 'admin' ? ALL_BRANCHES : newBranches;

      await createBranchUser(
        newEmail,
        newPassword,
        newDisplayName,
        newRole,
        branches,
        currentAdmin.email,
        adminPassword
      );

      setSuccess(`Created user: ${newDisplayName}`);
      resetForm();
    } catch (err: any) {
      console.error('Create user failed:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setError('That email address is already in use.');
      } else {
        setError(err?.message || 'Failed to create user.');
      }
    } finally {
      setActionLoading(null);
    }
  }, [newEmail, newPassword, newDisplayName, newRole, newBranches, currentAdmin]);

  const toggleBranch = (uid: string, branch: BranchId, currentBranches: BranchId[]) => {
    const updated = currentBranches.includes(branch)
      ? currentBranches.filter(b => b !== branch)
      : [...currentBranches, branch];
    
    setActionLoading(`branch-${uid}`);
    updateUserBranches(uid, updated)
      .then(() => setSuccess(`Updated branches for user.`))
      .catch((e) => setError(e.message))
      .finally(() => setActionLoading(null));
  };

  const toggleNewBranch = (branch: BranchId) => {
    setNewBranches(prev =>
      prev.includes(branch)
        ? prev.filter(b => b !== branch)
        : [...prev, branch]
    );
  };

  const handleChangeRole = async (uid: string, currentRole: UserRole, newRoleVal: UserRole, userEmail: string) => {
    if (currentRole === newRoleVal) return;
    
    if (!confirm(`Change role from ${currentRole} to ${newRoleVal}?`)) return;

    setActionLoading(`role-${uid}`);
    
    try {
        await updateUserRole(uid, newRoleVal);
        
        // If promoting to admin, give them all branches
        if (newRoleVal === 'admin') {
           await updateUserBranches(uid, ALL_BRANCHES);
        }

        if (currentAdmin?.email) {
            await logPermissionChange(currentAdmin.email, userEmail, currentRole, newRoleVal);
        }

        setSuccess(`Role updated to ${newRoleVal}.`);
    } catch (e: any) {
        setError(e.message);
    } finally {
        setActionLoading(null);
    }
  };

  const handleRemoveUser = (uid: string, name: string) => {
    if (uid === currentAdmin?.uid) {
      setError("You can't remove your own account.");
      return;
    }
    if (!confirm(`Remove ${name}? They will lose access to the app.`)) return;

    setActionLoading(`remove-${uid}`);
    removeUser(uid)
      .then(() => setSuccess(`Removed ${name}.`))
      .catch((e) => setError(e.message))
      .finally(() => setActionLoading(null));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Users size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">User Management</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Messages */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300"><X size={12} /></button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Check size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-300">{success}</p>
            </div>
          )}

          {/* ─── Create New User ──────────────────────────────── */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <UserPlus size={16} />
              Add New User
            </button>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">New User</h3>
                <button onClick={resetForm} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
              </div>

              <input
                type="text"
                placeholder="Display Name (e.g. Bywood Staff)"
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700/60 text-white text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                type="email"
                placeholder="Email address"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700/60 text-white text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700/60 text-white text-xs font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />

              {/* Role Select */}
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['viewer', 'editor', 'manager', 'admin'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        newRole === role
                          ? role === 'admin'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-700/40 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {role === 'admin' ? <ShieldCheck size={12} /> : <Store size={12} />}
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Branch Assignment (only for branch role) */}
              {newRole !== 'admin' && (
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Assign Branches</label>
                  <div className="flex gap-2">
                    {ALL_BRANCHES.map(branch => (
                      <button
                        key={branch}
                        onClick={() => toggleNewBranch(branch)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          newBranches.includes(branch)
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 border-slate-700/40 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {BRANCH_DISPLAY_NAMES[branch]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {newRole === 'admin' && (
                <p className="text-[9px] font-semibold text-amber-400/70 px-1">
                  Admins automatically have access to all branches.
                </p>
              )}

              <button
                onClick={handleCreateUser}
                disabled={actionLoading === 'create'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {actionLoading === 'create' ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Create User
              </button>
            </div>
          )}

          {/* ─── EPOS Settings ────────────────────────────────── */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden transition-all duration-300">
            <button
              onClick={() => setIsEposSettingsOpen(!isEposSettingsOpen)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Settings size={14} className="text-blue-400" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">EPOS Settings</h3>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isEposSettingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isEposSettingsOpen && (
              <div className="px-5 pb-5 pt-0 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {(['bywood', 'broom'] as BranchKey[]).map(branch => {
                  const config = branch === 'bywood' ? bywoodEposConfig : broomEposConfig;
                  return (
                    <div key={branch} className="space-y-2">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500">
                        {BRANCH_DISPLAY_NAMES[branch]} Staff Discount (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={config?.staffDiscountPercent || 0}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val !== (config?.staffDiscountPercent || 0)) {
                              handleUpdateEposConfig(branch, val);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/60 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        {actionLoading === `epos-${branch}` && (
                          <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Existing Users ───────────────────────────────── */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden transition-all duration-300">
            <button
              onClick={() => setIsAllUsersOpen(!isAllUsersOpen)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Users size={14} className="text-emerald-400" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  All Users ({users.length})
                </h3>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isAllUsersOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAllUsersOpen && (
              <div className="px-5 pb-5 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {users.map(user => (
                  <div
                    key={user.uid}
                    className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3"
                  >
                    {/* User header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${
                          user.role === 'admin'
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-slate-800 border border-slate-700'
                        }`}>
                          {user.role === 'admin'
                            ? <ShieldCheck size={14} className="text-amber-400" />
                            : <Store size={14} className="text-slate-400" />
                          }
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{user.displayName}</p>
                          <p className="text-[9px] font-medium text-slate-500">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Role Selector */}
                        {user.uid !== currentAdmin?.uid && (
                          <div className="relative">
                              {actionLoading === `role-${user.uid}` ? (
                                  <div className="p-1.5"><Loader2 size={12} className="animate-spin text-emerald-500" /></div>
                              ) : (
                                  <select
                                      value={user.role}
                                      onChange={(e) => handleChangeRole(user.uid, user.role, e.target.value as UserRole, user.email)}
                                      className="appearance-none bg-slate-900 border border-slate-700 text-[9px] font-bold uppercase tracking-wider text-slate-400 rounded-lg py-1 px-2 pr-6 hover:border-slate-600 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                  >
                                      <option value="viewer">Viewer</option>
                                      <option value="editor">Editor</option>
                                      <option value="manager">Manager</option>
                                      <option value="admin">Admin</option>
                                      {user.role === 'branch' && <option value="branch">Branch (Legacy)</option>}
                                  </select>
                              )}
                              {!actionLoading && <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
                          </div>
                        )}
                        {/* Remove */}
                        {user.uid !== currentAdmin?.uid && (
                          <button
                            onClick={() => handleRemoveUser(user.uid, user.displayName)}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
                          >
                            {actionLoading === `remove-${user.uid}`
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Trash2 size={12} />
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branch pills */}
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Branches</p>
                      <div className="flex gap-2">
                        {ALL_BRANCHES.map(branch => {
                          const isAssigned = user.assignedBranches.includes(branch);
                          const isAdminUser = user.role === 'admin';
                          return (
                            <button
                              key={branch}
                              onClick={() => {
                                if (isAdminUser) return; // Admins always have all branches
                                toggleBranch(user.uid, branch, user.assignedBranches);
                              }}
                              disabled={isAdminUser || !!actionLoading}
                              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                                isAssigned
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-900/50 border-slate-700/30 text-slate-600 hover:border-slate-600'
                              } ${isAdminUser ? 'cursor-default opacity-60' : ''}`}
                            >
                              {BRANCH_DISPLAY_NAMES[branch]}
                              {isAssigned && <Check size={10} className="inline ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                      {user.role === 'admin' && (
                        <p className="text-[8px] text-amber-400/50 font-medium mt-1">Admins have access to all branches</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex gap-4 text-[8px] font-medium text-slate-600">
                      <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                      <span>Last login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

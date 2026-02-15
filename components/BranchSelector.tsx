
// components/BranchSelector.tsx
//
// Replaces the current Bywood/Broom toggle in RetailStockManager.
// - Admin users: see a dropdown that can switch between all branches
// - Branch users: see their assigned branch name (locked, no toggle)
// - Shows role badge (Admin / Branch)

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ShieldCheck, Store, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BRANCH_DISPLAY_NAMES, BranchId } from '../types/auth';

export const BranchSelector: React.FC = () => {
  const { currentBranch, setCurrentBranch, allowedBranches, isAdmin, appUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const canSwitch = allowedBranches.length > 1;

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      {/* Role Badge */}
      <div
        className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
          isAdmin
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            : 'bg-slate-800 border border-slate-700 text-slate-500'
        }`}
        title={isAdmin ? 'Admin — access to all branches' : `Branch user: ${appUser?.displayName}`}
      >
        {isAdmin ? <ShieldCheck size={10} /> : <Store size={10} />}
        {isAdmin ? 'Admin' : 'Staff'}
      </div>

      {/* Branch Selector */}
      <div className="relative">
        <button
          onClick={() => canSwitch && setIsOpen(!isOpen)}
          className={`flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-xl border transition-all ${
            canSwitch
              ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/30 cursor-pointer'
              : 'bg-slate-950 border-slate-800/60 cursor-default'
          }`}
        >
          {/* Active branch indicator dot */}
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />

          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white">
            <span className="hidden sm:inline">{BRANCH_DISPLAY_NAMES[currentBranch]}</span>
            <span className="sm:hidden">{currentBranch === 'bywood' ? 'Bywood' : 'Broom'}</span>
          </span>

          {canSwitch ? (
            <ChevronDown
              size={12}
              className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          ) : (
            <Lock size={10} className="text-slate-600" />
          )}
        </button>

        {/* Dropdown (admin or multi-branch users only) */}
        {isOpen && canSwitch && (
          <div className="absolute top-full left-0 mt-1.5 w-full min-w-[160px] py-1 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/40 z-50 overflow-hidden">
            {allowedBranches.map(branch => {
              const isActive = branch === currentBranch;
              return (
                <button
                  key={branch}
                  onClick={() => {
                    setCurrentBranch(branch);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-600'
                  }`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {BRANCH_DISPLAY_NAMES[branch]}
                  </span>
                  {isActive && <Check size={12} className="ml-auto text-emerald-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Tiny Check icon inline (to avoid an extra import just for the dropdown)
const Check: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

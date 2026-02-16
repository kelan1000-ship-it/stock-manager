import React, { useMemo } from 'react';
import { MessageSquare, ArrowRightLeft, Sparkles } from 'lucide-react';
import { BranchData, BranchKey } from '../types';

interface HeaderNotificationBarProps {
  branchData: BranchData;
  currentBranch: BranchKey;
}

export const HeaderNotificationBar: React.FC<HeaderNotificationBarProps> = ({
  branchData,
  currentBranch
}) => {
  const unreadMessages = useMemo(() => 
    branchData.messages.filter(m => m.sender !== currentBranch && !m.isRead).length
  , [branchData.messages, currentBranch]);

  const pendingTransfers = useMemo(() =>
    branchData.transfers.filter(t =>
      !t.resolvedAt &&
      ((t.targetBranch === currentBranch && t.status === 'pending') ||
      (t.sourceBranch === currentBranch && t.status === 'confirmed' && t.type === 'request'))
    ).length
  , [branchData.transfers, currentBranch]);

  if (unreadMessages === 0 && pendingTransfers === 0) {
    return (
      <div className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/40 border border-slate-800/50 opacity-60">
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">No Notifications</span>
      </div>
    );
  }

  return (
    <div className="hidden xl:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
      {unreadMessages > 0 && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
          <MessageSquare size={12} className="text-indigo-400" />
          <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest whitespace-nowrap">
            {unreadMessages} New Message{unreadMessages !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      {unreadMessages > 0 && pendingTransfers > 0 && (
        <div className="w-1 h-1 rounded-full bg-slate-700" />
      )}

      {pendingTransfers > 0 && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
          <ArrowRightLeft size={12} className="text-amber-500" />
          <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest whitespace-nowrap">
            {pendingTransfers} Pending Transfer{pendingTransfers !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};
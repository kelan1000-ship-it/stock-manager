
import React, { useState } from 'react';
import { 
  X, ArrowRightLeft, RefreshCw, History as HistoryIcon, Inbox, CheckCircle2, PackageCheck, Send
} from 'lucide-react';
import { Transfer, BranchKey } from '../types';

// Transfer Inbox (Stock Transfers)
export const TransferInbox = ({ isOpen, onClose, transfers, onProcess, currentBranch, theme }: { isOpen: boolean; onClose: () => void; transfers: Transfer[]; onProcess: (id: string, action: string) => void; currentBranch: BranchKey; theme: 'dark' }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  if (!isOpen) return null;

  const incomingPending = transfers.filter((t: Transfer) => t.targetBranch === currentBranch && t.status === 'pending');
  const outgoingConfirmed = transfers.filter((t: Transfer) => t.sourceBranch === currentBranch && t.status === 'confirmed');
  
  const activeList = [...incomingPending, ...outgoingConfirmed];

  const history = transfers.filter((t: Transfer) => 
    (t.targetBranch === currentBranch || t.sourceBranch === currentBranch) && 
    (t.status === 'completed' || t.status === 'cancelled')
  );

  const displayList = activeTab === 'active' ? activeList : history;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Transfer Logistics</h2>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Internal Site Movement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <div className="px-8 pt-4 pb-2">
           <div className="flex p-1 rounded-2xl bg-slate-800/50 border border-slate-800">
              <button 
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'active' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <RefreshCw size={14} /> Active Logistics ({activeList.length})
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'history' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <HistoryIcon size={14} /> Audit History
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/20 scrollbar-hide">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
              {activeTab === 'active' ? <Inbox size={64} className="mb-4 text-slate-500" /> : <HistoryIcon size={64} className="mb-4 text-slate-500" />}
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                {activeTab === 'active' ? 'No pending logistics' : 'No historical logs found'}
              </p>
            </div>
          ) : displayList.map((t: Transfer) => {
            const isOutgoing = t.sourceBranch === currentBranch;
            const isCompleted = t.status === 'completed';
            const isCancelled = t.status === 'cancelled';
            const isConfirmed = t.status === 'confirmed';

            const showConfirmButton = t.status === 'pending' && t.targetBranch === currentBranch && t.type === 'request';
            const showReceiveButton = (t.status === 'pending' && t.targetBranch === currentBranch && t.type === 'send') || 
                                      (t.status === 'confirmed' && t.sourceBranch === currentBranch && t.type === 'request');

            return (
              <div key={t.id} className={`p-6 rounded-3xl border flex flex-col gap-4 relative overflow-hidden group transition-all ${
                isCancelled ? 'bg-rose-500/[0.03] border-rose-500/10' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[10px] ${
                      activeTab === 'history' 
                        ? (isOutgoing ? 'bg-indigo-600' : 'bg-emerald-600')
                        : (t.status === 'confirmed' ? 'bg-amber-600' : (t.type === 'send' ? 'bg-emerald-500' : 'bg-indigo-500'))
                    }`}>
                      {activeTab === 'history' ? (isOutgoing ? 'OUT' : 'IN') : (isConfirmed ? 'DISP' : (t.type === 'send' ? 'IN' : 'REQ'))}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white capitalize">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.packSize} • {t.barcode}</p>
                        {activeTab === 'history' && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            isCompleted ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {t.status}
                          </span>
                        )}
                        {activeTab === 'active' && isConfirmed && (
                           <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">DISPATCHED</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">
                      {isOutgoing ? `To: ${t.targetBranch}` : `From: ${t.sourceBranch}`}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Quantity</span>
                      <span className="text-xl font-black text-white">{t.quantity} <span className="text-xs font-bold text-slate-600">packs</span></span>
                   </div>
                   {t.partQuantity && t.partQuantity > 0 && (
                     <div className="h-8 w-px bg-slate-800 mx-4" />
                   )}
                   {t.partQuantity && t.partQuantity > 0 ? (
                     <div className="flex flex-col text-right">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Loose</span>
                        <span className="text-xl font-black text-violet-400">{t.partQuantity} <span className="text-xs font-bold text-slate-600">units</span></span>
                     </div>
                   ) : null}
                </div>

                {t.note && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold italic">
                    "{t.note}"
                  </div>
                )}

                {activeTab === 'active' && (
                  <div className="flex gap-3 pt-2">
                    {!isConfirmed && (
                       <button onClick={() => onProcess(t.id, 'cancelled')} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 border border-transparent transition-all">Decline</button>
                    )}
                    
                    {showConfirmButton && (
                      <button onClick={() => onProcess(t.id, 'confirmed')} className="flex-[2] py-3 rounded-xl bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2">
                        <Send size={14} /> Confirm Dispatch
                      </button>
                    )}

                    {showReceiveButton && (
                      <button onClick={() => onProcess(t.id, 'completed')} className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2">
                        <PackageCheck size={14} /> Receive Units
                      </button>
                    )}

                    {isConfirmed && isOutgoing && (
                       <div className="flex-1 py-3 px-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest">Waiting for Receipt</p>
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

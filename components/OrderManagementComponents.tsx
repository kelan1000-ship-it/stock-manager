
import React, { useState } from 'react';
import { 
  X, ArrowRightLeft, RefreshCw, History as HistoryIcon, Inbox, CheckCircle2, PackageCheck, Send
} from 'lucide-react';
import { Transfer, BranchKey } from '../types';
import { TooltipWrapper } from './SharedUI';

interface TransferCardProps {
    transfer: Transfer;
    currentBranch: BranchKey;
    activeTab: 'active' | 'history';
    onProcess: (id: string, action: 'confirmed' | 'completed' | 'cancelled', newQuantity?: number, newPartQuantity?: number, replyNote?: string) => void;
}

const TransferCard: React.FC<TransferCardProps> = ({ transfer: t, currentBranch, activeTab, onProcess }) => {
    const [fulfillQty, setFulfillQty] = useState(t.quantity.toString());
    const [fulfillPartQty, setFulfillPartQty] = useState((t.partQuantity || 0).toString());
    const [fulfillReply, setFulfillReply] = useState(t.replyNote || '');

    const isOutgoing = t.sourceBranch === currentBranch;
    const isCompleted = t.status === 'completed';
    const isCancelled = t.status === 'cancelled';
    const isConfirmed = t.status === 'confirmed';

    const showConfirmButton = t.status === 'pending' && t.targetBranch === currentBranch && t.type === 'request';
    const showReceiveButton = (t.status === 'pending' && t.targetBranch === currentBranch && t.type === 'send') || 
                              (t.status === 'confirmed' && t.sourceBranch === currentBranch && t.type === 'request');

    return (
        <div className={`p-6 rounded-[2rem] border flex flex-col gap-4 relative overflow-hidden group transition-all ${
            isCancelled ? 'bg-rose-500/[0.03] border-rose-500/10 opacity-50 grayscale-[0.3] hover:opacity-100 hover:grayscale-0 hover:bg-rose-500/10' : 
            isCompleted ? 'bg-emerald-500/[0.01] border-emerald-500/10 opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:bg-emerald-500/10' :
            'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 shadow-xl'
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
                        <p className={`text-sm font-black capitalize break-words whitespace-pre-wrap transition-all ${isCompleted || isCancelled ? 'text-slate-400 line-through group-hover:text-white group-hover:no-underline' : 'text-white'}`}>{t.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] italic text-slate-500 uppercase tracking-widest transition-all group-hover:text-slate-300">{t.packSize} • {t.barcode}</p>
                        {activeTab === 'history' && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                            isCompleted ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white'
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
                <div className="text-right flex flex-col gap-1 items-end min-w-[110px]">
                    {t.type === 'send' ? (
                        <div className="text-[9px] font-bold text-slate-500 leading-tight text-right">
                            <span className="uppercase text-[8px] tracking-widest opacity-70 block mb-0.5">Dispatched</span>
                            <span className="text-amber-500/80 font-black">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    ) : (
                        <>
                            <div className="text-[9px] font-bold text-slate-500 leading-tight text-right">
                                <span className="uppercase text-[8px] tracking-widest opacity-70 block mb-0.5">Requested</span>
                                <span className="text-slate-400 font-black">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            {t.confirmedAt && (
                                <div className="text-[9px] font-bold text-slate-500 leading-tight text-right mt-1">
                                    <span className="uppercase text-[8px] tracking-widest opacity-70 block mb-0.5">Dispatched</span>
                                    <span className="text-amber-500/80 font-black">{new Date(t.confirmedAt).toLocaleDateString()} {new Date(t.confirmedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            )}
                        </>
                    )}
                    {t.resolvedAt && (
                        <div className="text-[9px] font-bold text-slate-500 leading-tight text-right mt-1">
                            <span className="uppercase text-[8px] tracking-widest opacity-70 block mb-0.5">{t.status === 'cancelled' ? 'Cancelled' : 'Received'}</span>
                            <span className={t.status === 'cancelled' ? "text-rose-500/80 font-black" : "text-emerald-500/80 font-black"}>{new Date(t.resolvedAt).toLocaleDateString()} {new Date(t.resolvedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    )}
                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 pt-1 border-t border-slate-800 w-full text-right">
                        {isOutgoing ? `To: ${t.targetBranch}` : `From: ${t.sourceBranch}`}
                    </p>
                </div>
            </div>

            <div className={`rounded-2xl transition-all ${
                showConfirmButton 
                ? 'p-1 bg-slate-950/40 ring-4 ring-indigo-500/10' 
                : 'p-4 bg-slate-900/50 border border-slate-800'
            }`}>
                <div className={`flex items-center justify-between ${showConfirmButton ? 'bg-slate-900 rounded-[1.25rem] p-4' : ''}`}>
                    <div className="flex-1 min-w-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${showConfirmButton ? 'text-slate-500' : 'text-slate-500'}`}>QUANTITY</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-xl font-black transition-all ${isCompleted || isCancelled ? 'text-slate-500 line-through group-hover:text-white group-hover:no-underline' : 'text-white'}`}>{t.quantity} <span className="text-xs font-bold text-slate-600">packs</span></span>
                            
                            {showConfirmButton && (
                                <div className="ml-auto animate-in slide-in-from-right-2">
                                    <input 
                                        type="number"
                                        value={fulfillQty}
                                        onChange={(e) => setFulfillQty(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-20 h-14 rounded-xl bg-slate-800 border-2 border-indigo-500 text-center text-2xl font-black text-white outline-none focus:ring-4 ring-indigo-500/30 transition-all shadow-inner"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {showConfirmButton && (
                        <div className="ml-6 pl-6 border-l border-slate-800 text-right animate-in slide-in-from-right-2">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">LOOSE ({t.partQuantity || 0})</span>
                            <input 
                                type="number"
                                value={fulfillPartQty}
                                onChange={(e) => setFulfillPartQty(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-16 h-14 rounded-xl bg-slate-800 border-2 border-indigo-500 text-center text-xl font-black text-violet-400 outline-none focus:ring-4 ring-indigo-500/30 transition-all shadow-inner"
                                placeholder="0"
                            />
                        </div>
                    )}

                    {!showConfirmButton && t.partQuantity !== undefined && t.partQuantity > 0 && (
                        <>
                            <div className="h-8 w-px bg-slate-800 mx-4" />
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Loose</span>
                                <span className={`text-xl font-black transition-all ${isCompleted || isCancelled ? 'text-slate-500 line-through group-hover:text-violet-400 group-hover:no-underline' : 'text-violet-400'}`}>{t.partQuantity} <span className="text-xs font-bold text-slate-600">units</span></span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {t.note && (
                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[11px] font-bold italic shadow-inner">
                    "{t.note}"
                </div>
            )}

            {showConfirmButton && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest px-1">REPLY TO REQUESTER</span>
                    <textarea 
                        value={fulfillReply}
                        onChange={(e) => setFulfillReply(e.target.value)}
                        placeholder="Add a reply message..."
                        className="w-full p-4 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 text-yellow-500 text-[11px] font-bold italic outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner h-20"
                    />
                </div>
            )}

            {t.replyNote && !showConfirmButton && (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[11px] font-bold italic shadow-inner">
                    <span className="text-[8px] font-black uppercase tracking-tighter mr-2 opacity-50">REPLY:</span>
                    "{t.replyNote}"
                </div>
            )}

            {activeTab === 'active' && (
                <div className="flex gap-3 pt-2">
                    {showConfirmButton && (
                        <button 
                            onClick={() => onProcess(t.id, 'confirmed', parseInt(fulfillQty), parseInt(fulfillPartQty), fulfillReply)} 
                            className="flex-[2.5] py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-[11px] uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-orange-900/40 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            <Send size={16} /> Confirm Dispatch
                        </button>
                    )}

                    {showReceiveButton && (
                        <button 
                            onClick={() => onProcess(t.id, 'completed')} 
                            className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <PackageCheck size={16} /> Receive Units
                        </button>
                    )}

                    {isConfirmed && isOutgoing && (
                        <div className="flex-[2] py-4 px-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-center flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest">Waiting for Receipt</p>
                        </div>
                    )}

                    {(t.status === 'pending' || t.status === 'confirmed') && (
                        <button 
                            onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this transfer?')) {
                                    onProcess(t.id, 'cancelled');
                                }
                            }} 
                            className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 border border-transparent transition-all"
                        >
                            {isConfirmed ? 'Cancel' : 'Decline'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Transfer Inbox (Stock Transfers)
export const TransferInbox = ({ isOpen, onClose, transfers, onProcess, onClearHistory, currentBranch, theme }: { isOpen: boolean; onClose: () => void; transfers: Transfer[]; onProcess: (id: string, action: 'confirmed' | 'completed' | 'cancelled', nQ?: number, nPQ?: number, replyNote?: string) => void; onClearHistory?: () => void; currentBranch: BranchKey; theme: 'dark' }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  if (!isOpen) return null;

  const incomingPending = transfers.filter((t: Transfer) => !t.resolvedAt && t.targetBranch === currentBranch && t.status === 'pending');
  const outgoingConfirmed = transfers.filter((t: Transfer) => !t.resolvedAt && t.sourceBranch === currentBranch && t.status === 'confirmed');
  
  const activeList = [...incomingPending, ...outgoingConfirmed];

  const history = transfers.filter((t: Transfer) => 
    (t.targetBranch === currentBranch || t.sourceBranch === currentBranch) && 
    (t.status === 'completed' || t.status === 'cancelled' || !!t.resolvedAt) &&
    !t.clearedBy?.includes(currentBranch)
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const displayList = activeTab === 'active' ? activeList : history;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <TooltipWrapper tooltip="Transfer Logistics">
                <h2 className="text-xl font-black text-white">Transfer Logistics</h2>
              </TooltipWrapper>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Internal Site Movement</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'history' && history.length > 0 && onClearHistory && (
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all historic transfers from your view?')) {
                    onClearHistory();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 border border-transparent hover:border-rose-500/30 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                Clear History
              </button>
            )}
            <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
          </div>
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20 scrollbar-hide">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
              {activeTab === 'active' ? <Inbox size={64} className="mb-4 text-slate-500" /> : <HistoryIcon size={64} className="mb-4 text-slate-500" />}
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                {activeTab === 'active' ? 'No pending logistics' : 'No historical logs found'}
              </p>
            </div>
          ) : displayList.map((t: Transfer) => (
            <TransferCard 
                key={t.id} 
                transfer={t} 
                currentBranch={currentBranch} 
                activeTab={activeTab} 
                onProcess={onProcess} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

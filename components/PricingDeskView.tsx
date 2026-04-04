
import React, { useState, useEffect } from 'react';
import { 
  PoundSterling, AlertTriangle, RefreshCw, CheckCircle2, 
  ArrowRightLeft, Tag, Clock, Ban, LayoutGrid, List,
  TrendingUp, Activity, Check, Trash2, Printer, MapPin, Search, Link2, Link2Off,
  CheckCircle, ShieldCheck, Box, MoveRight, MinusCircle, XCircle, Info, Landmark
} from 'lucide-react';
import { usePricingDesk } from '../hooks/usePricingDesk';
import { BranchData, BranchKey, Product, InventorySubFilter } from '../types';

interface PricingDeskViewProps {
  branchData: BranchData;
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>;
  theme: 'dark';
  currentBranch: BranchKey;
  subFilter: InventorySubFilter;
  onTabChange: (tab: InventorySubFilter) => void;
}

export const PricingDeskView: React.FC<PricingDeskViewProps> = ({ branchData, setBranchData, currentBranch, subFilter, onTabChange }) => {
  const { 
    alerts, labelQueue, isLoading, 
    handleMatch, handleIgnore, markLabelPrinted
  } = usePricingDesk(branchData, setBranchData, currentBranch);

  const localSiteName = currentBranch === 'bywood' ? 'Bywood' : 'Broom Road';

  const getPriceComparisonData = (local: number, ref: number, refSite: string) => {
    const siteName = refSite.toUpperCase();
    if (ref > local) {
      return {
        text: `Price is higher at ${siteName}`,
        color: 'text-blue-400',
        bg: 'bg-blue-400/5',
        border: 'border-blue-400/20'
      };
    }
    if (ref < local) {
      return {
        text: `Price is lower at ${siteName}`,
        color: 'text-rose-500',
        bg: 'bg-rose-500/5',
        border: 'border-rose-500/20'
      };
    }
    return {
      text: `Price is synchronized with ${siteName}`,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20'
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <PoundSterling size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">Pricing Desk: {localSiteName}</h2>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Local Price Parity & Label Check.</p>
          </div>
        </div>

        <div className="flex p-1.5 rounded-2xl border transition-colors bg-slate-950 border-slate-800">
          <button 
            onClick={() => onTabChange('alerts')}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              subFilter === 'alerts' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <AlertTriangle size={16} /> PRICE ALERTS ({alerts.length})
          </button>
          <button 
            onClick={() => onTabChange('labels')}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              subFilter === 'labels' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Printer size={16} /> LABEL QUEUE ({labelQueue.length})
          </button>
        </div>
      </div>

      {subFilter === 'alerts' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {isLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                <RefreshCw size={40} className="animate-spin text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processing Price Variations...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 opacity-30">
                <CheckCircle2 size={60} className="text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pricing is synced with reference site</p>
              </div>
            ) : alerts.map(alert => {
              const comp = getPriceComparisonData(alert.localPrice, alert.referencePrice, alert.referenceSiteName);
              return (
                <div key={alert.id} className="p-1 rounded-[2.5rem] bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-sm z-10">
                    <div className="w-5 h-5 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                      <Landmark size={12} />
                    </div>
                    <span className="text-[8px] font-black uppercase text-indigo-300 tracking-widest">
                      Origin: {alert.changeOriginBranch}
                    </span>
                  </div>

                  <div className="p-8 space-y-6">
                    <div>
                      <div className="w-fit px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border mb-4 flex items-center gap-2 bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                        <ShieldCheck size={10} />
                        ACTION REQUIRED: PENDING UPDATE
                      </div>
                      <h3 className="text-xl font-black text-white capitalize tracking-tight mb-1">{alert.name}</h3>
                      <p className="text-xs font-mono font-bold text-slate-600 tracking-wider">{alert.barcode}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-slate-950/40 border border-slate-800/50 flex flex-col items-center justify-center min-h-[110px] shadow-inner text-center">
                        <p className="text-[8px] font-black uppercase text-slate-500 mb-2 tracking-[0.2em]">SHELF PRICE</p>
                        <p className="text-2xl font-black text-white">£{alert.localPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-950/40 border border-slate-800/50 flex flex-col items-center justify-center min-h-[110px] shadow-inner text-center">
                        <p className="text-[8px] font-black uppercase text-slate-500 mb-2 tracking-[0.2em] text-center">{alert.referenceSiteName.toUpperCase()} RRP</p>
                        <p className={`text-2xl font-black ${comp.color}`}>
                          £{alert.referencePrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border ${comp.bg} ${comp.border} ${comp.color} transition-colors`}>
                         <Info size={14} />
                         <span className="text-[10px] font-black uppercase tracking-[0.15em]">{comp.text}</span>
                      </div>

                      <div className="space-y-3">
                        {alert.isPriceSynced ? (
                          <button 
                            onClick={() => handleMatch(alert.barcode)}
                            className="w-full p-6 rounded-[2rem] bg-indigo-600/10 border-2 border-indigo-500/30 hover:bg-indigo-600/20 transition-all flex flex-col items-center justify-center gap-2 group animate-pulse-slow shadow-xl"
                          >
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">CONFIRM PRICE CHANGE</span>
                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest text-center opacity-80 group-hover:opacity-100 px-4 leading-relaxed">
                              This price can not be changed here unless price sync has been turned off
                            </span>
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleMatch(alert.barcode)}
                              className="w-full py-4 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 text-blue-400 font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/20 hover:text-blue-300 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
                            >
                              <Check size={16} strokeWidth={4} /> MATCH RRP
                            </button>
                            
                            <button 
                              onClick={() => handleIgnore(alert.barcode)}
                              className="w-full py-4 rounded-2xl bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-500/60 font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500/20 hover:text-yellow-400 transition-all flex items-center justify-center gap-2.5 group active:scale-[0.98]"
                            >
                              <XCircle size={16} className="opacity-40 group-hover:opacity-100" />
                              <span className="text-[10px] font-black uppercase tracking-0.15em]">IGNORE PRICE DIFFERENCE</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-[2.5rem] border shadow-2xl overflow-hidden bg-slate-950 border-slate-800">
          <div className="p-8 border-b flex items-center justify-between border-slate-800/50 bg-slate-950">
            <h3 className="text-xl font-black text-white">Label Printing Queue ({currentBranch.toUpperCase()})</h3>
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl text-xs font-bold transition-colors bg-slate-950 border border-slate-800 text-slate-400 shadow-inner">
              <Printer size={16} className="text-emerald-500" /> {labelQueue.length} Items pending
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="p-8 text-[11px] font-black uppercase text-slate-500 tracking-widest">Product Identity</th>
                  <th className="p-8 text-[11px] font-black uppercase text-slate-500 tracking-widest text-center">Current Stock</th>
                  <th className="p-8 text-[11px] font-black uppercase text-slate-500 tracking-widest text-center">Price Transition (Confirm)</th>
                  <th className="p-8 text-right">
                    <span className="font-black text-[11px] uppercase text-slate-500 tracking-widest">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {labelQueue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-24 text-center text-slate-600 font-black uppercase text-sm tracking-[0.3em] opacity-40">
                      Queue is clear for this site
                    </td>
                  </tr>
                ) : labelQueue.map(item => {
                  const hasTarget = item.targetPrice !== undefined;
                  const newPrice = hasTarget ? item.targetPrice : item.price;
                  let oldPrice = item.price;

                  // Check if this is a synced update where price is ALREADY updated to target
                  const isSyncedUpdate = hasTarget && Math.abs(item.price - (item.targetPrice || 0)) < 0.001;

                  if (!hasTarget || isSyncedUpdate) {
                    // It's a direct update OR a synced update where the price is already current.
                    // We need to find the previous price from history.
                    if (item.priceHistory && item.priceHistory.length > 0) {
                      const lastHistory = item.priceHistory[item.priceHistory.length - 1];
                      const lastHistoryPrice = lastHistory.rrp;
                      
                      // Check if the current price is already recorded as the latest history entry
                      const isCurrentPriceInHistory = Math.abs(lastHistoryPrice - item.price) < 0.001;
                      
                      if (isCurrentPriceInHistory) {
                        // Current price IS in history (as last item). Previous price is the one before it.
                        if (item.priceHistory.length >= 2) {
                          oldPrice = item.priceHistory[item.priceHistory.length - 2].rrp;
                        }
                      } else {
                        // Current price is NOT the last item in history.
                        // So the last item in history is the previous price.
                        oldPrice = lastHistoryPrice;
                      }
                    }
                  }

                  return (
                    <tr key={`${item.id}-${item.barcode}`} className="transition-colors group hover:bg-white/[0.02]">
                      <td className="p-8">
                        <div className="flex flex-col">
                          <p className="font-black text-base text-white capitalize tracking-tight mb-1" style={{ fontSize: 'var(--product-title-size, 16px)' }}>{item.name}</p>
                          <p className="text-[11px] font-mono font-bold text-slate-500 tracking-widest">{item.barcode}</p>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-[1.25rem] border bg-slate-950 border-slate-800 text-slate-300 shadow-inner">
                          <Box size={14} className="text-slate-500" />
                          <span className="text-base font-black">{item.stockInHand}</span>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center justify-center gap-5">
                            <span className="text-sm font-bold text-white line-through opacity-40">£{oldPrice.toFixed(2)}</span>
                            <MoveRight size={18} className="text-slate-700" />
                            <span className="text-xl font-black text-emerald-500">£{((newPrice || 0).toFixed(2))}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-right">
                        <button 
                          onClick={() => markLabelPrinted(item.id, currentBranch)}
                          className="px-8 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 ml-auto shadow-xl shadow-emerald-900/30"
                        >
                          <CheckCircle2 size={16} /> LABELS PRINTED
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.985); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

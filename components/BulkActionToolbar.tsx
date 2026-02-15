
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  PoundSterling, ArrowDownToLine, Archive, ArchiveRestore, X, Trash2, RotateCw, Zap
} from 'lucide-react';
import { BulkPriceModal } from './BulkPriceModal';
import { BulkIntelligenceModal } from './BulkIntelligenceModal';
import { TriState } from '../types';

export const BulkActionToolbar = ({ 
  count, 
  onClear, 
  onAdjustPrice, 
  onReceive, 
  onUpdateIntelligence,
  onArchive,
  onDelete,
  isArchiveView = false,
  isBinView = false
}: { 
  count: number, 
  onClear: () => void, 
  onAdjustPrice: (adjustment: { type: 'percent' | 'fixed', value: number }) => void, 
  onReceive: () => void, 
  onUpdateIntelligence: (updates: { isShared: TriState, isPriceSynced: TriState, enableThresholdAlert: TriState }) => void,
  onArchive: () => void,
  onDelete?: () => void,
  isArchiveView?: boolean,
  isBinView?: boolean
}) => {
  const [showPricePopover, setShowPricePopover] = useState(false);
  const [showIntelPopover, setShowIntelPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const intelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPricePopover(false);
      }
      // Note: Intel modal is portaled, so this ref check might not catch clicks inside it if we rely on ref equality.
      // However, usually the portal handles its own state or we use a separate overlay.
      // We'll rely on the modal's own Close button or clicking the toolbar button again to toggle.
    };
    if (showPricePopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPricePopover]);

  if (count === 0) return null;

  return (
    <>
      {/* Portals for Modals to escape clipping contexts */}
      {showIntelPopover && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center pb-32 pointer-events-none">
           <div className="pointer-events-auto relative">
              <BulkIntelligenceModal 
                isOpen={showIntelPopover} 
                onClose={() => setShowIntelPopover(false)} 
                onConfirm={(updates) => { onUpdateIntelligence(updates); setShowIntelPopover(false); }} 
              />
           </div>
        </div>,
        document.body
      )}

      {showPricePopover && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center pb-32 pointer-events-none">
           <div className="pointer-events-auto relative">
              <BulkPriceModal 
                isOpen={showPricePopover} 
                onClose={() => setShowPricePopover(false)} 
                onConfirm={(adj) => { onAdjustPrice(adj); setShowPricePopover(false); }} 
              />
           </div>
        </div>,
        document.body
      )}

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[45] animate-in slide-in-from-bottom-12 duration-700 ease-out px-2 w-full max-w-[98vw] md:max-w-fit">
        <div className="bg-slate-950/80 backdrop-blur-3xl border border-white/10 ring-1 ring-emerald-500/20 rounded-full sm:rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] p-2 flex items-center gap-2 group overflow-x-auto scrollbar-hide">
          
          <div className="px-6 py-3 bg-emerald-600/10 rounded-full border border-emerald-500/20 flex items-center gap-4 transition-all group-hover:bg-emerald-600/15 shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
              <div className="relative w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-emerald-900/40">
                {count}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] mb-0.5 whitespace-nowrap">Selected</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none whitespace-nowrap">Records</span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800/50 mx-2 shrink-0" />

          <div className="flex items-center gap-2 pr-1">
            {!isArchiveView && !isBinView && (
              <>
                <div className="relative shrink-0" ref={popoverRef}>
                  <button 
                    onClick={() => { setShowPricePopover(!showPricePopover); setShowIntelPopover(false); }}
                    className={`h-12 px-6 rounded-full flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border ${
                      showPricePopover 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-900/40' 
                        : 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/40 hover:bg-indigo-500'
                    }`}
                  >
                    <PoundSterling size={16} /> <span className="whitespace-nowrap">Adjust RRP</span>
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onReceive(); }}
                  className="h-12 px-6 rounded-full bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest group/btn shadow-lg shadow-emerald-900/40 shrink-0"
                >
                  <ArrowDownToLine size={16} className="transition-transform group-hover/btn:-translate-y-0.5" /> 
                  <span className="whitespace-nowrap">Receive Stock</span>
                </button>

                <div className="relative shrink-0" ref={intelRef}>
                  <button 
                    onClick={() => { setShowIntelPopover(!showIntelPopover); setShowPricePopover(false); }}
                    className={`h-12 px-6 rounded-full flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border ${
                      showIntelPopover 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-900/40' 
                        : 'bg-blue-600/10 text-blue-500 border-blue-500/20 hover:bg-blue-600 hover:text-white shadow-lg'
                    }`}
                  >
                    <Zap size={16} /> <span className="whitespace-nowrap">Intelligence</span>
                  </button>
                </div>
              </>
            )}

            <button 
              onClick={onArchive}
              className={`h-12 px-8 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-lg border shrink-0 ${
                isBinView
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/40 hover:bg-emerald-500'
                  : isArchiveView 
                  ? 'bg-amber-600 text-white border-amber-500 shadow-amber-900/40 hover:bg-amber-500'
                  : 'bg-amber-600/10 text-amber-500 border-amber-500/20 hover:bg-amber-600 hover:text-white hover:border-amber-500 shadow-amber-900/10'
              }`}
            >
              {isBinView ? <RotateCw size={16} /> : isArchiveView ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              <span className="whitespace-nowrap">
                {isBinView ? 'RESTORE ITEM' : isArchiveView ? 'UNARCHIVE' : 'ARCHIVE'}
              </span>
            </button>

            {(isArchiveView || isBinView) && onDelete && (
              <button 
                onClick={onDelete}
                className={`h-12 px-6 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg border shrink-0 ${
                  isBinView 
                    ? 'bg-rose-600/10 text-rose-500 border-rose-500/20 hover:bg-rose-600 hover:text-white hover:border-rose-500' 
                    : isArchiveView
                    ? 'bg-rose-600/10 text-rose-500 border-rose-500/20 hover:bg-rose-600 hover:text-white hover:border-rose-500'
                    : 'bg-rose-600/10 text-rose-500 border-rose-500/20 hover:bg-rose-600 hover:text-white hover:border-rose-500 shadow-rose-900/10'
                }`}
              >
                <Trash2 size={16} />
                <span className="whitespace-nowrap">
                  {isBinView ? 'DELETE PERMANENTLY' : 'MOVE TO BIN'}
                </span>
              </button>
            )}

            <div className="h-8 w-px bg-slate-800/50 mx-2 shrink-0" />

            <button 
              onClick={onClear}
              className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center group/close shrink-0"
              title="Clear Selection"
            >
              <X size={20} className="transition-transform group-hover/close:rotate-90 duration-300" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

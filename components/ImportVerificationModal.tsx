
import React, { useState, useMemo } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, ArrowRight, 
  Database, Package, FileCheck, Info, PlusCircle, RefreshCw, Check
} from 'lucide-react';
import { InventoryComparisonResult } from '../utils/inventoryParser';

interface ImportVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ignoredIndices: Set<number>) => void;
  results: InventoryComparisonResult[];
}

/**
 * ImportVerificationModal - A high-fidelity UI for reviewing spreadsheet changes.
 * Supports ignoring specific updates with color-coded translucent action buttons.
 */
export const ImportVerificationModal: React.FC<ImportVerificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  results
}) => {
  const [ignoredIndices, setIgnoredIndices] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const toggleIgnore = (index: number) => {
    setIgnoredIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const activeResults = results.filter((_, idx) => !ignoredIndices.has(idx));
  const updatesCount = activeResults.filter(r => !r.isNew).length;
  const newItemsCount = activeResults.filter(r => r.isNew).length;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-6xl h-full max-h-[85vh] bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Import Verification</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Reviewing staged changes from spreadsheet</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="px-5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{updatesCount} Updates</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{newItemsCount} New Items</span>
                </div>
             </div>
             <button onClick={onClose} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
               <X size={20} />
             </button>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-auto bg-slate-950/20 scrollbar-hide">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
              <tr>
                <th className="w-[30%] px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Product Identity</th>
                <th className="w-[15%] px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Type</th>
                <th className="w-[43%] px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Detected Changes</th>
                <th className="w-[12%] px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <CheckCircle2 size={48} className="text-emerald-500" />
                       <p className="font-black uppercase text-sm tracking-[0.3em] text-slate-400">No Variations Detected</p>
                       <p className="text-xs font-bold text-slate-500">Spreadsheet matches current branch inventory perfectly.</p>
                    </div>
                  </td>
                </tr>
              ) : results.map((res, idx) => {
                const isIgnored = ignoredIndices.has(idx);
                return (
                  <tr key={res.barcode + idx} className={`group transition-all ${isIgnored ? 'opacity-30 grayscale' : res.isNew ? 'bg-emerald-500/[0.02]' : 'bg-amber-500/[0.01] hover:bg-white/[0.02]'}`}>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <p className={`text-sm font-black text-white capitalize group-hover:text-indigo-400 transition-colors truncate ${isIgnored ? 'line-through' : ''}`}>{res.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            <Package size={12} className="text-slate-600" />
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{res.barcode}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {res.isNew ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                          <PlusCircle size={10} /> New SKU
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest">
                          <RefreshCw size={10} /> Update
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-2">
                        {res.isNew ? (
                          <p className="text-[10px] font-bold text-slate-500 italic">Entire record will be initialized into inventory.</p>
                        ) : (
                          res.differences.map((diff, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300">
                              <span className="w-32 text-[9px] font-black text-slate-500 uppercase tracking-tighter shrink-0 whitespace-nowrap">{diff.field}:</span>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold text-slate-400 line-through opacity-50 truncate">
                                  {typeof diff.currentValue === 'number' && diff.field.includes('PRICE') ? `£${diff.currentValue.toFixed(2)}` : String(diff.currentValue)}
                                </span>
                                <ArrowRight size={10} className="text-slate-600 shrink-0" />
                                <span className="text-[11px] font-black text-amber-400 truncate">
                                  {typeof diff.excelValue === 'number' && diff.field.includes('PRICE') ? `£${diff.excelValue.toFixed(2)}` : String(diff.excelValue)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button 
                        onClick={() => toggleIgnore(idx)}
                        className={`p-2 rounded-xl transition-all shadow-sm border ${
                          !isIgnored 
                            ? 'bg-emerald-600/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-600/40' 
                            : 'bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/40'
                        }`}
                        data-tooltip={isIgnored ? "Include Update" : "Ignore Update"}
                      >
                        {!isIgnored ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-4 text-slate-500 bg-slate-950/50 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner max-md">
            <Info size={16} className="text-indigo-400 shrink-0" />
            <p className="text-[10px] font-bold leading-tight uppercase tracking-wide">
              {activeResults.length === 0 ? (
                <span className="text-rose-400">No items selected for commit. Ignore items to skip them.</span>
              ) : (
                <>Changes will be committed to <span className="text-white font-black">{activeResults.length} total products</span>. {ignoredIndices.size > 0 && <span className="text-amber-500">({ignoredIndices.size} items ignored)</span>}</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-[500px]">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95"
            >
              Abort Sync
            </button>
            <button 
              onClick={() => onConfirm(ignoredIndices)}
              disabled={activeResults.length === 0}
              className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 active:scale-95 flex items-center justify-center gap-3 border border-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Database size={18} />
              Confirm & Commit Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportVerificationModal;

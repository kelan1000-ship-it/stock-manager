
import React, { useState } from 'react';
import { 
  X, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, 
  Database, Package, PoundSterling, RefreshCw, Layers,
  ChevronRight, ArrowRightLeft, ShieldAlert, Check, Search, Plus, CloudUpload
} from 'lucide-react';
import { useInventoryReconciliation, MismatchedItem } from '../hooks/useInventoryReconciliation';
import { BranchData, BranchKey } from '../types';
import { SafeImage } from './SafeImage';

interface ReconciliationViewProps {
  isOpen: boolean;
  onClose: () => void;
  branchData: BranchData;
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>;
  currentBranch: BranchKey;
  theme: 'dark';
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  isOpen,
  onClose,
  branchData,
  setBranchData,
  currentBranch,
  theme
}) => {
  const { mismatches, unlistedItems, syncToLocal, syncToMaster, addToMaster } = useInventoryReconciliation(
    branchData,
    setBranchData,
    currentBranch
  );
  
  const [activeTab, setActiveTab] = useState<'mismatches' | 'unlisted'>('mismatches');

  if (!isOpen) return null;

  const branchLabel = currentBranch === 'bywood' ? 'Bywood Ave' : 'Broom Road';

  const formatFieldName = (field: string) => {
    switch(field) {
      case 'name': return 'PRODUCT NAME';
      case 'packSize': return 'PACK SIZE';
      case 'productCode': return 'PIP CODE';
      case 'image': return 'IMAGE URL';
      default: return field.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-4 md:p-8 overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 shadow-lg">
              <X size={24} className="text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-white">Catalogue Reconciliation</h2>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  {branchLabel}
                </span>
              </div>
              <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">Aligning Branch Inventory with Master Product Records</p>
            </div>
          </div>

          <div className="flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
             <button 
               onClick={() => setActiveTab('mismatches')}
               className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                 activeTab === 'mismatches' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               <AlertTriangle size={14} className={mismatches.length > 0 ? "text-rose-500" : "text-slate-500"} />
               Mismatches ({mismatches.length})
             </button>
             <button 
               onClick={() => setActiveTab('unlisted')}
               className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                 activeTab === 'unlisted' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               <Database size={14} className={unlistedItems.length > 0 ? "text-indigo-300" : "text-slate-500"} />
               Unlisted Products ({unlistedItems.length})
             </button>
          </div>
        </div>

        {activeTab === 'mismatches' ? (
          <>
            {/* Dashboard Grid Header */}
            <div className="grid grid-cols-12 gap-6 px-8 mb-4">
              <div className="col-span-4 flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{branchLabel} (Local)</span>
              </div>
              <div className="col-span-4 text-center">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">Synchronization Engine</span>
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2 text-right">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Master Catalogue (Source)</span>
                <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* Scrollable Mismatch List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
              {mismatches.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-500/30 mb-6">
                    <Check size={48} />
                  </div>
                  <h3 className="text-xl font-black text-slate-600 uppercase tracking-widest">Inventory Integrity Verified</h3>
                  <p className="text-slate-700 font-bold mt-2">All listed items in {branchLabel} match the Master Inventory Catalogue.</p>
                </div>
              ) : (
                mismatches.map((item) => (
                  <div key={item.localId} className="grid grid-cols-12 gap-6 p-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl transition-all hover:border-slate-700 group overflow-hidden">
                    
                    {/* Local Column */}
                    <div className="col-span-4 p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex-shrink-0">
                          <SafeImage 
                            src={branchData[currentBranch].find(p => p.id === item.localId)?.productImage} 
                            alt={item.productName} 
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate uppercase">{item.productName}</h4>
                          <p className="text-[10px] font-mono text-slate-500">{item.barcode}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {item.differences.map(diff => (
                          <div key={diff.field} className="flex flex-col p-3 rounded-xl bg-slate-950 border border-slate-800/50">
                            <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest mb-1">{formatFieldName(diff.field)}</span>
                            <span className="text-xs font-bold text-slate-300 break-all">
                              {diff.localValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sync Actions Column */}
                    <div className="col-span-4 flex flex-col items-center justify-center gap-4 relative py-6">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                      
                      <button 
                        onClick={() => syncToMaster(item.localId)}
                        className="z-10 group/btn px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-900/40"
                      >
                        <span>Trust Local</span>
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>

                      <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-500 shadow-xl">
                        <RefreshCw size={18} className="animate-spin-slow" />
                      </div>

                      <button 
                        onClick={() => syncToLocal(item.localId)}
                        className="z-10 group/btn px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
                      >
                        <ArrowLeft size={14} className="group-hover/btn:-translate-x-1 transition-transform" />
                        <span>Trust Master</span>
                      </button>
                      
                      <div className="mt-2 px-4 py-2 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ShieldAlert size={12} className="text-amber-500" />
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Select Source of Truth</span>
                      </div>
                    </div>

                    {/* Master Column */}
                    <div className="col-span-4 p-6 space-y-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate uppercase">
                            {branchData.masterInventory.find(m => m.id === item.masterId)?.name || item.productName}
                          </h4>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">Verified EAN</span>
                            <p className="text-[10px] font-mono text-slate-500">{item.barcode}</p>
                          </div>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex-shrink-0 border-l-emerald-500/30">
                          <SafeImage 
                            src={branchData.masterInventory.find(m => m.id === item.masterId)?.image} 
                            alt="Master record visual" 
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {item.differences.map(diff => (
                          <div key={diff.field} className="flex flex-col p-3 rounded-xl bg-slate-950 border border-emerald-500/10">
                            <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mb-1">{formatFieldName(diff.field)}</span>
                            <span className="text-xs font-black text-emerald-400 break-all">
                              {diff.masterValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
             {unlistedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-500/30 mb-6">
                    <Database size={48} />
                  </div>
                  <h3 className="text-xl font-black text-slate-600 uppercase tracking-widest">Master Catalogue Synchronized</h3>
                  <p className="text-slate-700 font-bold mt-2">All products in {branchLabel} are present in the master catalogue.</p>
                </div>
             ) : (
               unlistedItems.map((item) => (
                 <div key={item.localId} className="flex items-center justify-between p-6 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-xl group hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex-shrink-0">
                          <SafeImage src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest">Unlisted</span>
                             <span className="text-[10px] font-mono text-slate-500">{item.barcode}</span>
                          </div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tight mb-1">{item.name}</h4>
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                             <span>{item.packSize}</span>
                             <span className="w-1 h-1 rounded-full bg-slate-700" />
                             <span>PIP: {item.productCode || 'N/A'}</span>
                             <span className="w-1 h-1 rounded-full bg-slate-700" />
                             <span className="text-white">£{item.price.toFixed(2)}</span>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => addToMaster(item.localId)}
                      className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 flex items-center gap-3 active:scale-95"
                    >
                       <CloudUpload size={16} /> Add to Master Catalogue
                    </button>
                 </div>
               ))
             )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/10 flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 shrink-0">
            <Database size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight">Understanding Master Records</h4>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Reconciliation checks: <span className="text-emerald-400 px-1">Product Name</span>, <span className="text-emerald-400 px-1">Pack Size</span>, <span className="text-emerald-400 px-1">PIP Code</span>, and <span className="text-emerald-400 px-1">Images</span>. 
              <span className="text-rose-400 px-1 ml-1">RRP and Cost Price are excluded</span> to allow for local site variations.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Local Mismatch</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Master Reference</span>
             </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ReconciliationView;

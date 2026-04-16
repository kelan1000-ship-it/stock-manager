import React, { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  X, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  Database, Package, PoundSterling, RefreshCw, Layers,
  ChevronRight, ChevronLeft, ArrowRightLeft, ShieldAlert, Check, Search, Plus, CloudUpload, Filter, Trash2, Settings2
} from 'lucide-react';
import { useInventoryReconciliation, MismatchedItem } from '../hooks/useInventoryReconciliation';
import { BranchData, ReconciliationExclusion, Product } from '../types';
import { StockState, setBranchData as setReduxBranchData } from './stockSlice';
import { SafeImage } from './SafeImage';
import { useAuth } from '../contexts/AuthContext';

interface ReconciliationViewProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark';
}

import { matchesAnySearchField } from '../utils/stringUtils';

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  isOpen,
  onClose,
  theme
}) => {
  const dispatch = useDispatch();
  const { currentBranch } = useAuth();
  const stock = useSelector((state: { stock: StockState }) => state.stock);
  const branchData: BranchData = useMemo(() => ({
    bywood: stock.bywood, broom: stock.broom,
    messages: stock.messages, transfers: stock.transfers,
    bywoodRequests: stock.bywoodRequests, broomRequests: stock.broomRequests,
    bywoodRequests_archived: stock.bywoodRequests_archived, broomRequests_archived: stock.broomRequests_archived,
    bywoodOrders: stock.bywoodOrders, broomOrders: stock.broomOrders, jointOrders: stock.jointOrders,
    masterInventory: stock.masterInventory,
    bywoodPlanograms: stock.bywoodPlanograms, broomPlanograms: stock.broomPlanograms,
    bywoodFloorPlans: stock.bywoodFloorPlans, broomFloorPlans: stock.broomFloorPlans,
    suppliers: stock.suppliers, tasks: stock.tasks,
    screenshotHistory: stock.screenshotHistory, sharedOrderDrafts: stock.sharedOrderDrafts,
  }), [stock]);
  const setBranchData = useCallback((update: React.SetStateAction<BranchData>) => {
    const nextData = typeof update === 'function' ? update(branchData) : update;
    dispatch(setReduxBranchData(nextData));
  }, [branchData, dispatch]);
  const [activeTab, setActiveTab] = useState<'mismatches' | 'unlisted' | 'ignored'>('mismatches');
  const [isExclusionOpen, setIsExclusionOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [unlistedSearch, setUnlistedSearch] = useState('');

  const { 
    mismatches, 
    unlistedItems, 
    matchRate,
    isCalculating,
    matchThreshold,
    setMatchThreshold,
    exclusions,
    refresh,
    addExclusion,
    removeExclusion,
    syncToLocal, 
    syncToMaster, 
    addToMaster 
  } = useInventoryReconciliation(
    branchData,
    setBranchData,
    currentBranch
  );
  
  // Debounce logic for threshold to prevent re-calc lag during slider movement
  const [localThreshold, setLocalThreshold] = useState(matchThreshold);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMatchThreshold(localThreshold);
      setCurrentPage(1); // Reset pagination on filter change
    }, 400);
    return () => clearTimeout(timer);
  }, [localThreshold, setMatchThreshold]);

  // Reset pagination when tab changes or search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, unlistedSearch]);

  // Custom rule builder state
  const [newRuleField, setNewRuleField] = useState<keyof Product>('stockInHand');
  const [newRuleOp, setNewRuleOp] = useState<'lt' | 'gt' | 'eq' | 'contains'>('lt');
  const [newRuleVal, setNewRuleVal] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      console.log(`[ReconciliationView] Initialized for branch: ${currentBranch}`);
    }
  }, [isOpen, currentBranch]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const branchLabel = currentBranch === 'bywood' ? 'Bywood Ave' : 'Broom Road';

  const formatFieldName = (field: string) => {
    switch(field) {
      case 'name': return 'PRODUCT NAME';
      case 'subheader': return 'SUBHEADER';
      case 'packSize': return 'PACK SIZE';
      case 'productCode': return 'PIP CODE';
      case 'image': return 'IMAGE URL';
      default: return field.toUpperCase();
    }
  };

  // Filter and Pagination Logic
  const filteredUnlisted = React.useMemo(() => {
    const q = unlistedSearch.toLowerCase().trim();
    if (!q) return unlistedItems;
    return unlistedItems.filter(item =>
      matchesAnySearchField([item.name, item.productCode, item.barcode, item.supplier], q)
    );
  }, [unlistedItems, unlistedSearch]);
  const activeList = activeTab === 'mismatches' ? mismatches : activeTab === 'unlisted' ? filteredUnlisted : exclusions;
  const totalPages = Math.ceil(activeList.length / pageSize);
  const paginatedList = activeList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleBulkAddUnlisted = () => {
    if (!confirm(`Add all ${filteredUnlisted.length} filtered items to Master Catalogue?`)) return;
    filteredUnlisted.forEach(item => addToMaster(item.localId));
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300 text-slate-100">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-4 md:p-8 overflow-hidden">
          
          {/* Header Section */}
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-8 shrink-0">
            <div className="flex items-center gap-4 md:gap-6 w-full xl:w-auto">
              <button onClick={onClose} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0 border border-slate-700 shadow-lg">
                <X size={20} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-3xl font-black text-white truncate">Catalogue Reconciliation</h2>
                  <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                    {branchLabel}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Match Rate:</span>
                    <span className="text-xs font-black text-indigo-400">{matchRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Fuzzy Threshold:</span>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1" 
                      step="0.05" 
                      value={localThreshold} 
                      onChange={(e) => setLocalThreshold(parseFloat(e.target.value))}
                      className="w-20 md:w-32 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-indigo-400 w-8">{(localThreshold * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all mr-1"
                data-tooltip="Instant Refresh"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => setIsExclusionOpen(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all mr-2 whitespace-nowrap ${exclusions.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Filter size={12} />
                Rules ({exclusions.length})
              </button>
              <button 
                onClick={() => setActiveTab('mismatches')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'mismatches' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <AlertTriangle size={12} className={mismatches.length > 0 ? "text-rose-500" : "text-slate-500"} />
                Mismatches ({mismatches.length})
              </button>
              <button 
                onClick={() => setActiveTab('unlisted')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'unlisted' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Database size={12} className={unlistedItems.length > 0 ? "text-indigo-300" : "text-slate-500"} />
                Unlisted ({unlistedItems.length})
              </button>
              <button 
                onClick={() => setActiveTab('ignored')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'ignored' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <X size={12} className={exclusions.length > 0 ? "text-amber-300" : "text-slate-500"} />
                Ignored ({exclusions.length})
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative flex flex-col gap-4">
            {isCalculating && (
              <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center rounded-[3rem] border border-slate-800 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-900/50 mb-4">
                    <RefreshCw size={32} className="text-white animate-spin" />
                </div>
                <p className="text-sm font-black text-white uppercase tracking-[0.3em] animate-pulse">Analyzing Inventory...</p>
              </div>
            )}

            {activeTab === 'mismatches' && (
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-6 px-8 mb-2 shrink-0">
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

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                  {mismatches.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800 p-8 text-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-500/30 mb-6">
                        <Check size={48} />
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-slate-600 uppercase tracking-widest">Inventory Integrity Verified</h3>
                      <p className="text-slate-700 font-bold mt-2">All listed items match the Master Inventory Catalogue.</p>
                    </div>
                  ) : (
                    paginatedList.map((item) => (
                      <div key={(item as MismatchedItem).localId} className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 p-1 bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl transition-all hover:border-slate-700 group overflow-hidden">
                        <div className="md:col-span-4 p-4 md:p-6 space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex-shrink-0">
                              <SafeImage 
                                src={branchData[currentBranch].find(p => p.id === (item as MismatchedItem).localId)?.productImage} 
                                alt={(item as MismatchedItem).productName} 
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs md:text-sm font-black text-white truncate uppercase">{(item as MismatchedItem).productName}</h4>
                              <p className="text-[9px] md:text-[10px] font-mono text-slate-500">{(item as MismatchedItem).barcode}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(item as MismatchedItem).differences.map(diff => (
                              <div key={diff.field} className="flex flex-col p-2 md:p-3 rounded-xl bg-slate-950 border border-slate-800/50">
                                <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest mb-1">{formatFieldName(diff.field)}</span>
                                <span className="text-[10px] md:text-xs font-bold text-slate-300 break-all leading-tight">{diff.localValue}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-4 flex flex-row md:flex-col items-center justify-center gap-3 md:gap-4 relative py-4 md:py-6 bg-slate-950/20 md:bg-transparent rounded-2xl md:rounded-none mx-2 md:mx-0">
                          <div className="hidden md:block absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                          <div className="z-10 flex flex-col items-center gap-2 flex-1 md:flex-none">
                            <button 
                                onClick={() => syncToMaster((item as MismatchedItem).localId)}
                                className="w-full md:w-auto group/btn px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-indigo-600 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-900/40"
                            >
                                <span className="hidden sm:inline">Trust Local</span>
                                <span className="sm:hidden">Local</span>
                                <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                            <span className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-tighter">Confidence: {((item as MismatchedItem).confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-500 shadow-xl shrink-0">
                            <RefreshCw size={14} className="animate-spin-slow" />
                          </div>
                          <div className="flex-1 md:flex-none">
                            <button 
                                onClick={() => syncToLocal((item as MismatchedItem).localId)}
                                className="z-10 w-full md:w-auto group/btn px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-emerald-600 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
                            >
                                <ArrowLeft size={12} className="group-hover/btn:-translate-x-1 transition-transform" />
                                <span className="hidden sm:inline">Trust Master</span>
                                <span className="sm:hidden">Master</span>
                            </button>
                          </div>
                        </div>
                        <div className="md:col-span-4 p-4 md:p-6 space-y-4 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <div className="min-w-0">
                              <h4 className="text-xs md:text-sm font-black text-white truncate uppercase">
                                {branchData.masterInventory.find(m => m.id === (item as MismatchedItem).masterId)?.name || (item as MismatchedItem).productName}
                              </h4>
                              <div className="flex items-center justify-end gap-2">
                                <span className="hidden sm:inline-block text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">Verified Record</span>
                                <p className="text-[10px] font-mono text-slate-500">{(item as MismatchedItem).barcode}</p>
                              </div>
                            </div>
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex-shrink-0 border-l-emerald-500/30">
                              <SafeImage 
                                src={branchData.masterInventory.find(m => m.id === (item as MismatchedItem).masterId)?.image} 
                                alt="Master record visual" 
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(item as MismatchedItem).differences.map(diff => (
                              <div key={diff.field} className="flex flex-col p-2 md:p-3 rounded-xl bg-slate-950 border border-emerald-500/10">
                                <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mb-1">{formatFieldName(diff.field)}</span>
                                <span className="text-[10px] md:text-xs font-black text-emerald-400 break-all leading-tight">{diff.masterValue}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'unlisted' && (
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-[2rem] shrink-0">
                  <div className="relative flex-1 group w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                      <input 
                        type="text"
                        value={unlistedSearch}
                        onChange={(e) => setUnlistedSearch(e.target.value)}
                        placeholder="Search by Name, Supplier, or PIP..."
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-all"
                      />
                  </div>
                  <button 
                    onClick={handleBulkAddUnlisted}
                    disabled={filteredUnlisted.length === 0}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-900/40"
                  >
                    <CloudUpload size={16} /> Bulk Add Filtered ({filteredUnlisted.length})
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                  {filteredUnlisted.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800 p-8 text-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-500/30 mb-6">
                        <Database size={48} />
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-slate-600 uppercase tracking-widest">No Products Found</h3>
                      <p className="text-slate-700 font-bold mt-2">Try adjusting your search query or filters.</p>
                    </div>
                  ) : (
                    paginatedList.map((item) => (
                      <div key={(item as any).localId} className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] shadow-xl group hover:border-slate-700 transition-all gap-4">
                        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex-shrink-0">
                              <SafeImage src={(item as any).image} alt={(item as any).name} className="w-full h-full object-contain p-1" />
                          </div>
                          <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest">Unlisted</span>
                                <span className="text-[9px] md:text-[10px] font-mono text-slate-500">{(item as any).barcode}</span>
                                {(item as any).duplicateCount > 1 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                      {(item as any).duplicateCount} Instances
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tight mb-1 truncate">{(item as any).name}</h4>
                              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs font-bold text-slate-500">
                                <span>{(item as any).packSize}</span>
                                <span className="hidden xs:inline-block w-1 h-1 rounded-full bg-slate-700" />
                                <span>PIP: {(item as any).productCode || 'N/A'}</span>
                                <span className="hidden xs:inline-block w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-white font-bold">£{(item as any).price.toFixed(2)}</span>
                              </div>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => addExclusion({ type: 'barcode', value: (item as any).barcode })}
                                  className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-800 text-slate-400 hover:text-rose-400 transition-all shadow-lg active:scale-95"
                                  data-tooltip="Exclude from Reconciliation"
                                >
                                  <X size={16} />
                                </button>
                                <button 
                                  onClick={() => addToMaster((item as any).localId)}
                                  className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-indigo-600 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2 md:gap-3 active:scale-95 whitespace-nowrap"
                                >
                                  <CloudUpload size={14} /> Add to Master
                                </button>
                            </div>
                            {(item as any).duplicateCount > 1 && (
                              <p className="hidden sm:block text-[8px] font-bold text-slate-500 uppercase tracking-widest pr-2 text-right">Resolves all {(item as any).duplicateCount} instances</p>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ignored' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                {exclusions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800 p-8 text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-500/30 mb-6">
                      <Check size={48} />
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-600 uppercase tracking-widest">No Ignored Items</h3>
                    <p className="text-slate-700 font-bold mt-2">All products are being actively reconciled.</p>
                  </div>
                ) : (
                  (paginatedList as ReconciliationExclusion[]).map((ex) => (
                    <div key={ex.id} className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] shadow-xl group hover:border-slate-700 transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                          <Filter size={24} />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{ex.type}</span>
                          <span className="text-sm font-bold text-white">{ex.value}</span>
                          {ex.ruleConfig && (
                            <span className="text-[10px] font-mono text-slate-600 block mt-1">
                              {ex.ruleConfig.field} {ex.ruleConfig.operator} {ex.ruleConfig.threshold}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeExclusion(ex.id)}
                        className="px-6 py-3 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                      >
                        Restore to Reconciliation
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[2rem] bg-slate-900/50 border border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                  <select 
                    value={pageSize} 
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-black text-white outline-none focus:ring-1 ring-indigo-500"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-700 transition-all"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                      if (pageNum > totalPages) pageNum = totalPages - (Math.min(5, totalPages) - i - 1);
                      if (pageNum < 1) pageNum = i + 1;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-700 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Footer info */}
            <div className="mt-6 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-indigo-600/5 border border-indigo-500/10 flex flex-col md:flex-row items-center gap-4 md:gap-6 shrink-0">
              <div className="hidden md:flex w-12 h-12 rounded-2xl bg-indigo-600/10 items-center justify-center text-indigo-400 shrink-0">
                <Database size={24} />
              </div>
              <div className="text-center md:text-left flex-1">
                <h4 className="text-sm font-black text-white uppercase tracking-tight">Understanding Master Records</h4>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold mt-1">
                  Alignment checks: <span className="text-emerald-400 px-1">Name</span>, <span className="text-emerald-400 px-1">Pack Size</span>, <span className="text-emerald-400 px-1">PIP</span>, and <span className="text-emerald-400 px-1">Images</span>. 
                  <span className="text-rose-400 px-1 ml-1">Prices are excluded</span> for site variations.
                </p>
              </div>
              <div className="md:ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Mismatch</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Master</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exclusion Management Modal */}
        {isExclusionOpen && (
            <div className="fixed inset-0 z-[210] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-200">
                <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                <Filter size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">Matching Exclusions</h3>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Rule-based Data Filtering</p>
                            </div>
                        </div>
                        <button onClick={() => setIsExclusionOpen(false)} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] px-2">Active Filter Rules</h4>
                            {exclusions.length === 0 ? (
                                <div className="p-10 text-center rounded-3xl border-2 border-dashed border-slate-800 text-slate-600">
                                    <p className="text-xs font-bold uppercase tracking-widest">No exclusion rules defined</p>
                                </div>
                            ) : (
                                exclusions.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                                            <div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{ex.type}</span>
                                                <span className="text-sm font-bold text-white">{ex.value}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeExclusion(ex.id)}
                                            className="p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/20"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 rounded-3xl bg-indigo-500/[0.03] border border-indigo-500/10 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Build Custom Filter Rule</h4>
                                <Settings2 size={14} className="text-indigo-400" />
                            </div>
                            
                            <div className="grid grid-cols-12 gap-3">
                                <select 
                                  value={newRuleField}
                                  onChange={(e) => setNewRuleField(e.target.value as keyof Product)}
                                  className="col-span-5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                >
                                    <option value="stockInHand">Stock Level</option>
                                    <option value="price">Retail Price</option>
                                    <option value="supplier">Supplier</option>
                                    <option value="location">Shelf Location</option>
                                    <option value="isDiscontinued">Discontinued</option>
                                </select>

                                <select 
                                  value={newRuleOp}
                                  onChange={(e) => setNewRuleOp(e.target.value as any)}
                                  className="col-span-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 text-center"
                                >
                                    <option value="lt">&lt;</option>
                                    <option value="gt">&gt;</option>
                                    <option value="eq">=</option>
                                    <option value="contains">~</option>
                                </select>

                                <input 
                                  type="text"
                                  value={newRuleVal}
                                  onChange={(e) => setNewRuleVal(e.target.value)}
                                  placeholder="Value"
                                  className="col-span-4 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            <button 
                              onClick={() => {
                                if (!newRuleVal) return;
                                addExclusion({ 
                                  type: 'rule', 
                                  value: `${newRuleField} ${newRuleOp} ${newRuleVal}`, 
                                  ruleConfig: { field: newRuleField, operator: newRuleOp, threshold: newRuleVal } 
                                });
                                setNewRuleVal('');
                              }}
                              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/40"
                            >
                                Add Custom Rule
                            </button>

                            <div className="h-px bg-slate-800/50" />

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                  onClick={() => addExclusion({ type: 'rule', value: 'Low Stock Only', ruleConfig: { field: 'stockInHand', operator: 'lt', threshold: 5 } })}
                                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-indigo-500/50 transition-all group"
                                >
                                    <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Preset</span>
                                    <span className="text-[10px] font-bold text-white group-hover:text-indigo-400">Ignore stock &lt; 5</span>
                                </button>
                                <button 
                                  onClick={() => addExclusion({ type: 'rule', value: 'Discontinued Items', ruleConfig: { field: 'isDiscontinued', operator: 'eq', threshold: 'true' } })}
                                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-indigo-500/50 transition-all group"
                                >
                                    <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Preset</span>
                                    <span className="text-[10px] font-bold text-white group-hover:text-indigo-400">Ignore discontinued</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex justify-end shrink-0">
                        <button 
                          onClick={() => setIsExclusionOpen(false)}
                          className="px-8 py-3 rounded-xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                        >
                            Close Manager
                        </button>
                    </div>
                </div>
            </div>
        )}

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
    </>
  );
};

export default ReconciliationView;

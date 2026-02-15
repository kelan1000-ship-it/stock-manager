
import React, { useState, useRef } from 'react';
import { 
  X, Loader2, Sparkles, Plus, ShoppingCart, Pill, Camera, Trash2, Layers, 
  Database, Info, Link as LinkIcon, BadgeCheck, Upload, RotateCcw,
  ArrowRight, List, CheckCircle2, Check, AlertTriangle
} from 'lucide-react';
import { MasterProduct, BulkItem, BranchKey } from '../types';
import { ProductPhotoCapture } from './ProductImageUploader';
import { researchProductDetails } from '../services/geminiService';

const BulkMatchSuggestions = ({ 
  query, 
  onSuggest, 
  onSelect,
  onClose
}: { 
  query: string, 
  onSuggest: (q: string) => MasterProduct[], 
  onSelect: (p: MasterProduct) => void,
  onClose: () => void
}) => {
  const suggestions = onSuggest(query);
  
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-[60] bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-3 bg-indigo-600/20 border-b border-indigo-500/20 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-indigo-300 tracking-widest flex items-center gap-2">
          <Database size={12} className="text-indigo-400" /> Catalog Matches ({suggestions.length})
        </span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors"><X size={14}/></button>
      </div>
      <div className="max-h-72 overflow-y-auto scrollbar-hide">
        {suggestions.map((p) => (
          <button 
            key={p.id}
            onClick={(e) => { e.stopPropagation(); onSelect(p); }}
            className="w-full p-4 flex items-center gap-4 hover:bg-indigo-600/10 transition-all text-left border-b border-slate-800/50 last:border-0 group"
          >
            <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-800 shadow-sm flex items-center justify-center">
              {p.image ? (
                <img src={p.image} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <Database size={20} className="text-slate-200" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-white truncate capitalize group-hover:text-indigo-300 transition-colors">{p.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{p.packSize || 'N/A'}</span>
                <div className="flex items-center gap-1">
                  <LinkIcon size={10} className="text-slate-600" />
                  <span className="text-[9px] font-mono font-bold text-indigo-400/80">{p.barcode || p.productCode || 'No Code'}</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[12px] font-black text-emerald-500">£{p.price?.toFixed(2)}</p>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Master RRP</span>
            </div>
          </button>
        ))}
      </div>
      <div className="p-2.5 bg-slate-950/50 text-center">
         <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Select a record to auto-populate all fields</p>
      </div>
    </div>
  );
};

interface BulkAddViewProps {
  items: BulkItem[];
  onAddRow: () => void;
  onUpdateRow: (tempId: string, updates: Partial<BulkItem>) => void;
  onRemoveRow: (tempId: string) => void;
  onProcessImages: (files: File[]) => Promise<void>;
  onCommit: () => void;
  onCommitReady: () => void;
  onToggleStatus: (tempId: string) => void;
  onMarkAllReady: () => void;
  theme: 'dark';
  currentBranch: BranchKey;
  onClose: () => void;
  onStartScanRow: (tempId: string) => void;
  isAILoading: boolean;
  masterInventory?: MasterProduct[];
  onSuggestMaster?: (query: string) => MasterProduct[];
  isCameraOpen: boolean;
  setCameraOpen: (v: boolean) => void;
  uniqueLocations?: string[];
}

export const BulkAddView = ({ 
  items, onAddRow, onUpdateRow, onRemoveRow, 
  onProcessImages, onCommit, onCommitReady, onToggleStatus, onMarkAllReady, 
  theme, currentBranch, onClose, onStartScanRow, isAILoading,
  masterInventory = [],
  onSuggestMaster,
  isCameraOpen,
  setCameraOpen,
  uniqueLocations = []
}: BulkAddViewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'draft' | 'ready'>('draft');

  const displayedItems = items.filter((i) => 
    activeTab === 'draft' ? i.status !== 'ready' : i.status === 'ready'
  );

  const readyCount = items.filter((i) => i.status === 'ready').length;
  const draftCount = items.length - readyCount;

  const handleApplyMaster = (tempId: string, p: MasterProduct) => {
    const item = items.find((i) => i.tempId === tempId);
    if (!item) return;
    
    // Explicitly cast to any to access potential originalData not in interface
    const originalData = (item as any).originalData || {
      name: item.name,
      barcode: item.barcode,
      productCode: item.productCode,
      packSize: item.packSize,
      priceStr: item.priceStr,
      costPriceStr: item.costPriceStr
    };

    onUpdateRow(tempId, { 
      name: p.name,
      barcode: p.barcode || '',
      productCode: p.productCode || '',
      packSize: p.packSize || '',
      priceStr: p.price ? p.price.toFixed(2) : '0.00',
      costPriceStr: p.costPrice ? p.costPrice.toFixed(2) : '0.00',
      // Explicitly cast to any to pass originalData
      originalData: originalData
    } as any);
    setActiveSuggestionId(null);
  };

  const handleUndoMatch = (tempId: string) => {
    const item = items.find((i) => i.tempId === tempId);
    if (item && (item as any).originalData) {
      onUpdateRow(tempId, {
        ...(item as any).originalData,
        originalData: undefined 
      } as any);
    }
  };

  const handleAIAutoFill = async (tempId: string, name: string) => {
    onUpdateRow(tempId, { isProcessing: true } as any);
    try {
      const result = await researchProductDetails(name);
      const currentItem = items.find(i => i.tempId === tempId);
      if (!currentItem) return;

      onUpdateRow(tempId, {
        barcode: currentItem.barcode || result.barcode || '',
        productCode: currentItem.productCode || result.productCode || '',
        packSize: currentItem.packSize || result.packSize || '',
        priceStr: (currentItem.priceStr && parseFloat(currentItem.priceStr) > 0) ? currentItem.priceStr : (result.price ? result.price.toFixed(2) : ''),
        isProcessing: false
      } as any);
    } catch (e) {
      console.error("AI Autofill error", e);
      onUpdateRow(tempId, { isProcessing: false, isError: true } as any);
    }
  };

  const handleCameraCapture = (base64: string) => {
    const dataURLtoFile = (dataurl: string, filename: string) => {
      let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, {type:mime});
    };

    const file = dataURLtoFile(base64, `camera-capture-${Date.now()}.jpg`);
    onProcessImages([file]);
    setCameraOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      <div className="max-w-[100vw] mx-auto w-full h-full flex flex-col p-4 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 shadow-lg"><X size={24} className="text-slate-400" /></button>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Bulk Stock Ingest</h2>
              <div className="flex items-center gap-3 mt-1">
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Batch processing: {currentBranch.toUpperCase()}</p>
                 <div className="h-4 w-px bg-slate-800" />
                 <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Database size={10}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Master Link Active</span>
                 </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`relative min-w-[200px] h-[56px] rounded-2xl transition-all shadow-2xl group overflow-hidden cursor-pointer ${isAILoading ? 'ai-pulse-light' : 'bg-white/10 backdrop-blur-xl border border-white/20 animate-ai-glow hover:bg-white/15'}`}>
                <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-300 ease-out ${isAILoading ? '' : 'group-hover:opacity-0 group-hover:-translate-y-4 pointer-events-none'}`}>
                    {isAILoading ? (
                       <Loader2 size={20} className="text-white animate-spin" />
                    ) : (
                       <Sparkles size={20} className="text-emerald-400" /> 
                    )}
                    <span className="font-black text-xs text-white tracking-widest uppercase">
                        {isAILoading ? 'ANALYZING...' : 'AI MULTI-SCAN'}
                    </span>
                </div>

                {!isAILoading && (
                    <div className="absolute inset-0 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-full flex flex-col items-center justify-center gap-0.5 hover:bg-white/10 transition-colors"
                        >
                            <Upload size={14} className="text-emerald-400" />
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">Upload</span>
                        </button>

                        <div className="w-px h-6 bg-white/20" />

                        <button 
                            onClick={() => setCameraOpen(true)}
                            className="flex-1 h-full flex flex-col items-center justify-center gap-0.5 hover:bg-white/10 transition-colors"
                        >
                            <Camera size={14} className="text-emerald-400" />
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">Camera</span>
                        </button>
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) onProcessImages(Array.from(e.target.files)); }} />
            
            <button 
              onClick={onAddRow} 
              className="px-6 py-4 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-700 transition-all shadow-lg"
            >
              <Plus size={18} /> Manual Line
            </button>
            <button 
                onClick={onCommitReady} 
                disabled={readyCount === 0} 
                className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Check size={18} /> Import {readyCount} Item{readyCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col rounded-[3rem] border border-slate-800 bg-slate-900/30 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-950/50">
             <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800">
                <button 
                   onClick={() => setActiveTab('draft')}
                   className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'draft' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   <List size={14} /> Review Queue ({draftCount})
                </button>
                <button 
                   onClick={() => setActiveTab('ready')}
                   className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ready' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                   <CheckCircle2 size={14} /> Ready to Import ({readyCount})
                </button>
             </div>
             
             {activeTab === 'draft' && draftCount > 0 && (
                <button 
                   onClick={onMarkAllReady}
                   className="mr-6 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                   Accept All New Items <ArrowRight size={14} />
                </button>
             )}
          </div>

          <div className="flex-1 overflow-auto relative">
            <datalist id="bulk-locations-list">
              {uniqueLocations.map((loc: string) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="sticky top-0 bg-slate-900 z-50 shadow-xl">
                <tr>
                    <th className="px-4 py-6 w-16 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">LINK</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Product Name</th>
                    <th className="px-4 py-6 w-32 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Category</th>
                    <th className="px-4 py-6 w-48 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Barcode</th>
                    <th className="px-4 py-6 w-40 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">PIP Code</th>
                    <th className="px-3 py-6 w-24 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Pack Size</th>
                    <th className="px-3 py-6 w-24 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">RRP (£)</th>
                    <th className="px-3 py-6 w-24 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Cost (£)</th>
                    <th className="px-3 py-6 w-20 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Qty</th>
                    <th className="px-4 py-6 w-40 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Shelf Location</th>
                    <th className="px-4 py-6 w-24 text-right border-b border-slate-800">
                    <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider pr-2">Action</span>
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                {displayedItems.length === 0 ? (
                    <tr>
                    <td colSpan={11} className="py-48 text-center">
                        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 shadow-inner">
                            <Layers size={48} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-black uppercase text-sm tracking-[0.3em] text-slate-600">
                                {activeTab === 'draft' ? 'Review Queue Cleared' : 'No Items Ready'}
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                                {activeTab === 'draft' ? 'All items have been moved to the ready queue.' : 'Accept items from the review queue to import.'}
                            </p>
                        </div>
                        </div>
                    </td>
                    </tr>
                ) : displayedItems.map((item) => {
                    const query = item.name || item.barcode || item.productCode || '';
                    const suggestions = onSuggestMaster ? onSuggestMaster(query) : [];
                    // Explicit casts to access missing properties
                    const itemAny = item as any;
                    
                    // Match Logic: 1. Barcode, 2. PIP, 3. Name
                    const exactMatch = (() => {
                        if (item.barcode) {
                            const m = masterInventory.find(m => m.barcode === item.barcode);
                            if (m) return m;
                        }
                        if (item.productCode) {
                            const m = masterInventory.find(m => m.productCode === item.productCode);
                            if (m) return m;
                        }
                        if (item.name) {
                            const m = masterInventory.find(m => m.name.toLowerCase() === item.name.toLowerCase());
                            if (m) return m;
                        }
                        return itemAny.originalData;
                    })();
                    
                    const likelyMatch = !exactMatch && suggestions.length > 0 ? suggestions[0] : null;

                    return (
                    <tr key={item.tempId} className={`group transition-all ${itemAny.isError ? 'bg-rose-500/5' : 'hover:bg-white/[0.02]'} ${exactMatch ? 'bg-indigo-500/[0.01]' : ''}`}>
                        {/* Table Row Content */}
                        <td className="px-4 py-6">
                        <div className="flex justify-center">
                            {itemAny.isProcessing ? (
                            <Loader2 className="animate-spin text-emerald-500" size={20} />
                            ) : itemAny.isError ? (
                            <AlertTriangle className="text-rose-500" size={20} />
                            ) : exactMatch ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]" title="Verified against Corporate Record">
                                <BadgeCheck className="text-emerald-400" size={16}/>
                            </div>
                            ) : suggestions.length > 0 ? (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center animate-pulse" title="Catalogue Matches Available">
                                <Database className="text-indigo-400" size={14}/>
                            </div>
                            ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                            )}
                        </div>
                        </td>
                        <td className="px-4 py-6 relative">
                        <div className="relative">
                            <div className="flex items-center gap-3">
                            <input 
                                type="text" 
                                value={item.name} 
                                onFocus={(e) => { e.target.select(); setActiveSuggestionId(item.tempId); }} 
                                onChange={(e) => { onUpdateRow(item.tempId, { name: e.target.value }); setActiveSuggestionId(item.tempId); }} 
                                className={`w-full bg-transparent border-b font-bold text-sm text-white outline-none p-1.5 transition-all ${activeSuggestionId === item.tempId ? 'border-indigo-500' : 'border-slate-800 group-hover:border-slate-700'}`} 
                                placeholder="Enter Name, Barcode or PIP..." 
                            />
                            {suggestions.length > 0 && !exactMatch && (
                                <button 
                                onClick={() => setActiveSuggestionId(activeSuggestionId === item.tempId ? null : item.tempId)}
                                className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${activeSuggestionId === item.tempId ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'}`}
                                >
                                {suggestions.length > 1 ? `${suggestions.length} Matches` : 'View Match'}
                                </button>
                            )}
                            </div>
                            
                            {!exactMatch && item.name && item.name.length > 3 && !activeSuggestionId && (
                                <button
                                    onClick={() => handleAIAutoFill(item.tempId, item.name)}
                                    disabled={itemAny.isProcessing}
                                    className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50 group/autofill"
                                >
                                    {itemAny.isProcessing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} className="group-hover/autofill:text-indigo-200" />}
                                    {itemAny.isProcessing ? 'Researching...' : 'AI Autofill Details'}
                                </button>
                            )}

                            {likelyMatch && !activeSuggestionId && (
                            <div className="mt-2 p-2 rounded-xl bg-indigo-900/20 border border-indigo-500/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 group/suggestion">
                                <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                        {likelyMatch.image ? (
                                        <img src={likelyMatch.image} className="w-full h-full object-contain p-0.5 rounded-lg" alt="" />
                                        ) : (
                                        <Database size={14} className="text-indigo-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest leading-none mb-0.5">Likely Match Found</span>
                                        <span className="text-[10px] font-bold text-indigo-100 truncate">{likelyMatch.name}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleApplyMaster(item.tempId, likelyMatch)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-1.5 shrink-0"
                                >
                                    <Check size={10} strokeWidth={4} /> Accept
                                </button>
                            </div>
                            )}
                            
                            {activeSuggestionId === item.tempId && onSuggestMaster && (
                            <>
                                <BulkMatchSuggestions 
                                query={query} 
                                onSuggest={onSuggestMaster} 
                                onSelect={(p) => handleApplyMaster(item.tempId, p)}
                                onClose={() => setActiveSuggestionId(null)}
                                />
                                <div className="fixed inset-0 z-40" onClick={() => setActiveSuggestionId(null)} />
                            </>
                            )}

                            {exactMatch && (
                            <div className="flex items-center justify-between mt-2 px-1 bg-emerald-500/5 rounded-lg py-1 border border-emerald-500/10 group/match">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Master Record Linked</span>
                                </div>
                                {itemAny.originalData && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleUndoMatch(item.tempId); }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[8px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700 opacity-0 group-hover/match:opacity-100"
                                >
                                    <RotateCcw size={8} /> Undo
                                </button>
                                )}
                            </div>
                            )}
                        </div>
                        </td>
                        <td className="px-4 py-6">
                        <div className="flex p-1 rounded-xl bg-slate-950/50 border border-slate-800 w-fit mx-auto">
                            <button 
                            onClick={() => onUpdateRow(item.tempId, { stockType: 'retail' })}
                            className={`p-2 rounded-lg transition-all ${item.stockType !== 'dispensary' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                            title="Retail Stock"
                            >
                            <ShoppingCart size={16} />
                            </button>
                            <button 
                            onClick={() => onUpdateRow(item.tempId, { stockType: 'dispensary' })}
                            className={`p-2 rounded-lg transition-all ${item.stockType === 'dispensary' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                            title="Dispensary Stock"
                            >
                            <Pill size={16} />
                            </button>
                        </div>
                        </td>
                        <td className="px-4 py-6">
                        <div className="flex items-center gap-2">
                            <input 
                            type="text" 
                            value={item.barcode} 
                            onFocus={(e) => { e.target.select(); setActiveSuggestionId(item.tempId); }} 
                            onChange={(e) => onUpdateRow(item.tempId, { barcode: e.target.value })} 
                            className="bg-transparent border-b border-slate-800 focus:border-indigo-500 font-mono text-xs text-white outline-none p-1.5 w-full transition-all" 
                            placeholder="Scan or type..." 
                            />
                            <button onClick={() => onStartScanRow(item.tempId)} className="p-2 rounded-xl bg-slate-800 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shrink-0 shadow-sm"><Camera size={16}/></button>
                        </div>
                        </td>
                        <td className="px-4 py-6">
                        <input 
                            type="text" 
                            value={item.productCode || ''} 
                            onFocus={(e) => { e.target.select(); setActiveSuggestionId(item.tempId); }} 
                            onChange={(e) => onUpdateRow(item.tempId, { productCode: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })} 
                            className="w-full bg-transparent border-b border-slate-800 focus:border-indigo-500 font-mono text-xs text-white outline-none p-1.5 transition-all" 
                            placeholder="PIP / Code..." 
                        />
                        </td>
                        <td className="px-3 py-6 text-center">
                        <input 
                            type="text" 
                            value={item.packSize} 
                            onFocus={(e) => e.target.select()} 
                            onChange={(e) => onUpdateRow(item.tempId, { packSize: e.target.value })} 
                            className="w-full bg-transparent border-b border-slate-800 focus:border-emerald-500 text-center font-black text-[11px] text-white uppercase outline-none p-1.5 transition-all" 
                            placeholder="Unit" 
                        />
                        </td>
                        <td className="px-3 py-6 text-center">
                        <input 
                            type="text" 
                            value={item.priceStr} 
                            onFocus={(e) => e.target.select()} 
                            onChange={(e) => onUpdateRow(item.tempId, { priceStr: e.target.value })} 
                            className="w-full bg-transparent border-b border-slate-800 focus:border-emerald-500 text-center font-black text-sm text-emerald-500 outline-none p-1.5 transition-all" 
                            placeholder="0.00" 
                        />
                        </td>
                        <td className="px-3 py-6 text-center">
                        <input 
                            type="text" 
                            value={item.costPriceStr} 
                            onFocus={(e) => e.target.select()} 
                            onChange={(e) => onUpdateRow(item.tempId, { costPriceStr: e.target.value })} 
                            className="w-full bg-transparent border-b border-slate-800 focus:border-emerald-500 text-center font-bold text-sm text-slate-400 outline-none p-1.5 transition-all" 
                            placeholder="0.00" 
                        />
                        </td>
                        <td className="px-3 py-6 text-center">
                        <input 
                            type="text" 
                            value={item.stockInHandStr} 
                            onFocus={(e) => e.target.select()} 
                            onChange={(e) => onUpdateRow(item.tempId, { stockInHandStr: e.target.value })} 
                            className="w-full bg-transparent border-b border-slate-800 focus:border-emerald-500 text-center font-black text-sm text-white outline-none p-1.5 transition-all" 
                        />
                        </td>
                        <td className="px-4 py-6">
                        <input 
                            type="text" 
                            value={item.location || ''} 
                            onFocus={(e) => e.target.select()} 
                            onChange={(e) => onUpdateRow(item.tempId, { location: e.target.value })} 
                            className="w-full bg-transparent border-b border-slate-800 focus:border-emerald-500 font-bold text-xs text-white uppercase outline-none p-1.5 transition-all" 
                            placeholder="Location..." 
                            list="bulk-locations-list"
                        />
                        </td>
                        <td className="px-4 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                    onClick={() => onToggleStatus(item.tempId)}
                                    className={`p-2.5 rounded-xl transition-all shadow-sm ${
                                        item.status === 'ready' 
                                        ? 'bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/20'
                                        : 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white border border-emerald-500/20'
                                    }`}
                                    title={item.status === 'ready' ? 'Move back to review' : 'Mark ready for import'}
                                >
                                    {item.status === 'ready' ? <RotateCcw size={16} /> : <Check size={16} />}
                                </button>
                                <button onClick={() => onRemoveRow(item.tempId)} className="p-2.5 rounded-xl bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-slate-800"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
          </div>
        </div>
        
        {items.length > 0 && (
          <div className="mt-8 p-6 rounded-[2.5rem] bg-indigo-600/5 border border-indigo-500/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Database size={20} />
               </div>
               <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Master Link Technology</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">Products highlighted in indigo have potential matches in the corporate database.</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Linked & Verified</span>
            </div>
          </div>
        )}
      </div>
      
      {isCameraOpen && (
        <ProductPhotoCapture 
          onCaptured={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
};

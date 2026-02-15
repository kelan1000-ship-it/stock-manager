
import React, { useState, useRef } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, ArrowRight, 
  Database, Package, FileCheck, Info, PlusCircle, RefreshCw, Check,
  Download, FileSpreadsheet, Upload, ArrowUpRight, ArrowDownToLine, 
  FileJson, Trash2, History, DatabaseZap, ListChecks, CheckSquare, Square,
  BarChart3, Settings2, Lock
} from 'lucide-react';
import { InventoryComparisonResult, DEFAULT_HEADERS } from '../utils/inventoryParser';

interface InventoryManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ignoredIndices: Set<number>) => void;
  results: InventoryComparisonResult[];
  onExportExcel: (headers?: string[]) => void;
  onDownloadTemplate: (headers?: string[]) => void;
  onTriggerImport: () => void;
}

/**
 * InventoryManagement - A comprehensive hub for spreadsheet-based stock control.
 * Handles Exporting, Template Downloads (with column selection), and the verification of Imports.
 */
export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  isOpen,
  onClose,
  onConfirm,
  results,
  onExportExcel,
  onDownloadTemplate,
  onTriggerImport
}) => {
  const [ignoredIndices, setIgnoredIndices] = useState<Set<number>>(new Set());
  const [isSelectingColumns, setIsSelectingColumns] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'template' | 'export'>('template');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(DEFAULT_HEADERS));

  if (!isOpen) return null;

  const toggleIgnore = (index: number) => {
    setIgnoredIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleColumn = (col: string) => {
    if (col === 'Product Name' || col === 'Product Group') return; // Name and Product Group are mandatory
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const selectAllColumns = () => setSelectedColumns(new Set(DEFAULT_HEADERS));
  const clearAllColumns = () => setSelectedColumns(new Set(['Product Name', 'Product Group'])); // Keep mandatory selected

  const handleActionWithColumns = () => {
    const columns = Array.from(selectedColumns);
    if (columns.length === 0) {
      alert("Please select at least one column to include.");
      return;
    }
    
    if (selectionMode === 'template') {
      onDownloadTemplate(columns);
    } else {
      onExportExcel(columns);
    }
    
    setIsSelectingColumns(false);
  };

  const startColumnSelection = (mode: 'template' | 'export') => {
    setSelectionMode(mode);
    setIsSelectingColumns(true);
  };

  const hasPendingResults = results.length > 0;
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
              <Database size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                {isSelectingColumns 
                  ? (selectionMode === 'template' ? 'Configure Template' : 'Configure Export Data') 
                  : 'Inventory Management Console'}
              </h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                {isSelectingColumns 
                  ? 'Select which data attributes to include in your worksheet' 
                  : hasPendingResults 
                    ? 'Verifying staged spreadsheet changes' 
                    : 'EXCEL & SPREADSHEET LOGISTICS HUB'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {!isSelectingColumns && hasPendingResults && (
                <div className="px-5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4 animate-in zoom-in duration-300">
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
             )}
             <button 
               onClick={isSelectingColumns ? () => setIsSelectingColumns(false) : onClose} 
               className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
             >
               {isSelectingColumns ? <ArrowRight className="rotate-180" size={20} /> : <X size={20} />}
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-950/20 scrollbar-hide">
          {isSelectingColumns ? (
            /* Template/Export Column Selector View */
            <div className="h-full flex flex-col p-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="max-w-4xl mx-auto w-full space-y-8">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3 text-emerald-400">
                        <ListChecks size={20} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Data Column Visibility</span>
                     </div>
                     <div className="flex gap-4">
                        <button onClick={selectAllColumns} className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors">Select All</button>
                        <button onClick={clearAllColumns} className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-400 transition-colors">Clear All</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {DEFAULT_HEADERS.map(col => {
                        const isSelected = selectedColumns.has(col);
                        const isMandatory = col === 'Product Name' || col === 'Product Group';
                        
                        return (
                          <button 
                            key={col}
                            onClick={() => toggleColumn(col)}
                            disabled={isMandatory}
                            className={`p-6 rounded-[2rem] border text-left transition-all group relative overflow-hidden flex flex-col gap-3 ${
                              isSelected 
                                ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-900/10' 
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                            } ${isMandatory ? 'cursor-default opacity-80' : ''}`}
                          >
                             <div className="flex items-center justify-between">
                                {isMandatory ? (
                                  <Lock className="text-indigo-400" size={20} />
                                ) : isSelected ? (
                                  <CheckSquare className="text-indigo-400" size={20} />
                                ) : (
                                  <Square className="text-slate-700" size={20} />
                                )}
                                {isMandatory && <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Required</span>}
                             </div>
                             <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                {col}
                             </span>
                          </button>
                        );
                     })}
                  </div>

                  <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.03] border border-indigo-500/10 flex items-center gap-6">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        {selectionMode === 'template' ? <ArrowDownToLine size={28} /> : <BarChart3 size={28} />}
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">
                           {selectionMode === 'template' ? 'Ready to Export Worksheet' : 'Ready to Export Stock Data'}
                        </h4>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          You have selected <span className="text-indigo-400">{selectedColumns.size} attributes</span>. The generated file will be formatted as a standard Greenchem .xlsx file.
                        </p>
                     </div>
                     <button 
                        onClick={handleActionWithColumns}
                        disabled={selectedColumns.size === 0}
                        className="ml-auto px-10 py-5 rounded-[1.5rem] bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                     >
                        Download XLSX
                     </button>
                  </div>
               </div>
            </div>
          ) : !hasPendingResults ? (
            /* Home/Dashboard View when no file is being verified */
            <div className="h-full flex flex-col items-center justify-center p-12 gap-10">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                  {/* Export Card */}
                  <button 
                    onClick={() => startColumnSelection('export')}
                    className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group text-left relative overflow-hidden"
                  >
                     <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                        <Download size={32} />
                     </div>
                     <h3 className="text-xl font-black text-white uppercase tracking-tight">EXPORT INVENTORY</h3>
                     <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">Generate a comprehensive .xlsx report of your current site stock, locations, and pricing.</p>
                     <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        RUN CUSTOM REPORT <ArrowUpRight size={14} />
                     </div>
                     <Download className="absolute -right-6 -bottom-6 text-emerald-500/5 rotate-12" size={120} />
                  </button>

                  {/* Template Card */}
                  <button 
                    onClick={() => startColumnSelection('template')}
                    className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all group text-left relative overflow-hidden"
                  >
                     <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                        <ArrowDownToLine size={32} />
                     </div>
                     <h3 className="text-xl font-black text-white uppercase tracking-tight">DOWNLOAD TEMPLATE</h3>
                     <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">Download a blank formatted spreadsheet ready for your bulk data entries and stock updates.</p>
                     <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                        GET BLANK XLSX <ArrowUpRight size={14} />
                     </div>
                     <FileSpreadsheet className="absolute -right-6 -bottom-6 text-blue-500/5 rotate-12" size={120} />
                  </button>

                  {/* Import Card */}
                  <button 
                    onClick={onTriggerImport}
                    className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all group text-left relative overflow-hidden"
                  >
                     <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                     </div>
                     <h3 className="text-xl font-black text-white uppercase tracking-tight">IMPORT SPREADSHEET</h3>
                     <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">Upload a completed template to bulk update stock levels, prices, or add new product listings.</p>
                     <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        SELECT LOCAL FILE <ArrowUpRight size={14} />
                     </div>
                     <Upload className="absolute -right-6 -bottom-6 text-indigo-500/5 rotate-12" size={120} />
                  </button>
               </div>

               <div className="max-w-2xl w-full p-6 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
                  <Info size={20} className="text-slate-600 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SPREADSHEET INTEGRATION NOTE</p>
                     <p className="text-[11px] font-bold text-slate-600 leading-relaxed mt-1">
                        Our import engine performs a non-destructive comparison. You will always have a chance to review and ignore specific changes before they are committed to the live database.
                     </p>
                  </div>
               </div>
            </div>
          ) : (
            /* Verification View */
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
                {results.map((res, idx) => {
                  const isIgnored = ignoredIndices.has(idx);
                  return (
                    <tr key={res.barcode + idx} className={`group transition-all ${isIgnored ? 'opacity-30 grayscale' : res.isNew ? 'bg-emerald-500/[0.02]' : 'bg-amber-500/[0.01] hover:bg-white/[0.02]'}`}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <p className={`text-sm font-black text-white uppercase group-hover:text-indigo-400 transition-colors truncate ${isIgnored ? 'line-through' : ''}`}>{res.name}</p>
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
                          title={isIgnored ? "Include Update" : "Ignore Update"}
                        >
                          {!isIgnored ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions (Only visible during verification) */}
        {hasPendingResults && !isSelectingColumns && (
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
        )}
      </div>
    </div>
  );
};

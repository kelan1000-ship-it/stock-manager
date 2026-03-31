import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Download, Upload, Plus, Globe, ChevronDown, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterProduct, Product } from '../types';
import { researchBarcodeFromWeb } from '../services/geminiService';
import { useSelection } from '../hooks/useSelection';
import { ImportMappingModal } from './DataExchangeModals';
import { ExistingImportProgressModal } from './ExistingImportProgressModal';
import { MasterProductForm } from './MasterProductForm';
import { MasterProductTable } from './MasterProductTable';
import { LocalDuplicatesModal } from './LocalDuplicatesModal';
import { BulkActionToolbar } from './BulkActionToolbar';

import { matchesSearchTerms, matchesAnySearchField } from '../utils/stringUtils';

interface MasterInventoryCatalogueProps {
  isOpen: boolean;
  onClose: () => void;
  masterInventory: MasterProduct[];
  onAddProduct: (p: Omit<MasterProduct, 'id'>) => void;
  onBulkAddMaster: (products: MasterProduct[]) => void;
  upsertBulkMasterProducts: (products: MasterProduct[]) => void;
  updateMasterProduct: (id: string, updates: Partial<MasterProduct>) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteBulk: (ids: Set<string>) => void;
  onExport: () => void;
  theme: string;
}

export const MasterInventoryCatalogue: React.FC<MasterInventoryCatalogueProps> = ({ 
  isOpen, onClose, masterInventory, onAddProduct, onBulkAddMaster, upsertBulkMasterProducts,
  updateMasterProduct, onDeleteProduct, onDeleteBulk, onExport, theme 
}) => {
  const [q, setQ] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'productCode' | 'barcode' | 'supplier'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importState, setImportState] = useState<{ headers: string[], rows: any[] } | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [bulkProcessingInfo, setBulkProcessingInfo] = useState<string | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [existingImportFile, setExistingImportFile] = useState<File | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([{ key: 'name', direction: 'asc' }]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q, searchField, sortConfig]);

  const filtered = useMemo(() => {
    const search = q.toLowerCase().trim();
    let result = [...masterInventory];

    if (search) {
      result = result
        .map(p => {
          let score = 0;
          const barcode = (p.barcode || '').toLowerCase();
          const pip = (p.productCode || '').toLowerCase();
          const name = (p.name || '').toLowerCase();
          const supplier = (p.supplier || '').toLowerCase();

          if (searchField === 'all') {
            if (barcode === search || pip === search) score = 100;
            else if (name.startsWith(search)) score = 80;
            else if (matchesAnySearchField([name], search)) score = 60;
            else if (matchesAnySearchField([barcode, pip], search)) score = 40;
            else if (matchesAnySearchField([name, barcode, pip, supplier], search)) score = 20;
          } else {
            const targetVal = searchField === 'name' ? name : 
                             searchField === 'productCode' ? pip : 
                             searchField === 'barcode' ? barcode :
                             searchField === 'supplier' ? supplier : '';
            
            if (targetVal === search) score = 100;
            else if (targetVal.startsWith(search)) score = 80;
            else if (matchesSearchTerms(targetVal, search)) score = 60;
          }
          
          return { product: p, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);
    }

    // Apply Sorting
    if (sortConfig.length > 0) {
      result.sort((a: any, b: any) => {
        for (const { key, direction } of sortConfig) {
          const valA = a[key] || '';
          const valB = b[key] || '';

          if (typeof valA === 'string' && typeof valB === 'string') {
            const comp = valA.localeCompare(valB);
            if (comp !== 0) return direction === 'asc' ? comp : -comp;
            continue;
          }

          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else if (!search) {
      // Default: Alphabetical sort by Product Name if no sort key is set and no search
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }, [masterInventory, q, searchField, sortConfig]);

  const handleSort = (key: string, multi: boolean) => {
    setSortConfig(prev => {
      const existing = prev.findIndex(c => c.key === key);
      if (multi) {
        if (existing !== -1) {
          if (prev[existing].direction === 'asc') {
            return prev.map((c, i) => i === existing ? { ...c, direction: 'desc' as const } : c);
          } else {
            return prev.filter((_, i) => i !== existing);
          }
        }
        return [...prev, { key, direction: 'asc' as const }];
      }
      if (existing !== -1 && prev.length === 1) {
        return [{ key, direction: prev[existing].direction === 'asc' ? 'desc' as const : 'asc' as const }];
      }
      return [{ key, direction: 'asc' as const }];
    });
  };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, currentPage, pageSize]);

  const { 
    selectedIds, toggleSelection, toggleAll, clearSelection, isAllSelected, selectionCount 
  } = useSelection(filtered);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result as string;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
          if (data.length > 0) setImportState({ headers: Object.keys(data[0]), rows: data });
          else alert("File is empty.");
        } catch (err) { alert("Failed to parse file."); }
      };
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  const handleImportConfirm = (mapping: Record<string, string>) => {
    if (!importState) return;
    const processed: MasterProduct[] = importState.rows.map((row: any, index: number) => ({
      id: `master_${Date.now()}_${index}`,
      name: String(row[mapping.name] || '').trim(),
      subheader: String(row[mapping.subheader] || '').trim(),
      parentGroup: String(row[mapping.parentGroup] || '').trim(),
      packSize: String(row[mapping.packSize] || '').trim(),
      productCode: String(row[mapping.productCode] || '').trim(),
      barcode: String(row[mapping.barcode] || '').trim(),
      price: parseFloat(String(row[mapping.price]).replace(/[^\d.-]/g, '')) || 0,
      costPrice: parseFloat(String(row[mapping.costPrice]).replace(/[^\d.-]/g, '')) || 0,
      image: String(row[mapping.image] || '').trim(),
      supplier: String(row[mapping.supplier] || '').trim()
    })).filter(p => !!p.name);

    if (processed.length > 0) {
      onBulkAddMaster(processed);
      alert(`Imported ${processed.length} items.`);
      setImportState(null);
    } else alert("No valid records found.");
  };

  const handleExistingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExistingImportFile(file);
      setIsProgressModalOpen(true);
    }
    e.target.value = '';
    setIsImportMenuOpen(false);
  };

  const handleBulkResearch = async () => {
    if (selectionCount === 0) return;
    setIsResearching(true);
    const idsToProcess = Array.from(selectedIds).filter(id => filtered.some(f => f.id === id));
    let successCount = 0;

    for (let i = 0; i < idsToProcess.length; i++) {
      const id = idsToProcess[i];
      const p = masterInventory.find(item => item.id === id);
      if (!p) continue;

      setBulkProcessingInfo(`Researching ${i + 1}/${idsToProcess.length}: ${p.name}`);
      try {
        const result = await researchBarcodeFromWeb(p.name, p.packSize, p.productCode || undefined);
        if (result.barcode) {
          updateMasterProduct(id, { barcode: result.barcode });
          successCount++;
        }
      } catch (e) { console.error(e); }
    }
    setIsResearching(false);
    setBulkProcessingInfo(null);
    clearSelection();
    alert(`Found EANs for ${successCount} products.`);
  };

  const handleBulkAssignSupplier = () => {
    const supplier = prompt("Enter Supplier Name to assign to selected products:");
    if (supplier !== null) {
      const idsToProcess = Array.from(selectedIds);
      idsToProcess.forEach(id => {
        updateMasterProduct(id, { supplier });
      });
      clearSelection();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-4 md:p-8 overflow-hidden relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 shrink-0">
           <div className="flex items-center gap-6">
              <button onClick={onClose} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors shadow-lg shrink-0"><X size={24} /></button>
              <div>
                 <h2 className="text-3xl font-black text-white">Master Inventory Catalogue</h2>
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Central Source of Truth</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDuplicateModalOpen(true)}
                className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-amber-500 hover:text-white hover:bg-amber-600 transition-all shadow-lg"
                data-tooltip="Find Duplicate SKU"
              >
                <Layers size={18} />
              </button>
              <button onClick={onExport} className="px-5 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-xs flex items-center gap-2 hover:bg-slate-700 transition-all"><Download size={18} /> Export</button>
              
              <div className="relative">
                <button 
                  onClick={() => setIsImportMenuOpen(!isImportMenuOpen)} 
                  className="px-5 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-xs flex items-center gap-2 hover:bg-slate-700 transition-all"
                >
                  <Upload size={18} /> Import <ChevronDown size={14} className={`transition-transform duration-300 ${isImportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isImportMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-[210] animate-in fade-in slide-in-from-top-2">
                    <button 
                      onClick={() => { document.getElementById('master-import')?.click(); setIsImportMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800"
                    >
                      New
                    </button>
                    <button 
                      onClick={() => { document.getElementById('master-existing-import')?.click(); setIsImportMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      Existing
                    </button>
                  </div>
                )}
              </div>
              <input type="file" id="master-import" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
              <input type="file" id="master-existing-import" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleExistingFileSelect} />
              
              <button onClick={() => { setIsAdding(true); setEditingId(null); }} className="px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40"><Plus size={18} /> Add Entry</button>
           </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 shrink-0">
           <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text" 
                placeholder={`Search ${searchField === 'all' ? 'everything' : searchField === 'productCode' ? 'PIP code' : searchField}...`} 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                className="w-full pl-16 pr-12 py-5 rounded-[2.5rem] bg-slate-900 border border-slate-800 font-bold text-lg outline-none focus:ring-2 ring-emerald-500/50 transition-all shadow-inner text-white" 
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors">
                   <X size={20} />
                </button>
              )}
           </div>
           
           <div className="relative min-w-[200px]">
              <select 
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as any)}
                className="w-full appearance-none pl-6 pr-12 py-5 rounded-[2.5rem] bg-slate-900 border border-slate-800 font-bold text-lg outline-none focus:ring-2 ring-emerald-500/50 transition-all cursor-pointer text-white"
              >
                <option value="all">All Fields</option>
                <option value="name">Product Name</option>
                <option value="productCode">PIP Code</option>
                <option value="barcode">Barcode</option>
                <option value="supplier">Supplier</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col rounded-[2.5rem] border border-slate-800 bg-slate-900/30 shadow-2xl relative mb-4">
           {(isAdding || editingId) ? (
             <MasterProductForm 
                initialData={editingId ? masterInventory.find(p => p.id === editingId) : undefined}
                onSave={(data) => {
                  if (editingId) updateMasterProduct(editingId, data);
                  else onAddProduct(data);
                  setIsAdding(false);
                  setEditingId(null);
                }}
                onCancel={() => { setIsAdding(false); setEditingId(null); }}
                theme={theme}
             />
           ) : (
             <MasterProductTable 
               products={paginatedItems}
               selectedIds={selectedIds}
               onToggleSelection={toggleSelection}
               onToggleAll={toggleAll}
               isAllSelected={isAllSelected}
               onEdit={(p) => setEditingId(p.id)}
               onDelete={onDeleteProduct}
               selectionCount={selectionCount}
               isResearching={isResearching}
               onBulkResearch={handleBulkResearch}
               onBulkAssignSupplier={handleBulkAssignSupplier}
               onBulkDelete={() => { if(window.confirm('Delete selected?')) { onDeleteBulk(selectedIds); clearSelection(); } }}
               onClearSelection={clearSelection}
               sortConfig={sortConfig}
               onSort={handleSort}
             />
           )}

           {bulkProcessingInfo && (
             <div className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-8">
                <div className="max-w-md w-full p-8 rounded-[2.5rem] bg-slate-900 border border-indigo-500/30 shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in duration-300">
                   <Globe size={40} className="text-indigo-400 animate-pulse" />
                   <div className="space-y-2">
                      <h4 className="text-lg font-black text-white">AI Research in Progress</h4>
                      <p className="text-xs text-slate-500 font-bold px-4">{bulkProcessingInfo}</p>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Pagination Footer */}
        {!isAdding && !editingId && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-xl shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rows per page:</span>
                <select 
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                  Page {currentPage} <span className="text-slate-500 mx-1">of</span> {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
        
        {/* Portaled Bulk Action Toolbar */}
        <BulkActionToolbar 
          count={selectionCount}
          onClear={clearSelection}
          onAdjustPrice={() => {}}
          onReceive={() => {}}
          onUpdateIntelligence={(updates) => {}}
          onArchive={() => {}}
          onDelete={() => { if(window.confirm(`Delete ${selectionCount} master records? This cannot be undone.`)) { onDeleteBulk(selectedIds); clearSelection(); } }}
          isMasterView={true}
          onBulkResearch={handleBulkResearch}
          onBulkAssignSupplier={handleBulkAssignSupplier}
          isResearching={isResearching}
        />
      </div>
      
      {importState && <ImportMappingModal headers={importState.headers} previewRows={importState.rows} onConfirm={handleImportConfirm} onClose={() => setImportState(null)} theme={theme} />}
      
      <LocalDuplicatesModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        inventory={masterInventory as unknown as Product[]} // Shape adapter
        onDelete={onDeleteProduct}
        theme={theme as 'dark'}
      />

      <ExistingImportProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => {
          setIsProgressModalOpen(false);
          setExistingImportFile(null);
        }}
        file={existingImportFile}
        masterInventory={masterInventory}
        onComplete={(processed, deletedIds) => {
          if (processed.length > 0) {
            upsertBulkMasterProducts(processed);
          }
          if (deletedIds.size > 0) {
            onDeleteBulk(deletedIds);
          }
          setIsProgressModalOpen(false);
          setExistingImportFile(null);
        }}
      />
    </div>
  );
};

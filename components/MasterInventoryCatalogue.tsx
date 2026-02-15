
import React, { useState, useMemo } from 'react';
import { X, Search, Download, Upload, Plus, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterProduct } from '../types';
import { researchBarcodeFromWeb } from '../services/geminiService';
import { useSelection } from '../hooks/useSelection';
import { ImportMappingModal } from './DataExchangeModals';
import { MasterProductForm } from './MasterProductForm';
import { MasterProductTable } from './MasterProductTable';

interface MasterInventoryCatalogueProps {
  isOpen: boolean;
  onClose: () => void;
  masterInventory: MasterProduct[];
  onAddProduct: (p: Omit<MasterProduct, 'id'>) => void;
  onBulkAddMaster: (products: MasterProduct[]) => void;
  updateMasterProduct: (id: string, updates: Partial<MasterProduct>) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteBulk: (ids: Set<string>) => void;
  onExport: () => void;
  theme: string;
}

export const MasterInventoryCatalogue: React.FC<MasterInventoryCatalogueProps> = ({ 
  isOpen, onClose, masterInventory, onAddProduct, onBulkAddMaster,
  updateMasterProduct, onDeleteProduct, onDeleteBulk, onExport, theme 
}) => {
  const [q, setQ] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importState, setImportState] = useState<{ headers: string[], rows: any[] } | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [bulkProcessingInfo, setBulkProcessingInfo] = useState<string | null>(null);

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

          if (barcode === search || pip === search) score = 100;
          else if (name.startsWith(q)) score = 80;
          else if (name.includes(q)) score = 60;
          else if (barcode.includes(q) || pip.includes(q)) score = 40;
          
          return { product: p, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);
    } else {
      // Default: Alphabetical sort by Product Name
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }, [masterInventory, q]);

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
      packSize: String(row[mapping.packSize] || '').trim(),
      productCode: String(row[mapping.productCode] || '').trim(),
      barcode: String(row[mapping.barcode] || '').trim(),
      price: parseFloat(String(row[mapping.price]).replace(/[^\d.-]/g, '')) || 0,
      costPrice: parseFloat(String(row[mapping.costPrice]).replace(/[^\d.-]/g, '')) || 0,
      image: String(row[mapping.image] || '').trim()
    })).filter(p => !!p.name);

    if (processed.length > 0) {
      onBulkAddMaster(processed);
      alert(`Imported ${processed.length} items.`);
      setImportState(null);
    } else alert("No valid records found.");
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
        const result = await researchBarcodeFromWeb(p.name, p.packSize);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
           <div className="flex items-center gap-6">
              <button onClick={onClose} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors"><X size={24} /></button>
              <div>
                 <h2 className="text-3xl font-black text-white">Master Inventory Catalogue</h2>
                 <p className="text-slate-500 font-bold">Central product database.</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={onExport} className="px-5 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-xs flex items-center gap-2 hover:bg-slate-700 transition-all"><Download size={18} /> Export</button>
              <button onClick={() => document.getElementById('master-import')?.click()} className="px-5 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-xs flex items-center gap-2 hover:bg-slate-700 transition-all"><Upload size={18} /> Import</button>
              <input type="file" id="master-import" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
              <button onClick={() => { setIsAdding(true); setEditingId(null); }} className="px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40"><Plus size={18} /> Add Entry</button>
           </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
           <input type="text" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full pl-16 pr-12 py-5 rounded-[2.5rem] bg-slate-900 border border-slate-800 font-bold text-lg outline-none focus:ring-2 ring-emerald-500/50 transition-all shadow-inner" />
           {q && (
             <button onClick={() => setQ('')} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
             </button>
           )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col rounded-[2.5rem] border border-slate-800 bg-slate-900/30 shadow-2xl relative">
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
               products={filtered}
               selectedIds={selectedIds}
               onToggleSelection={toggleSelection}
               onToggleAll={toggleAll}
               isAllSelected={isAllSelected}
               onEdit={(p) => setEditingId(p.id)}
               onDelete={onDeleteProduct}
               selectionCount={selectionCount}
               isResearching={isResearching}
               onBulkResearch={handleBulkResearch}
               onBulkDelete={() => { if(window.confirm('Delete selected?')) { onDeleteBulk(selectedIds); clearSelection(); } }}
               onClearSelection={clearSelection}
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
      </div>
      {importState && <ImportMappingModal headers={importState.headers} previewRows={importState.rows} onConfirm={handleImportConfirm} onClose={() => setImportState(null)} theme={theme} />}
    </div>
  );
};


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  Table, CheckCircle, Info, Upload, X, Database, RefreshCw, 
  FileDown, Download, FileUp, AlertCircle, Notebook, Archive, Recycle, 
  Settings2, Copy, Activity, Check, Sparkles, Loader2, Save, Trash2,
  Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Product } from '../types';
import { researchProductDetails } from '../services/geminiService';
import { SafeImage } from './SafeImage';

export const ImportMappingModal = ({ 
  headers, 
  previewRows, 
  onConfirm, 
  onClose, 
  theme 
}: { 
  headers: string[], 
  previewRows: any[], 
  onConfirm: (mapping: Record<string, string>) => void, 
  onClose: () => void, 
  theme: string
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '',
    subheader: '',
    parentGroup: '',
    packSize: '',
    productCode: '',
    barcode: '',
    price: '',
    costPrice: '',
    tags: '',
    image: '',
    supplier: ''
  });

  useEffect(() => {
    const newMapping = { ...mapping };
    headers.forEach(h => {
      const lowerH = h.toLowerCase().trim();
      if (lowerH === 'name' || lowerH.includes('product name') || lowerH === 'title') newMapping.name = h;
      else if (lowerH === 'subheader' || lowerH === 'subtitle' || lowerH === 'sub header') newMapping.subheader = h;
      else if (lowerH === 'parent group' || lowerH === 'product group' || lowerH === 'sku group' || lowerH === 'parent sku') newMapping.parentGroup = h;
      else if (lowerH.includes('barcode') || lowerH === 'ean' || lowerH === 'upc' || lowerH === 'gtin') newMapping.barcode = h;
      else if (lowerH === 'pip' || lowerH === 'pip code' || lowerH === 'product code' || lowerH === 'code') newMapping.productCode = h;
      else if (lowerH === 'pack size' || lowerH === 'size' || lowerH === 'quantity per pack') newMapping.packSize = h;
      else if (lowerH === 'rrp' || lowerH === 'price' || lowerH === 'retail price') newMapping.price = h;
      else if (lowerH === 'cost' || lowerH === 'cost price' || lowerH === 'wholesale') newMapping.costPrice = h;
      else if (lowerH === 'tags' || lowerH.includes('category') || lowerH.includes('labels')) newMapping.tags = h;
      else if (lowerH === 'image' || lowerH.includes('image url') || lowerH === 'photo') newMapping.image = h;
      else if (lowerH === 'supplier' || lowerH === 'wholesaler' || lowerH === 'vendor') newMapping.supplier = h;
    });
    setMapping(newMapping);
  }, [headers]);

  const fields = [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'subheader', label: 'Subheader', required: true },
    { key: 'parentGroup', label: 'Product Group', required: true },
    { key: 'packSize', label: 'Pack Size', required: true },
    { key: 'productCode', label: 'Pip / Product Code', required: true },
    { key: 'barcode', label: 'Barcode (EAN)', required: true },
    { key: 'price', label: 'RRP (£)', required: false },
    { key: 'costPrice', label: 'Cost Price (£)', required: false },
    { key: 'supplier', label: 'Supplier', required: false },
    { key: 'tags', label: 'Tags (Comma-separated)', required: false },
    { key: 'image', label: 'Image URL', required: false },
  ];

  const isValid = fields.filter(f => f.required).every(f => mapping[f.key] !== '');

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                 <Table size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black">Map Catalogue Columns</h3>
                 <p className="text-xs text-slate-500 font-bold">Select which file columns match the inventory fields.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
           <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Field Mapping</h4>
              <div className="space-y-3">
                 {fields.map(f => (
                   <div key={f.key} className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-950/30 border border-slate-800">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black">{f.label} {f.required && <span className="text-rose-500">*</span>}</span>
                         {mapping[f.key] && <CheckCircle size={12} className="text-emerald-500" />}
                      </div>
                      <select 
                         value={mapping[f.key]} 
                         onChange={(e) => setMapping({...mapping, [f.key]: e.target.value})}
                         className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold outline-none focus:ring-1 ring-emerald-500"
                      >
                         <option value="">-- Skip Field --</option>
                         {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-6 flex flex-col">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Data Preview (First 3 Rows)</h4>
              <div className="flex-1 overflow-auto rounded-3xl border border-slate-800 bg-slate-950/50 p-2">
                 <table className="w-full text-left text-[10px]">
                    <thead className="border-b border-slate-800">
                       <tr>
                          {headers.slice(0, 4).map(h => <th key={h} className="p-2 text-slate-500 uppercase font-black">{h}</th>)}
                          {headers.length > 4 && <th className="p-2 text-slate-500">...</th>}
                       </tr>
                    </thead>
                    <tbody>
                       {previewRows.slice(0, 3).map((row, idx) => (
                         <tr key={idx} className="border-b border-slate-800/30 last:border-0">
                            {headers.slice(0, 4).map(h => <td key={h} className="p-2 font-bold text-slate-300">{row[h]}</td>)}
                            {headers.length > 4 && <td className="p-2 opacity-30 italic">more</td>}
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              
              <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                 <div className="flex items-center gap-2 text-amber-500">
                    <Info size={16}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Import Notice</span>
                 </div>
                 <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                   Only Product Name is required to create a catalogue entry. Records missing a Product Name will be skipped.
                 </p>
              </div>

              <div className="mt-auto flex gap-3 pt-6">
                 <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-800 font-black text-xs uppercase hover:bg-slate-700 transition-colors">Discard</button>
                 <button 
                    disabled={!isValid} 
                    onClick={() => onConfirm(mapping)}
                    className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-30 flex items-center justify-center gap-2"
                 >
                    <Upload size={16}/> Process Import
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

interface ManageDataDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark';
  onExportExcel: () => void;
  onImportExcel: () => void;
  onDownloadTemplate: () => void;
  onViewArchive: () => void;
  onViewBin: () => void;
  onSystemBackup: () => void;
  onSystemRestore: () => void;
  onClearData: () => void;
  onViewMaster: () => void;
  onViewReconciliation: () => void;
  onOpenManagement: () => void;
  onFindDuplicates: () => void;
  onViewMissingAttributes: () => void;
  onRunDiagnostics?: () => void;
}

export const ManageDataDropdown = ({ 
  isOpen, 
  onClose, 
  theme, 
  onExportExcel, 
  onImportExcel, 
  onDownloadTemplate,
  onViewArchive,
  onViewBin,
  onSystemBackup,
  onSystemRestore,
  onClearData,
  onViewMaster,
  onViewReconciliation,
  onOpenManagement,
  onFindDuplicates,
  onViewMissingAttributes,
  onRunDiagnostics
}: ManageDataDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) onClose(); 
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const MenuItem = ({ icon: Icon, label, onClick, danger, sub, colorClass }: { icon: React.ElementType; label: string; onClick?: () => void; danger?: boolean; sub?: string; colorClass?: string }) => (
    <button 
      onClick={() => { onClick && onClick(); onClose(); }} 
      className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all group ${
        danger 
          ? 'text-rose-500 hover:bg-rose-500/10' 
          : theme === 'dark' 
            ? `text-slate-200 hover:bg-${colorClass || 'slate'}-500/10` 
            : `text-slate-700 hover:bg-${colorClass || 'slate'}-50`
      }`}
    >
      <div className={`p-2 rounded-xl transition-colors ${
        danger 
          ? 'bg-rose-500/10 text-rose-500' 
          : `bg-${colorClass || 'slate'}-500/10 text-${colorClass || 'slate'}-400 group-hover:bg-${colorClass || 'slate'}-500/20 group-hover:text-${colorClass || 'slate'}-300`
      }`}>
        <Icon size={16} />
      </div>
      <div className="flex flex-col">
        <span className={`transition-colors ${danger ? 'text-rose-500' : `group-hover:text-${colorClass || 'slate'}-300`}`}>{label}</span>
        {sub && <span className="text-[9px] font-medium opacity-50 -mt-0.5">{sub}</span>}
      </div>
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`absolute left-0 md:left-auto md:right-0 mt-2 w-[280px] xs:w-80 sm:w-80 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border z-[100] p-4 animate-in fade-in zoom-in duration-200 overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        
        <div className="p-2">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-4 mb-2">Primary Management</p>
          <div className="space-y-0.5">
            <MenuItem icon={Settings2} label="Management Console" sub="Export, Template & Import Hub" onClick={onOpenManagement} colorClass="emerald" />
            <MenuItem icon={Notebook} label="Master Inventory Catalogue" sub="Central product database" onClick={onViewMaster} colorClass="indigo" />
            <MenuItem icon={RefreshCw} label="Reconciliation" sub="Compare Branch vs Master" onClick={onViewReconciliation} colorClass="amber" />
            <MenuItem icon={Activity} label="Missing Attributes" sub="Report & Fix incomplete items" onClick={onViewMissingAttributes} colorClass="violet" />
            <MenuItem icon={Copy} label="Find Duplicate SKUs" sub="Scan for conflicting inventory" onClick={onFindDuplicates} colorClass="rose" />
          </div>
        </div>

        <div className="h-px bg-slate-800/50 my-2 mx-4" />

        <div className="p-2">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-4 mb-2">Navigation</p>
          <div className="space-y-0.5">
            <MenuItem icon={Archive} label="View Archive" sub="Manage hidden/seasonal items" onClick={onViewArchive} colorClass="amber" />
            <MenuItem icon={Recycle} label="View Recycle Bin" sub="Recently deleted products" onClick={onViewBin} colorClass="rose" />
          </div>
        </div>

        <div className="h-px bg-slate-800/50 my-2 mx-4" />

        <div className="p-2">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-4 mb-2">System Control</p>
          <div className="space-y-0.5">
            <MenuItem icon={Activity} label="Run Stock Diagnostics" sub="Verify logic & data integrity" onClick={onRunDiagnostics} colorClass="violet" />
            <MenuItem icon={Database} label="System Backup" sub="Full database export (.json)" onClick={onSystemBackup} colorClass="blue" />
            <MenuItem icon={RefreshCw} label="Restore System" sub="Wipe & restore from .json" onClick={onSystemRestore} colorClass="emerald" />
          </div>
        </div>

      </div>
    </div>
  );
};

interface MissingAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateProducts: (updates: Record<string, Partial<Product>>) => void;
  theme: 'dark';
  currentBranch: BranchKey;
}

export const MissingAttributesModal: React.FC<MissingAttributesModalProps> = ({
  isOpen,
  onClose,
  onUpdateProducts,
  theme,
  currentBranch
}) => {
  const inventory = useSelector((state: any) => 
    (currentBranch === 'bywood' ? state.stock.bywood : state.stock.broom) || []
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<Product>>>({});
  const [discoveryResults, setDiscoveryResults] = useState<Record<string, any>>({});
  const [isAILoading, setIsAILoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'missing' | 'ignored'>('missing');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { itemsWithMissingData, itemsIgnored } = useMemo(() => {
    const missing = inventory.filter(item => 
      !item.deletedAt && !item.ignoreAttributeReport && (
        !item.barcode || 
        !item.productCode || 
        !item.packSize || 
        !item.price || 
        item.price === 0
      )
    );
    const ignored = inventory.filter(item => 
      !item.deletedAt && item.ignoreAttributeReport
    );
    return { itemsWithMissingData: missing, itemsIgnored: ignored };
  }, [inventory]);

  const displayedItems = activeTab === 'missing' ? itemsWithMissingData : itemsIgnored;
  const totalPages = Math.ceil(displayedItems.length / pageSize);
  const paginatedItems = displayedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setPendingUpdates({});
      setDiscoveryResults({});
      setIsAILoading({});
      setActiveTab('missing');
      setCurrentPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const visibleIds = paginatedItems.map(i => i.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    
    if (allVisibleSelected) {
      // If everything visible is already selected, clear the selection entirely
      setSelectedIds(new Set());
    } else {
      // Set the selection to ONLY include what is currently visible
      setSelectedIds(new Set(visibleIds));
    }
  };

  const handleIgnoreItem = (id: string, ignore: boolean) => {
    onUpdateProducts([{ id, updates: { ignoreAttributeReport: ignore } }]);
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  const handleAIAutoPopulate = async () => {
    if (selectedIds.size === 0) return;
    
    const idsToProcess = Array.from(selectedIds).filter(id => !isAILoading[id]);
    if (idsToProcess.length === 0) return;

    setIsAILoading(prev => {
        const next = { ...prev };
        idsToProcess.forEach((id: string) => next[id] = true);
        return next;
    });

    await Promise.all(idsToProcess.map(async (id) => {
      const item = inventory.find(i => i.id === id);
      if (!item) return;

      try {
        const result = await researchProductDetails(item.name, {
          barcode: item.barcode || undefined,
          productCode: item.productCode || undefined,
          packSize: item.packSize || undefined,
          supplier: item.supplier || undefined,
          price: item.price || undefined
        });

        setDiscoveryResults(prev => ({ ...prev, [id as string]: result }));

        const updates: Partial<Product> = {};
        const pickVal = (val: any) => Array.isArray(val) ? (val.length === 1 ? val[0] : undefined) : val;

        if (!item.barcode && result.barcode) updates.barcode = pickVal(result.barcode);
        if (!item.productCode && result.productCode) updates.productCode = pickVal(result.productCode);
        if (!item.packSize && result.packSize) updates.packSize = pickVal(result.packSize);
        if ((!item.price || item.price === 0) && result.price) {
          const p = pickVal(result.price);
          if (p) updates.price = typeof p === 'string' ? parseFloat(p) : p;
        }

        if (Object.keys(updates).length > 0) {
            setPendingUpdates(prev => ({
              ...prev,
              [id as string]: { ...prev[id as string], ...updates }
            }));
        }
      } catch (err) {
        console.error(`AI population failed for ${item.name}:`, err);
      } finally {
        setIsAILoading(prev => {
            const next = { ...prev };
            delete next[id as string];
            return next;
        });
      }
    }));
  };

  const handleAcceptItem = (id: string) => {
    const updates = pendingUpdates[id];
    if (!updates) return;
    onUpdateProducts([{ id, updates }]);
    setPendingUpdates(prev => {
      const next = { ...prev };
      delete next[id as string];
      return next;
    });
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
  };

  const handleSaveChanges = () => {
    const updatesToCommit = Object.entries(pendingUpdates).map(([id, updates]) => ({
      id,
      updates
    }));
    if (updatesToCommit.length > 0) {
      onUpdateProducts(updatesToCommit);
    }
    setPendingUpdates({});
    setSelectedIds(new Set());
    onClose();
  };

  const discardPending = (id: string) => {
    setPendingUpdates(prev => {
      const next = { ...prev };
      delete next[id as string];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-4 md:p-8 overflow-hidden text-white font-sans">
        
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 shadow-lg"><X size={24} className="text-slate-400" /></button>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Missing Attributes Report</h2>
              <div className="flex items-center gap-3 mt-1">
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Found {itemsWithMissingData.length} items with incomplete data fields</p>
                 {itemsIgnored.length > 0 && (
                   <>
                     <div className="h-3 w-px bg-slate-800" />
                     <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">{itemsIgnored.length} items ignored</p>
                   </>
                 )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'missing' && (
              <button 
                onClick={handleAIAutoPopulate}
                disabled={selectedIds.size === 0 || Object.keys(isAILoading).length > 0}
                className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-30"
              >
                {Object.keys(isAILoading).length > 0 ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                AI Auto-Populate ({selectedIds.size})
              </button>
            )}
            <button 
              onClick={handleSaveChanges}
              disabled={Object.keys(pendingUpdates).length === 0}
              className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-30"
            >
              <Save size={18} /> Save All Changes
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 shrink-0">
           <button 
             onClick={() => setActiveTab('missing')}
             className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'missing' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
           >
             <Activity size={14} /> Missing Attributes ({itemsWithMissingData.length})
           </button>
           <button 
             onClick={() => setActiveTab('ignored')}
             className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'ignored' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'}`}
           >
             <EyeOff size={14} /> Ignored Items ({itemsIgnored.length})
           </button>
        </div>

        <div className="flex-1 overflow-hidden rounded-[3rem] border border-slate-800 bg-slate-900/30 shadow-2xl flex flex-col">
          <div className="overflow-auto flex-1 scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 bg-slate-900 z-50 shadow-xl">
                <tr>
                  <th className="px-6 py-6 w-16">
                    <button onClick={toggleSelectAll} className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id)) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-950 border-slate-700'}`}>
                      {paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id)) && <Check size={12} className="text-slate-950" strokeWidth={4} />}
                    </button>
                  </th>
                  <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Product Name</th>
                  <th className="px-6 py-6 w-48 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">Barcode</th>
                  <th className="px-6 py-6 w-40 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800">PIP Code</th>
                  <th className="px-6 py-6 w-32 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">Pack Size</th>
                  <th className="px-6 py-6 w-32 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 text-center">RRP (£)</th>
                  <th className="px-6 py-6 w-32 text-right border-b border-slate-800 pr-10">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-600">
                        <CheckCircle size={48} className="text-emerald-500/20" />
                        <p className="font-black uppercase tracking-widest text-sm">
                           {activeTab === 'missing' ? 'No Missing Attributes Found' : 'No Ignored Items'}
                        </p>
                        <p className="text-xs font-bold">
                           {activeTab === 'missing' ? 'Your inventory data is complete.' : 'Items you move to ignored will appear here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedItems.map((item) => {
                  const updates = pendingUpdates[item.id];
                  const isLoading = isAILoading[item.id];
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr key={item.id} className={`group transition-all ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'} ${updates ? 'bg-emerald-500/[0.03]' : ''}`}>
                      <td className="px-6 py-6">
                        <button onClick={() => toggleSelect(item.id)} className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-950 border-slate-800 group-hover:border-slate-600'}`}>
                          {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                        </button>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-800 shadow-sm flex items-center justify-center">
                            {item.productImage ? <SafeImage src={item.productImage} alt="" className="w-full h-full object-contain p-1" /> : <div className="text-slate-300 font-black text-[10px]">IMG</div>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate uppercase" style={{ fontSize: 'var(--product-title-size, 12px)' }}>{item.name}</p>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5 truncate">{item.supplier || 'No Supplier'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1 items-start">
                          <p className={`text-[10px] font-mono ${item.barcode ? 'text-slate-400' : 'text-rose-500 font-black'}`}>{item.barcode || 'MISSING'}</p>
                          {updates?.barcode && <p className="text-[10px] font-mono text-emerald-400 font-black animate-pulse flex items-center gap-1"><Sparkles size={10}/> {updates.barcode}</p>}
                          {discoveryResults[item.id]?.barcode && Array.isArray(discoveryResults[item.id].barcode) && discoveryResults[item.id].barcode.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                               {discoveryResults[item.id].barcode.map((val: string) => (
                                 <button 
                                   key={val} 
                                   onClick={() => setPendingUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], barcode: val } }))}
                                   className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${updates?.barcode === val ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                 >
                                   {val}
                                 </button>
                               ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1 items-start">
                          <p className={`text-[10px] font-mono ${item.productCode ? 'text-slate-400' : 'text-rose-500 font-black'}`}>{item.productCode || 'MISSING'}</p>
                          {updates?.productCode && <p className="text-[10px] font-mono text-emerald-400 font-black animate-pulse flex items-center gap-1"><Sparkles size={10}/> {updates.productCode}</p>}
                          {discoveryResults[item.id]?.productCode && Array.isArray(discoveryResults[item.id].productCode) && discoveryResults[item.id].productCode.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                               {discoveryResults[item.id].productCode.map((val: string) => (
                                 <button 
                                   key={val} 
                                   onClick={() => setPendingUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], productCode: val } }))}
                                   className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${updates?.productCode === val ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                 >
                                   {val}
                                 </button>
                               ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <p className={`text-[10px] italic ${item.packSize ? 'text-white' : 'text-rose-500 font-black'}`}>{item.packSize || 'MISSING'}</p>
                          {updates?.packSize && <p className="text-[10px] italic text-emerald-400 animate-pulse">{updates.packSize}</p>}
                          {discoveryResults[item.id]?.packSize && Array.isArray(discoveryResults[item.id].packSize) && discoveryResults[item.id].packSize.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-1 justify-center">
                               {discoveryResults[item.id].packSize.map((val: string) => (
                                 <button 
                                   key={val} 
                                   onClick={() => setPendingUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], packSize: val } }))}
                                   className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${updates?.packSize === val ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                 >
                                   {val}
                                 </button>
                               ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <p className={`text-xs font-black ${item.price > 0 ? 'text-white' : 'text-rose-500'}`}>{item.price > 0 ? `£${item.price.toFixed(2)}` : 'MISSING'}</p>
                          {updates?.price && <p className="text-xs font-black text-emerald-400 animate-pulse">£{updates.price.toFixed(2)}</p>}
                          {discoveryResults[item.id]?.price && Array.isArray(discoveryResults[item.id].price) && discoveryResults[item.id].price.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-1 justify-center">
                               {discoveryResults[item.id].price.map((val: number) => (
                                 <button 
                                   key={val} 
                                   onClick={() => setPendingUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], price: val } }))}
                                   className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${updates?.price === val ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                 >
                                   £{val.toFixed(2)}
                                 </button>
                               ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right pr-10">
                        <div className="flex items-center justify-end gap-2">
                          {isLoading ? (
                            <Loader2 size={18} className="animate-spin text-indigo-400" />
                          ) : updates ? (
                            <>
                              <button onClick={() => handleAcceptItem(item.id)} className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg" data-tooltip="Accept & Apply Locally"><Check size={14}/></button>
                              <button onClick={() => discardPending(item.id)} className="p-2 rounded-xl bg-slate-800 text-slate-500 hover:text-rose-500 transition-all border border-slate-700" data-tooltip="Discard"><Trash2 size={14}/></button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => handleIgnoreItem(item.id, activeTab === 'missing')}
                                 className="p-2 rounded-xl bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                                 data-tooltip={activeTab === 'missing' ? 'Move to ignored' : 'Restore to report'}
                               >
                                 {activeTab === 'missing' ? <EyeOff size={14} /> : <Eye size={14} />}
                               </button>
                               <div className="w-6 h-6 rounded-full border border-slate-800 border-dashed" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {displayedItems.length > 0 && (
            <div className="px-8 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, displayedItems.length)} of {displayedItems.length} items
                 </p>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Rows:</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black rounded-lg px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
                    >
                      {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                 </div>
               </div>
               
               {totalPages > 1 && (
                 <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                       {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                         <button
                           key={page}
                           onClick={() => setCurrentPage(page)}
                           className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}
                         >
                           {page}
                         </button>
                       ))}
                    </div>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                 </div>
               )}
            </div>
          )}
        </div>
        
        <div className="mt-8 p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Sparkles size={20} />
             </div>
             <div>
                <p className="text-xs font-black text-white uppercase tracking-widest">AI Attribute Discovery</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Gemini will only populate fields that are currently empty. It uses the product name for research.</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Missing Required Field</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">AI Suggested Value</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


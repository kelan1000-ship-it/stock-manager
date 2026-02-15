
import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, CheckCircle, Info, Upload, X, Database, RefreshCw, 
  FileDown, Download, FileUp, AlertCircle, Notebook, Archive, Recycle, 
  Settings2, Copy
} from 'lucide-react';

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
    packSize: '',
    productCode: '',
    barcode: '',
    price: '',
    costPrice: '',
    tags: '',
    image: ''
  });

  useEffect(() => {
    const newMapping = { ...mapping };
    headers.forEach(h => {
      const lowerH = h.toLowerCase().trim();
      if (lowerH === 'name' || lowerH.includes('product name') || lowerH === 'title') newMapping.name = h;
      else if (lowerH.includes('barcode') || lowerH === 'ean' || lowerH === 'upc' || lowerH === 'gtin') newMapping.barcode = h;
      else if (lowerH === 'pip' || lowerH === 'pip code' || lowerH === 'product code' || lowerH === 'code') newMapping.productCode = h;
      else if (lowerH === 'pack size' || lowerH === 'size' || lowerH === 'quantity per pack') newMapping.packSize = h;
      else if (lowerH === 'rrp' || lowerH === 'price' || lowerH === 'retail price') newMapping.price = h;
      else if (lowerH === 'cost' || lowerH === 'cost price' || lowerH === 'wholesale') newMapping.costPrice = h;
      else if (lowerH === 'tags' || lowerH.includes('category') || lowerH.includes('labels')) newMapping.tags = h;
      else if (lowerH === 'image' || lowerH.includes('image url') || lowerH === 'photo') newMapping.image = h;
    });
    setMapping(newMapping);
  }, [headers]);

  const fields = [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'packSize', label: 'Pack Size', required: false },
    { key: 'productCode', label: 'Pip / Product Code', required: false },
    { key: 'barcode', label: 'Barcode (EAN)', required: false },
    { key: 'price', label: 'RRP (£)', required: false },
    { key: 'costPrice', label: 'Cost Price (£)', required: false },
    { key: 'tags', label: 'Tags (Comma-separated)', required: false },
    { key: 'image', label: 'Image URL', required: false },
  ];

  const isValid = mapping.name !== '';

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
  onFindDuplicates
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
            <MenuItem icon={Database} label="System Backup" sub="Full database export (.json)" onClick={onSystemBackup} colorClass="blue" />
            <MenuItem icon={RefreshCw} label="Restore System" sub="Wipe & restore from .json" onClick={onSystemRestore} colorClass="emerald" />
          </div>
        </div>

      </div>
    </div>
  );
};

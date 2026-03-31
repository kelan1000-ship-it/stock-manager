
import React from 'react';
import { Square, CheckSquare, Tag, Hash, Edit3, Trash2, BookOpen, Loader2, Globe, X, Truck } from 'lucide-react';
import { MasterProduct } from '../types';
import { ProductThumbnail } from './ImageComponents';
import { SortHeader } from './SharedUI';

interface MasterProductTableProps {
  products: MasterProduct[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: (specificIds?: string[]) => void;
  isAllSelected: boolean;
  onEdit: (p: MasterProduct) => void;
  onDelete: (id: string) => void;
  
  // Bulk Actions
  selectionCount: number;
  isResearching: boolean;
  onBulkResearch: () => void;
  onBulkDelete: () => void;
  onBulkAssignSupplier: () => void;
  onClearSelection: () => void;

  // Sorting
  sortConfig: { key: string; direction: 'asc' | 'desc' }[];
  onSort: (key: string, multi: boolean) => void;
}

export const MasterProductTable: React.FC<MasterProductTableProps> = ({
  products, selectedIds, onToggleSelection, onToggleAll, isAllSelected,
  onEdit, onDelete, selectionCount, isResearching, onBulkResearch, onBulkDelete, onBulkAssignSupplier, onClearSelection,
  sortConfig, onSort
}) => {
  const inViewIds = products.map(p => p.id);
  const isAllPageSelected = inViewIds.length > 0 && inViewIds.every(id => selectedIds.has(id));

  const handleToggleAll = () => {
    if (inViewIds.length > 0) onToggleAll(inViewIds);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-950/20 relative">
        <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 z-10 shadow-lg">
                <tr>
                <th className="p-5 w-12 border-b border-slate-800">
                    <button onClick={handleToggleAll} className="text-slate-500 hover:text-emerald-500 transition-colors">
                    {isAllPageSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                    </button>
                </th>
                <SortHeader label="Product Identity" sortKey="name" config={sortConfig} onSort={onSort} />
                <SortHeader label="Pack Size" sortKey="packSize" config={sortConfig} onSort={onSort} align="center" />
                <SortHeader label="Pip / Product Code" sortKey="productCode" config={sortConfig} onSort={onSort} />
                <SortHeader label="Barcode (EAN)" sortKey="barcode" config={sortConfig} onSort={onSort} />
                <SortHeader label="Supplier" sortKey="supplier" config={sortConfig} onSort={onSort} />
                <SortHeader label="RRP" sortKey="price" config={sortConfig} onSort={onSort} align="center" />
                <SortHeader label="Cost Price" sortKey="costPrice" config={sortConfig} onSort={onSort} align="center" />
                <th className="p-5 text-right border-b border-slate-800">
                    <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider">Actions</span>
                </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
                {products.length === 0 ? (
                <tr>
                    <td colSpan={9} className="py-40 text-center opacity-30">
                    <div className="flex flex-col items-center gap-4">
                        <BookOpen size={64} className="text-slate-600" />
                        <p className="font-black uppercase text-sm tracking-widest text-slate-500">No matching catalogue records</p>
                    </div>
                    </td>
                </tr>
                ) : products.map(p => (
                <tr key={p.id} className={`group transition-all border-b border-slate-800/50 hover:bg-slate-800/30 ${selectedIds.has(p.id) ? 'bg-emerald-600/5' : ''}`}>
                    <td className="p-5">
                    <button onClick={() => onToggleSelection(p.id)} className={`transition-colors ${selectedIds.has(p.id) ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
                        {selectedIds.has(p.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    </td>
                    <td className="p-5">
                    <div className="flex items-center gap-3">
                        <ProductThumbnail src={p.image} alt={p.name} stockType="retail" onClick={() => p.image && window.open(p.image, '_blank')} />
                        <p className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors capitalize">{p.name || 'Untitled'}</p>
                        {p.subheader && <p className="text-xs italic text-slate-400 truncate">{p.subheader}</p>}
                    </div>
                    </td>
                    <td className="p-5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-[10px] italic uppercase text-slate-400 border border-slate-800 group-hover:border-slate-700 transition-colors whitespace-nowrap">
                        {p.packSize || '-'}
                    </span>
                    </td>
                    <td className="p-5">
                    <div className="flex items-center gap-2">
                        <Tag size={12} className="text-slate-600" />
                        <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-slate-300 transition-colors">{p.productCode || '-'}</span>
                    </div>
                    </td>
                    <td className="p-5">
                    <div className="flex items-center gap-2">
                        <Hash size={12} className="text-slate-600" />
                        <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{p.barcode || '-'}</span>
                    </div>
                    </td>
                    <td className="p-5">
                      <span className="text-[11px] font-bold text-slate-400">{p.supplier || 'no set supplier'}</span>
                    </td>
                    <td className="p-5 text-center">
                    <span className="text-sm font-black text-emerald-500">£{(p.price || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-5 text-center">
                    <span className="text-sm font-black text-slate-400">£{(p.costPrice || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => onEdit(p)} className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Edit3 size={16}/>
                        </button>
                        <button onClick={() => onDelete(p.id)} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-indigo-500/20 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16}/>
                        </button>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>

    </div>
  );
};

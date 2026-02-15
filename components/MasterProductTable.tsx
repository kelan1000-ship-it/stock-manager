
import React from 'react';
import { Square, CheckSquare, Tag, Hash, Edit3, Trash2, BookOpen, Loader2, Globe, X } from 'lucide-react';
import { MasterProduct } from '../types';
import { ProductThumbnail } from './ImageComponents';

interface MasterProductTableProps {
  products: MasterProduct[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  isAllSelected: boolean;
  onEdit: (p: MasterProduct) => void;
  onDelete: (id: string) => void;
  
  // Bulk Actions
  selectionCount: number;
  isResearching: boolean;
  onBulkResearch: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const MasterProductTable: React.FC<MasterProductTableProps> = ({
  products, selectedIds, onToggleSelection, onToggleAll, isAllSelected,
  onEdit, onDelete, selectionCount, isResearching, onBulkResearch, onBulkDelete, onClearSelection
}) => {
  return (
    <div className="flex-1 overflow-auto bg-slate-950/20 relative">
        <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 z-10 shadow-lg">
                <tr>
                <th className="p-5 w-12 border-b border-slate-800">
                    <button onClick={onToggleAll} className="text-slate-500 hover:text-emerald-500 transition-colors">
                    {isAllSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                    </button>
                </th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-800">Product Identity</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-800 text-center min-w-[100px] whitespace-nowrap">Pack Size</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-800">Pip / Product Code</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-800">Barcode (EAN)</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-800 text-center">RRP</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-800 text-center">Cost Price</th>
                <th className="p-5 text-right border-b border-slate-800">
                    <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider">Actions</span>
                </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
                {products.length === 0 ? (
                <tr>
                    <td colSpan={8} className="py-40 text-center opacity-30">
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
                        <ProductThumbnail src={p.image} alt={p.name} onClick={() => p.image && window.open(p.image, '_blank')} />
                        <p className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors capitalize">{p.name || 'Untitled'}</p>
                    </div>
                    </td>
                    <td className="p-5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-[10px] font-black uppercase text-slate-400 border border-slate-800 group-hover:border-slate-700 transition-colors whitespace-nowrap">
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
                    <td className="p-5 text-center">
                    <span className="text-sm font-black text-emerald-500">£{p.price?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="p-5 text-center">
                    <span className="text-sm font-black text-slate-400">£{p.costPrice?.toFixed(2) || '0.00'}</span>
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

        {/* Bulk Actions Toolbar */}
        {selectionCount > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-2 flex items-center gap-4 backdrop-blur-xl">
                <div className="px-6 py-3 bg-emerald-600/10 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                    <span className="text-sm font-black text-emerald-500">{selectionCount}</span>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Items Selected</span>
                </div>
                <div className="flex items-center gap-2 pr-2">
                    <button 
                    onClick={onBulkResearch} 
                    disabled={isResearching}
                    className={`px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/40 disabled:opacity-50`}
                    >
                    {isResearching ? <Loader2 className="animate-spin" size={14} /> : <Globe size={14} />}
                    Research Selected (AI)
                    </button>
                    <button 
                    onClick={onBulkDelete}
                    disabled={isResearching}
                    className="px-6 py-3 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all flex items-center gap-2 shadow-lg shadow-rose-900/40 disabled:opacity-50"
                    >
                    <Trash2 size={14} /> Delete Selected
                    </button>
                    <button 
                    onClick={onClearSelection}
                    disabled={isResearching}
                    className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-all"
                    >
                    <X size={18} />
                    </button>
                </div>
            </div>
            </div>
        )}
    </div>
  );
};

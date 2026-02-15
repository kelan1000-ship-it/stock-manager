
import React, { useMemo } from 'react';
import { X, AlertTriangle, Trash2, Package, Copy, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';

interface LocalDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Product[];
  onDelete: (id: string) => void;
  theme: 'dark' | 'light';
}

export const LocalDuplicatesModal: React.FC<LocalDuplicatesModalProps> = ({ isOpen, onClose, inventory, onDelete, theme }) => {
  const duplicates = useMemo(() => {
    const groups: { type: string; key: string; items: Product[] }[] = [];
    const seenIds = new Set<string>();

    // Helper to add groups
    const addGroup = (type: string, key: string, items: Product[]) => {
      // Filter out items already in a duplicate group to avoid double listing
      // Actually, listing them again might be useful if the grouping logic is different, 
      // but typically we want to process unique sets.
      // Let's just list them.
      if (items.length > 1) {
        groups.push({ type, key, items });
      }
    };

    // Group by Barcode
    const byBarcode: Record<string, Product[]> = {};
    inventory.forEach(p => {
      if (p.deletedAt || p.isArchived) return;
      if (p.barcode) {
        const b = p.barcode.trim();
        if (!byBarcode[b]) byBarcode[b] = [];
        byBarcode[b].push(p);
      }
    });
    Object.entries(byBarcode).forEach(([k, v]) => addGroup('Barcode', k, v));

    // Group by Product Code (PIP)
    const byPip: Record<string, Product[]> = {};
    inventory.forEach(p => {
      if (p.deletedAt || p.isArchived) return;
      if (p.productCode) {
        const c = p.productCode.trim().toLowerCase();
        if (!byPip[c]) byPip[c] = [];
        // Only add if not already grouped by barcode (heuristic to reduce noise)
        // Check if these items are already in a barcode group together?
        // Simple approach: Just add all groups. User can decide.
        byPip[c].push(p);
      }
    });
    Object.entries(byPip).forEach(([k, v]) => {
        // Filter out groups that are identical to an existing barcode group
        const groupIds = v.map(i => i.id).sort().join(',');
        const exists = groups.some(g => g.items.map(i => i.id).sort().join(',') === groupIds);
        if (!exists) addGroup('PIP Code', k.toUpperCase(), v);
    });

    return groups;
  }, [inventory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-4xl h-full max-h-[85vh] rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        
        <div className="p-8 border-b border-slate-800/50 flex items-center justify-between shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
              <Copy size={32} />
            </div>
            <div>
              <h2 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Duplicate Resolver</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                {duplicates.length} Conflict Groups Found
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide bg-slate-950/20">
          {duplicates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <CheckCircle2 size={64} className="text-emerald-500 mb-6" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">No duplicate SKUs detected</p>
              <p className="text-xs font-bold text-slate-600 mt-2">Your inventory identifiers appear unique.</p>
            </div>
          ) : (
            duplicates.map((group, idx) => (
              <div key={idx} className="p-6 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-lg">
                <div className="flex items-center gap-3 mb-6 px-2">
                  <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                    Conflict: {group.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">{group.key}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map(item => (
                    <div key={item.id} className="p-4 rounded-3xl bg-slate-950 border border-slate-800 flex items-center gap-4 relative group hover:border-slate-700 transition-all">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0 overflow-hidden">
                        {item.productImage ? (
                            <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Package size={24} className="text-slate-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white capitalize truncate">{item.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase">
                           <span>{item.packSize}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-700" />
                           <span className="text-emerald-500">Stock: {item.stockInHand}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-700" />
                           <span>£{item.price.toFixed(2)}</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-600 mt-1 truncate">ID: {item.id}</div>
                      </div>
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="p-3 rounded-2xl bg-slate-900 text-slate-500 hover:bg-rose-600 hover:text-white transition-all border border-slate-800 group-hover:border-slate-700"
                        title="Remove this duplicate"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 text-center">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
             Review carefully. Deleting items sends them to the Recycle Bin.
           </p>
        </div>
      </div>
    </div>
  );
};

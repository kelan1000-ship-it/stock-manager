
import React, { useMemo, useState } from 'react';
import { Layers, Box, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Product } from '../types';
import { ProductThumbnail } from './ImageComponents';

interface ParentGroupSummaryProps {
  items: Product[];
}

interface GroupSummary {
  name: string;
  totalStock: number;
  totalValue: number;
  itemCount: number;
  products: Product[];
}

export const ParentGroupSummary: React.FC<ParentGroupSummaryProps> = ({ items }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const groups = useMemo(() => {
    const groupMap: Record<string, GroupSummary> = {};

    items.forEach(item => {
      if (!item.parentGroup || item.parentGroup.trim() === '') return;
      
      const groupName = item.parentGroup.trim();
      
      if (!groupMap[groupName]) {
        groupMap[groupName] = {
          name: groupName,
          totalStock: 0,
          totalValue: 0,
          itemCount: 0,
          products: []
        };
      }

      groupMap[groupName].totalStock += item.stockInHand;
      groupMap[groupName].totalValue += (item.price * item.stockInHand);
      groupMap[groupName].itemCount += 1;
      groupMap[groupName].products.push(item);
    });

    return Object.values(groupMap).sort((a, b) => b.totalValue - a.totalValue);
  }, [items]);

  if (groups.length === 0) return null;

  return (
    <div className="rounded-[2.5rem] bg-indigo-900/10 border border-indigo-500/20 p-6 space-y-6 relative overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Layers size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Product Groups</h3>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{groups.length} Active Groupings</p>
          </div>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all relative z-10"
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          {groups.map((group) => (
            <div key={group.name} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/30 transition-all group/card shadow-lg flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-white capitalize truncate pr-2" title={group.name}>{group.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{group.itemCount} Child SKUs</p>
                </div>
                <div className="bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                  Total
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                 <div className="flex flex-col items-center flex-1 border-r border-slate-800">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Stock</span>
                    <span className="text-xl font-black text-white">{group.totalStock}</span>
                 </div>
                 <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Value</span>
                    <span className="text-xl font-black text-emerald-500">£{group.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pt-1">
                 {group.products.slice(0, 5).map(p => (
                   <div key={p.id} className="relative group/thumb shrink-0">
                      <div className="w-10 h-10 rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                         {p.productImage ? (
                           <img src={p.productImage} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-700">
                             <Package size={16} />
                           </div>
                         )}
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] font-black text-white shadow-md">
                        {p.stockInHand}
                      </div>
                   </div>
                 ))}
                 {group.products.length > 5 && (
                   <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                     +{group.products.length - 5}
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Decorative Background */}
      <Box className="absolute -right-6 -bottom-6 text-indigo-500/5 rotate-12 z-0" size={200} />
    </div>
  );
};

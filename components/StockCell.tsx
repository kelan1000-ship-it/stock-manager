
import React from 'react';
import { Product } from '../types';

interface StockCellProps {
  item: Product;
  onUpdateStockInHand: (id: string, val: number) => void;
  onUpdateStockToKeep: (id: string, val: number) => void;
  onUpdatePartPacks: (id: string, val: number) => void;
}

export const StockCell: React.FC<StockCellProps> = ({ 
  item, 
  onUpdateStockInHand, 
  onUpdateStockToKeep, 
  onUpdatePartPacks 
}) => {
  return (
    <td className="p-4 text-center align-top pt-5">
      <div className="flex flex-col items-center gap-2 mt-3">
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
             <span className="text-[7px] font-black text-emerald-500/70 uppercase">Full</span>
             <input 
                type="number" 
                min="0"
                value={item.stockInHand} 
                onFocus={(e) => e.target.select()} 
                onWheel={(e) => e.currentTarget.blur()} 
                onChange={(e) => onUpdateStockInHand(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
                className="w-16 h-10 px-0 rounded-lg border text-center font-black text-base focus:ring-2 ring-emerald-500/50 outline-none transition-all bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800" 
             />
          </div>
          {item.stockType === 'dispensary' && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-black text-orange-500/70 uppercase">Parts</span>
              <input 
                 type="number" 
                 min="0"
                 value={item.partPacks || 0} 
                 onFocus={(e) => e.target.select()} 
                 onWheel={(e) => e.currentTarget.blur()} 
                 onChange={(e) => onUpdatePartPacks(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
                 className="w-16 h-10 px-0 rounded-lg border text-center font-black text-base text-orange-400 focus:ring-2 ring-orange-500/50 outline-none transition-all bg-slate-800/50 border-orange-500/30 focus:border-orange-500 hover:bg-slate-800" 
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target:</span>
          <input 
            type="number" 
            min="0"
            value={item.stockToKeep} 
            onFocus={(e) => e.target.select()} 
            onWheel={(e) => e.currentTarget.blur()} 
            onChange={(e) => onUpdateStockToKeep(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
            className="w-12 p-0.5 rounded bg-transparent border-b text-[9px] font-bold text-slate-400 text-center outline-none border-slate-800 hover:border-slate-600 focus:border-slate-500 transition-colors" 
          />
        </div>
      </div>
    </td>
  );
};

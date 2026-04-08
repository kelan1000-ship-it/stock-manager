
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { TooltipWrapper } from './SharedUI';

interface StockCellProps {
  item: Product;
  onUpdateStockInHand: (id: string, val: number) => void;
  onUpdateStockToKeep: (id: string, val: number) => void;
  onUpdateLooseStockToKeep: (id: string, val: number) => void;
  onUpdatePartPacks: (id: string, val: number) => void;
  onConfirmStockCheck?: (id: string) => void;
  readOnly?: boolean;
}

export const StockCell: React.FC<StockCellProps> = ({ 
  item, 
  onUpdateStockInHand, 
  onUpdateStockToKeep, 
  onUpdateLooseStockToKeep,
  onUpdatePartPacks,
  onConfirmStockCheck,
  readOnly
}) => {
  const packSizeNum = parseInt(item.packSize) || 1;
  const isDispensary = item.stockType === 'dispensary';
  const totalUnits = (item.stockInHand * packSizeNum) + (item.partPacks || 0);
  const tooltipContent = isDispensary && packSizeNum > 1 
    ? `Total Units: ${totalUnits}`
    : null;

  const stockBoxes = (
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-col items-center gap-0.5">
         <span className="text-[7px] font-black text-emerald-500/70 uppercase">Full</span>
         <input 
            type="number" 
            min="0"
            value={item.stockInHand} 
            disabled={readOnly}
            onFocus={(e) => !readOnly && e.target.select()} 
            onWheel={(e) => e.currentTarget.blur()} 
            onChange={(e) => onUpdateStockInHand(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
            className={`w-16 h-10 px-0 rounded-lg border text-center font-black text-base focus:ring-2 ring-emerald-500/50 outline-none transition-all bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`} 
         />
      </div>
      {isDispensary && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[7px] font-black text-orange-500/70 uppercase">Parts</span>
          <input 
             type="number" 
             min="0"
             value={item.partPacks || 0} 
             disabled={readOnly}
             onFocus={(e) => !readOnly && e.target.select()} 
             onWheel={(e) => e.currentTarget.blur()} 
             onChange={(e) => onUpdatePartPacks(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
             className={`w-16 h-10 px-0 rounded-lg border text-center font-black text-base text-orange-400 focus:ring-2 ring-orange-500/50 outline-none transition-all bg-slate-800/50 border-orange-500/30 focus:border-orange-500 hover:bg-slate-800 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`} 
          />
        </div>
      )}
      {item.needsStockCheck && onConfirmStockCheck && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[7px] font-black text-transparent uppercase select-none">Confirm</span>
          <TooltipWrapper tooltip="Confirm Stock Level (Clear Alert)">
            <button
              onClick={() => onConfirmStockCheck(item.id)}
              className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all group shadow-inner"
            >
              <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </TooltipWrapper>
        </div>
      )}
    </div>
  );

  return (
    <td className="p-4 text-center align-top pt-5">
      <div className="flex flex-col items-center gap-2 mt-3">
        {tooltipContent ? (
          <TooltipWrapper tooltip={tooltipContent}>
            {stockBoxes}
          </TooltipWrapper>
        ) : stockBoxes}
        
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-black text-white uppercase tracking-tighter">{isDispensary ? 'P' : ''} Target:</span>
            <input 
              type="number" 
              min="0"
              value={item.stockToKeep} 
              disabled={readOnly}
              onFocus={(e) => !readOnly && e.target.select()} 
              onWheel={(e) => e.currentTarget.blur()} 
              onChange={(e) => onUpdateStockToKeep(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
              className={`w-10 p-0.5 rounded bg-transparent border-b text-[9px] font-bold text-slate-400 text-center outline-none border-slate-800 hover:border-slate-600 focus:border-slate-500 transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} 
            />
          </div>
          {isDispensary && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter">L Target:</span>
              <input 
                type="number" 
                min="0"
                value={item.looseStockToKeep || 0} 
                disabled={readOnly}
                onFocus={(e) => !readOnly && e.target.select()} 
                onWheel={(e) => e.currentTarget.blur()} 
                onChange={(e) => onUpdateLooseStockToKeep(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
                className={`w-10 p-0.5 rounded bg-transparent border-b text-[9px] font-bold text-orange-500/70 text-center outline-none border-slate-800 hover:border-slate-600 focus:border-orange-500 transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} 
              />
            </div>
          )}
        </div>
      </div>
    </td>
  );
};

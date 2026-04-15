
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateStockItem } from './stockSlice';
import { AlertTriangle } from 'lucide-react';
import { Product } from '../types';
import { Tooltip } from './SharedUI';
import { useTooltip } from '../hooks/useTooltip';
import { PricingAlert } from '../hooks/usePricingDesk';

interface PriceCellProps {
  item: Product;
  alert: PricingAlert | undefined;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateItem: (id: string, updates: Partial<Product>) => void;
  readOnly?: boolean;
}

export const PriceCell: React.FC<PriceCellProps> = ({ 
  item, 
  alert, 
  onUpdatePrice, 
  onUpdateItem,
  readOnly
}) => {
  const dispatch = useDispatch();
  const [localPriceInput, setLocalPriceInput] = useState(item.price.toFixed(2));
  const [localCostInput, setLocalCostInput] = useState(item.costPrice.toFixed(2));
  
  const { isVisible: isPriceAlertVisible, coords: priceAlertCoords, tooltipHandlers: priceAlertHandlers } = useTooltip(300);

  useEffect(() => {
    setLocalPriceInput(item.price.toFixed(2));
  }, [item.price]);

  useEffect(() => {
    setLocalCostInput(item.costPrice.toFixed(2));
  }, [item.costPrice]);

  const handlePriceCommit = () => {
    if (readOnly) return;
    const newPriceVal = parseFloat(localPriceInput);
    if (isNaN(newPriceVal)) {
      setLocalPriceInput(item.price.toFixed(2));
      return;
    }
    setLocalPriceInput(newPriceVal.toFixed(2));
    
    if (Math.abs(newPriceVal - item.price) > 0.001) {
      onUpdatePrice(item.id, newPriceVal);
      dispatch(updateStockItem({ id: item.id, price: newPriceVal }));
    }
  };

  const handleCostCommit = () => {
    if (readOnly) return;
    const newCostVal = parseFloat(localCostInput);
    if (isNaN(newCostVal)) {
      setLocalCostInput(item.costPrice.toFixed(2));
      return;
    }
    setLocalCostInput(newCostVal.toFixed(2));

    if (Math.abs(newCostVal - item.costPrice) > 0.001) {
      onUpdateItem(item.id, { costPrice: newCostVal });
      dispatch(updateStockItem({ id: item.id, costPrice: newCostVal }));
    }
  };

  return (
    <td className="p-4 text-center align-top pt-5">
      <div className="flex flex-col items-center gap-1 mt-5">
        <div className="flex items-center justify-center gap-1 relative">
          <span className="text-xs font-black text-emerald-500">£</span>
          <input 
            type="text" 
            inputMode="decimal" 
            value={localPriceInput} 
            disabled={readOnly}
            onFocus={(e) => !readOnly && e.target.select()} 
            onChange={(e) => setLocalPriceInput(e.target.value)} 
            onBlur={handlePriceCommit} 
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} 
            className={`w-20 p-1 rounded border text-center font-black text-sm text-emerald-500 focus:ring-1 ring-emerald-500 outline-none transition-all bg-slate-800/50 border-slate-700 focus:border-emerald-500/60 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`} 
          />
          {alert && (
            <div className="absolute -right-5 top-1/2 -translate-y-1/2" {...priceAlertHandlers}>
              <AlertTriangle size={14} className={`${alert.severity === 'high' ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
              <Tooltip x={priceAlertCoords.x} y={priceAlertCoords.y} isVisible={isPriceAlertVisible}>
                Price gap detected between branches
              </Tooltip>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 w-full">
          <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">Cost £:</span>
          <input 
            type="text" 
            inputMode="decimal"
            value={localCostInput} 
            disabled={readOnly}
            onFocus={(e) => !readOnly && e.target.select()} 
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} 
            onChange={(e) => setLocalCostInput(e.target.value)}
            onBlur={handleCostCommit}
            className={`w-14 p-0.5 rounded bg-transparent border-b text-[10px] font-bold text-slate-400 text-center outline-none border-slate-800 hover:border-slate-600 focus:border-slate-500 transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} 
          />
        </div>
      </div>
    </td>
  );
};

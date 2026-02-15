
import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, X, Send, Handshake } from 'lucide-react';
import { Product, OrderItem } from '../types';
import { TooltipIconButton } from './ManagerComponents';

interface OrderCellProps {
  item: Product;
  activeOrder: OrderItem | null;
  statusColor: string;
  manualQty: number;
  onManualQtyChange?: (id: string, qty: number) => void;
  onSendToOrder: (item: Product, qty: number) => void;
  onReceiveOrder: (order: OrderItem) => void;
  onRemoveOrder: (id: string) => void;
  onViewShared: () => void;
}

export const OrderCell: React.FC<OrderCellProps> = ({
  item,
  activeOrder,
  statusColor,
  manualQty,
  onManualQtyChange,
  onSendToOrder,
  onReceiveOrder,
  onRemoveOrder,
  onViewShared
}) => {
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    setIsCancelling(false);
  }, [item.id]);

  return (
    <td className="p-4 text-center align-middle">
      {activeOrder ? (
        <div className="flex flex-col items-center gap-1 animate-in fade-in duration-300">
           {isCancelling ? (
              <div className="flex flex-col items-center gap-1.5 animate-in zoom-in duration-200 p-1.5 rounded-xl border border-rose-500/30 bg-rose-900/10">
                  <span className="text-[8px] font-black text-rose-400 uppercase tracking-tight">Are you sure?</span>
                  <div className="flex gap-1.5">
                      <button 
                          onClick={() => { onRemoveOrder(activeOrder.id); setIsCancelling(false); }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-rose-500 shadow-md"
                      >
                          Yes
                      </button>
                      <button 
                          onClick={() => setIsCancelling(false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-wider hover:bg-slate-600 shadow-md"
                      >
                          No
                      </button>
                  </div>
              </div>
           ) : (
               <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded border font-black text-[9px] uppercase tracking-tighter bg-orange-500/10 border-orange-500/20 text-orange-500">On Order: {activeOrder.quantity}</span>
                  <div className="flex gap-1">
                     <TooltipIconButton 
                        onClick={() => onReceiveOrder(activeOrder)} 
                        tooltip="Mark as Received" 
                        icon={ArrowDownCircle} 
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md" 
                     />
                     <TooltipIconButton 
                        onClick={() => setIsCancelling(true)} 
                        tooltip="Cancel Order" 
                        icon={X} 
                        className="p-1.5 rounded-lg bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-md" 
                     />
                  </div>
               </div>
           )}
           {!isCancelling && <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest leading-none">{activeOrder.status}</span>}
        </div>
      ) : item.isDiscontinued ? (
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic block">Unavailable</span>
      ) : item.isShared ? (
        <button 
          onClick={onViewShared}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest w-full"
        >
          <Handshake size={14} /> View Shared
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <input 
            type="number" 
            min="0"
            value={manualQty} 
            onFocus={(e) => e.target.select()} 
            onWheel={(e) => e.currentTarget.blur()} 
            onChange={(e) => onManualQtyChange && onManualQtyChange(item.id, Math.max(0, parseInt(e.target.value) || 0))} 
            className={`w-14 h-10 px-0 rounded-lg border-2 text-center font-black text-base transition-all outline-none ${
              manualQty > 0 
                ? `bg-slate-800/50 border-${statusColor}-500 border-solid text-white shadow-[0_0_10px_rgba(0,0,0,0.2)] ${(statusColor === 'amber' || statusColor === 'rose') ? 'animate-pulse' : ''}` 
                : 'bg-slate-800/50 border-slate-700 border-solid text-slate-500'
            }`} 
          />
          <TooltipIconButton 
            onClick={() => onSendToOrder(item, manualQty)} 
            disabled={manualQty <= 0} 
            tooltip="Submit to Order List"
            icon={Send}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              manualQty > 0 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white shadow-sm' 
                : 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
            }`} 
          />
        </div>
      )}
    </td>
  );
};

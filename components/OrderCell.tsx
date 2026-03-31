
import React, { useState, useEffect } from 'react';
import { ArrowDownCircle, X, Send, Handshake, CheckSquare, RefreshCw, Edit2 } from 'lucide-react';
import { Product, OrderItem } from '../types';
import { TooltipIconButton } from './ManagerComponents';

interface OrderCellProps {
  item: Product;
  activeOrder: OrderItem | null;
  statusColor: string;
  manualQty: number;
  onManualQtyChange?: (id: string, qty: number) => void;
  onSendToOrder: (item: Product, qty: number) => void;
  onUpdateOrderQuantity?: (id: string, qty: number) => void;
  onConfirmOrder?: (id: string) => void;
  onReceiveOrder: (order: OrderItem) => void;
  onRemoveOrder: (id: string) => void;
  onMarkAsBackorder?: (id: string) => void;
  onMarkAsActiveOrder?: (id: string) => void;
  onViewShared: () => void;
  readOnly?: boolean;
}

export const OrderCell: React.FC<OrderCellProps> = ({
  item,
  activeOrder,
  statusColor,
  manualQty,
  onManualQtyChange,
  onSendToOrder,
  onUpdateOrderQuantity,
  onConfirmOrder,
  onReceiveOrder,
  onRemoveOrder,
  onMarkAsBackorder,
  onMarkAsActiveOrder,
  onViewShared,
  readOnly
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isBackorderExpanded, setIsBackorderExpanded] = useState(false);
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editQty, setEditQty] = useState(0);

  useEffect(() => {
    setIsCancelling(false);
    setIsBackorderExpanded(false);
    setIsEditingQty(false);
  }, [item.id]);

  useEffect(() => {
    if (activeOrder) {
      setEditQty(activeOrder.quantity);
    }
  }, [activeOrder?.quantity]);

  if (readOnly) {
    if (activeOrder) {
        return (
            <td className="p-4 text-center align-middle">
                 <div className="flex flex-col items-center gap-1.5">
                    <span className="px-3 py-1.5 rounded-xl border font-black text-[11px] uppercase tracking-widest bg-orange-500/10 border-orange-500/20 text-orange-500 opacity-70">On Order: {activeOrder.quantity}</span>
                    <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest leading-none">{activeOrder.status}</span>
                 </div>
            </td>
        );
    }
    return <td className="p-4 text-center align-middle"><span className="text-[9px] font-black uppercase text-slate-700 tracking-widest block">-</span></td>;
  }

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
                  <button 
                      onClick={() => { onMarkAsBackorder && onMarkAsBackorder(activeOrder.id); setIsCancelling(false); }}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase tracking-wider hover:bg-amber-600/40 shadow-md w-full"
                  >
                      Backorder
                  </button>
              </div>
           ) : activeOrder.status === 'backorder' && !isBackorderExpanded ? (
               <button 
                  onClick={() => setIsBackorderExpanded(true)}
                  className="w-full flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all group relative overflow-hidden"
               >
                   <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <span className="relative z-10 font-black text-[10px] uppercase tracking-[0.2em] text-amber-500">Backordered</span>
                   <span className="relative z-10 text-lg font-black text-amber-400 leading-none mt-0.5">{activeOrder.quantity} <span className="text-[8px] text-amber-500/70">UNITS</span></span>
               </button>
           ) : (
               <>
                 <div className="flex flex-col w-full gap-2 items-center">
                    {isEditingQty ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={editQty}
                          onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                          onFocus={(e) => e.target.select()}
                          className="w-16 h-8 rounded-lg border bg-slate-800 text-white text-center font-black text-[11px]"
                          onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               if (onUpdateOrderQuantity) {
                                 onUpdateOrderQuantity(activeOrder.id, editQty);
                               }
                               setIsEditingQty(false);
                             } else if (e.key === 'Escape') {
                               setIsEditingQty(false);
                               setEditQty(activeOrder.quantity);
                             }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (onUpdateOrderQuantity) {
                               onUpdateOrderQuantity(activeOrder.id, editQty);
                            }
                            setIsEditingQty(false);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md"
                        >
                          <CheckSquare size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingQty(false);
                            setEditQty(activeOrder.quantity);
                          }}
                          className="p-1.5 rounded-lg bg-slate-600 text-white hover:bg-slate-500 transition-all shadow-md"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className={`px-3 py-1.5 rounded-xl border font-black text-[11px] uppercase tracking-widest shadow-sm ${activeOrder.status === 'pending' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                            {activeOrder.status === 'pending' ? 'To Order: ' : 'On Order: '}
                            {activeOrder.quantity}
                        </span>
                        {onUpdateOrderQuantity && (
                           <button
                             onClick={() => setIsEditingQty(true)}
                             className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all shadow-sm border border-slate-700/50 ml-0.5 group"
                             data-tooltip="Edit Order Quantity"
                           >
                             <Edit2 size={12} className="group-hover:animate-pulse" />
                           </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1.5">
                       {activeOrder.status === 'pending' && onConfirmOrder && (
                           <TooltipIconButton 
                              onClick={() => onConfirmOrder(activeOrder.id)} 
                              tooltip="Mark as Ordered" 
                              icon={CheckSquare} 
                              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-md" 
                           />
                       )}
                       {activeOrder.status === 'ordered' && (
                           <TooltipIconButton 
                              onClick={() => onReceiveOrder(activeOrder)} 
                              tooltip="Mark as Received" 
                              icon={ArrowDownCircle} 
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md" 
                           />
                       )}
                       {activeOrder.status === 'backorder' && onMarkAsActiveOrder && (
                           <TooltipIconButton 
                              onClick={() => { onMarkAsActiveOrder(activeOrder.id); setIsBackorderExpanded(false); }} 
                              tooltip="Make Active Order" 
                              icon={RefreshCw} 
                              className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all shadow-md" 
                           />
                       )}
                       <TooltipIconButton 
                          onClick={() => setIsCancelling(true)} 
                          tooltip="Cancel Order" 
                          icon={X} 
                          className="p-1.5 rounded-lg bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-md" 
                       />
                    </div>
                 </div>
                 {isBackorderExpanded && (
                     <div className="flex flex-col items-center gap-2 mt-2 w-full">
                         <button onClick={() => setIsBackorderExpanded(false)} className="text-[8px] font-black uppercase text-slate-500 hover:text-white transition-colors">Collapse</button>
                     </div>
                 )}
               </>
           )}
           {!isCancelling && activeOrder.status !== 'backorder' && <span className="text-[7px] font-black uppercase tracking-widest leading-none text-slate-500">{activeOrder.status}</span>}
        </div>
      ) : item.isDiscontinued ? (
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic block">Unavailable</span>
      ) : item.isExcessStock ? (
        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest block">Excess Stock</span>
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

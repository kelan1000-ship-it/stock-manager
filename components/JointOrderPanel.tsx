import React, { useState } from 'react';
import { History, ShoppingCart, Share2, ArrowRight, Edit3, Check, X } from 'lucide-react';
import { JointOrder } from '../types';

interface JointOrderPanelProps {
  orders: JointOrder[];
  allocationDrafts: Record<string, { bywood: number; broom: number }>;
  onAllocationChange: (orderId: string, branch: 'bywood' | 'broom', val: string) => void;
  onConfirmAllocation: (order: JointOrder) => void;
  onUpdateOrder: (id: string, updates: Partial<JointOrder>) => void;
}

export const JointOrderPanel: React.FC<JointOrderPanelProps> = ({ 
  orders, 
  allocationDrafts, 
  onAllocationChange, 
  onConfirmAllocation,
  onUpdateOrder
}) => {
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [tempTarget, setTempTarget] = useState<string>('');

  const startEditing = (order: JointOrder) => {
    setEditingTargetId(order.id);
    setTempTarget(order.totalQuantity.toString());
  };

  const saveTarget = (orderId: string) => {
    const val = parseInt(tempTarget);
    if (!isNaN(val)) {
      onUpdateOrder(orderId, { totalQuantity: val });
    }
    setEditingTargetId(null);
  };

  return (
    <div className="p-8 grid gap-6">
      {orders.length === 0 ? (
        <div className="py-20 text-center opacity-40">
          <History size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">No matching joint orders found</p>
        </div>
      ) : orders.map(order => {
        const draft = allocationDrafts[order.id] || { bywood: order.allocationBywood, broom: order.allocationBroom };
        const allocated = draft.bywood + draft.broom;
        const isMatch = allocated === order.totalQuantity;
        const isEditing = editingTargetId === order.id;

        return (
          <div key={order.id} className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0">
                <ShoppingCart size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/30">Action Required</span>
                  <span className="text-[10px] font-mono text-slate-500">{order.timestamp.split('T')[0]}</span>
                </div>
                <h4 className="text-lg font-black text-white capitalize truncate">{order.name}</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {order.packSize}
                </p>
              </div>
            </div>

            {/* Target Total Widget */}
            <div className="flex flex-col items-center justify-center px-8 py-3 rounded-3xl bg-slate-950 border border-slate-800 shadow-inner min-w-[140px] relative">
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Order Target</span>
               {isEditing ? (
                 <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      type="number" 
                      value={tempTarget}
                      onChange={(e) => setTempTarget(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveTarget(order.id)}
                      className="w-20 h-12 text-center bg-slate-900 border-2 border-indigo-500 rounded-xl text-3xl font-black text-indigo-400 outline-none transition-all"
                    />
                 </div>
               ) : (
                 <span className="text-4xl font-black text-white tracking-tighter">{order.totalQuantity}</span>
               )}
            </div>

            <ArrowRight className="text-slate-700 hidden md:block" size={24} />

            <div className="flex items-center gap-6 bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
              <div className="flex flex-col items-center px-2">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Allocated</span>
                <div className={`w-20 h-16 flex items-center justify-center rounded-2xl border-2 text-3xl font-black transition-all shadow-lg ${isMatch ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-500' : 'bg-amber-500/10 border-amber-500/50 text-amber-500'}`}>
                  {allocated}
                </div>
              </div>

              <div className="h-12 w-px bg-slate-800 mx-2" />

              <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Bywood</span>
                    <input 
                      type="number" 
                      min="0"
                      value={draft.bywood}
                      onChange={(e) => onAllocationChange(order.id, 'bywood', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-16 h-12 text-center bg-slate-900 border border-slate-700 rounded-xl text-lg font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Broom</span>
                    <input 
                      type="number" 
                      min="0"
                      value={draft.broom}
                      onChange={(e) => onAllocationChange(order.id, 'broom', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-16 h-12 text-center bg-slate-900 border border-slate-700 rounded-xl text-lg font-black text-white outline-none focus:border-indigo-500 transition-all"
                      placeholder="0"
                    />
                  </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
              <button 
                onClick={() => onConfirmAllocation(order)}
                disabled={!isMatch || isEditing}
                title={!isMatch ? `Allocated total must equal ${order.totalQuantity}` : 'Confirm Distribution'}
                className={`h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${
                  isMatch && !isEditing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <Share2 size={16} /> Distribute
              </button>

              <button 
                onClick={() => isEditing ? saveTarget(order.id) : startEditing(order)}
                className={`h-10 px-6 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                  isEditing 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-900/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                {isEditing ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    Save Target
                  </>
                ) : (
                  <>
                    <Edit3 size={14} />
                    Edit Order
                  </>
                )}
              </button>
              
              {isEditing && (
                <button 
                  onClick={() => setEditingTargetId(null)}
                  className="flex items-center justify-center gap-1.5 text-[8px] font-black uppercase text-slate-600 hover:text-rose-500 transition-colors"
                >
                  <X size={10} /> Cancel Edit
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
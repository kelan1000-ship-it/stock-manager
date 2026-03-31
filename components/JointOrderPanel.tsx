import React, { useState, useEffect } from 'react';
import { History, Share2, Edit3, Check, X, Barcode, Hash, Pencil, Copy, CheckSquare, Square } from 'lucide-react';
import { ProductThumbnail } from './ImageComponents';
import { JointOrder, Product } from '../types';
import { CopyableText, SortHeader } from './SharedUI';
import { findMatchByKey } from '../utils/productMatching';
import { TooltipIconButton } from './ManagerComponents';

const OrderPriceEditor: React.FC<{
  product: Product;
  onUpdateSharedValues: (barcode: string, field: 'price' | 'costPrice', value: number, productCode?: string) => void;
}> = ({ product, onUpdateSharedValues }) => {
  const [rrp, setRrp] = useState(product.price.toFixed(2));
  const [cost, setCost] = useState(product.costPrice.toFixed(2));
  useEffect(() => { setRrp(product.price.toFixed(2)); }, [product.price]);
  useEffect(() => { setCost(product.costPrice.toFixed(2)); }, [product.costPrice]);

  const handleRrpBlur = () => {
    const val = parseFloat(rrp);
    if (!isNaN(val) && Math.abs(val - product.price) > 0.001)
      onUpdateSharedValues(product.barcode, 'price', val, product.productCode);
    else setRrp(product.price.toFixed(2));
  };
  const handleCostBlur = () => {
    const val = parseFloat(cost);
    if (!isNaN(val) && Math.abs(val - product.costPrice) > 0.001)
      onUpdateSharedValues(product.barcode, 'costPrice', val, product.productCode);
    else setCost(product.costPrice.toFixed(2));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-transparent hover:bg-slate-800/30 focus-within:bg-slate-900 focus-within:border-emerald-500/30 transition-all">
        <span className="text-sm font-black text-emerald-600">£</span>
        <input type="number" step="0.01" value={rrp}
          onChange={(e) => setRrp(e.target.value)}
          onBlur={handleRrpBlur}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-20 bg-transparent text-xl font-black text-emerald-500 text-center outline-none" />
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl border border-transparent hover:bg-slate-800/30 focus-within:bg-slate-900 focus-within:border-indigo-500/30 transition-all">
        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Cost</span>
        <span className="text-[10px] text-slate-600">£</span>
        <input type="number" step="0.01" value={cost}
          onChange={(e) => setCost(e.target.value)}
          onBlur={handleCostBlur}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-16 bg-transparent text-xs font-bold text-slate-500 text-center outline-none" />
      </div>
    </div>
  );
};

interface JointOrderPanelProps {
  orders: JointOrder[];
  allocationDrafts: Record<string, { bywood: number; broom: number }>;
  onAllocationChange: (orderId: string, branch: 'bywood' | 'broom', val: string) => void;
  onConfirmAllocation: (order: JointOrder) => void;
  onUpdateOrder: (id: string, updates: Partial<JointOrder>) => void;
  onCancelOrder?: (orderId: string) => void;
  localItems?: Product[];
  onUpdateSharedValues?: (barcode: string, field: 'price' | 'costPrice', value: number, productCode?: string) => void;
  onPreviewImage?: (src: string, title: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' }[];
  onSort?: (key: string, multi: boolean) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleAll?: () => void;
  isAllSelected?: boolean;
}

export const JointOrderPanel: React.FC<JointOrderPanelProps> = ({
  orders,
  allocationDrafts,
  onAllocationChange,
  onConfirmAllocation,
  onUpdateOrder,
  onCancelOrder,
  localItems = [],
  onUpdateSharedValues,
  onPreviewImage,
  sortConfig = [],
  onSort,
  selectedIds = new Set(),
  onToggleSelection,
  onToggleAll,
  isAllSelected = false
}) => {
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-950 border-b border-slate-800">
          <tr>
            {onToggleAll && (
              <th className="p-4 w-12 border-b border-slate-800">
                <button onClick={onToggleAll} className="text-slate-500 hover:text-emerald-500 transition-colors">
                  {isAllSelected && orders.length > 0 ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                </button>
              </th>
            )}
            <SortHeader label="Product" sortKey="name" config={sortConfig} onSort={onSort} />
            <SortHeader label="Economics" sortKey="price" config={sortConfig} onSort={onSort} align="center" />
            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Order Target</th>
            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Allocation</th>
            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-20 text-center opacity-40">
                <History size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">No matching joint orders found</p>
              </td>
            </tr>
          ) : orders.map(order => {
            const product = findMatchByKey(localItems, order, { skipDeleted: false });
            const draft = allocationDrafts[order.id] || { bywood: order.allocationBywood, broom: order.allocationBroom };
            const allocated = draft.bywood + draft.broom;
            const isMatch = allocated === order.totalQuantity;
            const isEditing = editingTargetId === order.id;

            return (
              <tr key={order.id} className={`group hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-0 ${selectedIds?.has(order.id) ? 'bg-slate-800/50' : ''}`}>
                {onToggleSelection && (
                  <td className="p-4 align-middle">
                    <button onClick={() => onToggleSelection(order.id)} className={`transition-colors ${selectedIds?.has(order.id) ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
                      {selectedIds?.has(order.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                )}
                <td className="py-4 px-4 align-middle">
                  <div className="flex items-center gap-4">
                    <ProductThumbnail
                      src={product?.productImage || null}
                      alt={order.name}
                      onClick={() => product?.productImage && onPreviewImage && onPreviewImage(product.productImage, order.name)}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/30">Action Required</span>
                        <span className="text-[10px] font-mono text-slate-500">{order.timestamp.split('T')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white capitalize truncate tracking-tight">{order.name}</h4>
                        <button
                          onClick={e => { 
                            e.stopPropagation(); 
                            navigator.clipboard.writeText(order.name); 
                            setCopiedId(order.id); 
                            setTimeout(() => setCopiedId(null), 2000); 
                          }}
                          className="shrink-0 opacity-50 hover:opacity-100 hover:text-emerald-400 transition-all cursor-pointer"
                          data-tooltip="Copy name"
                        >
                          {copiedId === order.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
                        </button>
                      </div>
                      <p className="text-[10px] italic text-slate-500 uppercase tracking-widest mt-0.5">{order.packSize}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {order.barcode && <CopyableText text={order.barcode} label="BAR" icon={<Barcode size={13} />} />}
                        {product?.productCode && <CopyableText text={product.productCode} label="PIP" icon={<Hash size={13} />} />}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-middle text-center">
                  {product && onUpdateSharedValues ? (
                    <OrderPriceEditor product={product} onUpdateSharedValues={onUpdateSharedValues} />
                  ) : null}
                </td>
                <td className="py-4 px-4 align-middle text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Target</span>
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        value={tempTarget}
                        onChange={(e) => setTempTarget(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTarget(order.id)}
                        className="w-14 h-10 text-center bg-slate-900 border-2 border-indigo-500 rounded-lg text-xl font-black text-indigo-400 outline-none transition-all"
                      />
                    ) : (
                      <span className="text-2xl font-black text-white tracking-tighter">{order.totalQuantity}</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 align-middle">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Total</span>
                      <div className={`w-14 h-10 flex items-center justify-center rounded-xl border-2 text-xl font-black transition-all ${isMatch ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-500' : 'bg-amber-500/10 border-amber-500/50 text-amber-500'}`}>
                        {allocated}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Bywood</span>
                        <input
                          type="number"
                          min="0"
                          value={draft.bywood}
                          onChange={(e) => onAllocationChange(order.id, 'bywood', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-14 h-10 text-center bg-slate-900 border border-slate-700 rounded-lg text-base font-black text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Broom</span>
                        <input
                          type="number"
                          min="0"
                          value={draft.broom}
                          onChange={(e) => onAllocationChange(order.id, 'broom', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-14 h-10 text-center bg-slate-900 border border-slate-700 rounded-lg text-base font-black text-white outline-none focus:border-indigo-500 transition-all"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-2">
                    <TooltipIconButton
                      onClick={() => onConfirmAllocation(order)}
                      disabled={!isMatch || isEditing}
                      tooltip={!isMatch ? `Allocated total must equal ${order.totalQuantity}` : 'Confirm Distribution'}
                      icon={Share2}
                      className={`p-1.5 rounded-lg transition-all shadow-md ${
                        isMatch && !isEditing
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    />

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveTarget(order.id)}
                            className="h-8 px-4 rounded-xl bg-indigo-600 text-white border border-indigo-400 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-indigo-900/30 transition-all"
                          >
                            <Check size={12} strokeWidth={3} /> Save
                          </button>
                          <button
                            onClick={() => setEditingTargetId(null)}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                            data-tooltip="Cancel Edit"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          {cancellingId === order.id ? (
                            <div className="flex flex-col items-center gap-1.5 animate-in zoom-in duration-200 p-1.5 rounded-xl border border-rose-500/30 bg-rose-900/10 min-w-[110px]">
                              <span className="text-[8px] font-black text-rose-400 uppercase tracking-tight">Cancel order?</span>
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => { onCancelOrder && onCancelOrder(order.id); setCancellingId(null); }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-rose-500 shadow-md"
                                >
                                  Yes
                                </button>
                                <button 
                                  onClick={() => setCancellingId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-wider hover:bg-slate-600 shadow-md"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <TooltipIconButton
                                onClick={() => startEditing(order)}
                                tooltip="Edit Order Target"
                                icon={Pencil}
                                className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all shadow-md"
                              />
                              {onCancelOrder && (
                                <TooltipIconButton
                                  onClick={() => setCancellingId(order.id)}
                                  tooltip="Cancel Order"
                                  icon={X}
                                  className="p-1.5 rounded-lg bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-md"
                                />
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
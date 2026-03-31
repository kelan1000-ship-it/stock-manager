import React, { useState, useEffect } from 'react';
import {
  Barcode, Hash, History as HistoryIcon, Send, Check, X, Ban, Copy, CheckSquare, Square, ArrowRight
} from 'lucide-react';
import { BranchKey, Product, OrderItem } from '../types';
import { ProductThumbnail, CopyableText, Tooltip } from './ManagerComponents';
import { ProductNoteWidget } from './ProductNoteWidget';
import { useTooltip } from '../hooks/useTooltip';
import { getProductMatchKey } from '../utils/productMatching';

interface SharedInventoryRowProps {
  item: Product;
  match: Product | undefined;
  currentBranch: BranchKey;
  otherBranch: BranchKey;
  draft: { bywood: number; broom: number };
  confirmations: { bywood: boolean; broom: boolean };
  onUpdateSharedValues: (barcode: string, field: 'price' | 'costPrice', value: number, productCode?: string) => void;
  onUpdateTarget: (productId: string, branch: BranchKey, value: number) => void;
  onUpdateLooseTarget: (productId: string, branch: BranchKey, value: number) => void;
  onUpdateStock: (productId: string, branch: BranchKey, value: number) => void;
  onOrderDraftChange: (productId: string, branch: 'bywood' | 'broom', val: string) => void;
  onSaveDraftOnBlur: (productId: string) => void;
  onToggleConfirmation: (productId: string, branch: 'bywood' | 'broom') => void;
  onPlaceJointOrder: (item: Product) => void;
  onOpenEdit?: (product: Product) => void;
  onOpenHistory?: (product: Product) => void;
  onPreviewImage?: (src: string, title: string) => void;
  jointOrders: any[];
  branchOrders: OrderItem[];
  tagSettings: Record<string, any>;
  isNoteExpanded: boolean;
  onToggleNote: () => void;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}

export const SharedInventoryRow: React.FC<SharedInventoryRowProps> = ({ 
  item, 
  match, 
  currentBranch, 
  otherBranch, 
  draft, 
  confirmations, 
  onUpdateSharedValues, 
  onUpdateTarget, 
  onUpdateLooseTarget,
  onUpdateStock,
  onOrderDraftChange,
  onSaveDraftOnBlur,
  onToggleConfirmation,
  onPlaceJointOrder,
  onOpenEdit,
  onOpenHistory,
  onPreviewImage,
  jointOrders,
  branchOrders,
  tagSettings,
  isNoteExpanded,
  onToggleNote,
  isSelected = false,
  onToggleSelection
}) => {
  const [nameCopied, setNameCopied] = useState(false);

  // State for inputs to prevent jitter
  const [priceInput, setPriceInput] = useState(item.price.toFixed(2));
  const [costInput, setCostInput] = useState(item.costPrice.toFixed(2));
  const [localTarget, setLocalTarget] = useState(item.stockToKeep.toString());
  const [remoteTarget, setRemoteTarget] = useState(match ? match.stockToKeep.toString() : '');
  const [localLooseTarget, setLocalLooseTarget] = useState(item.looseStockToKeep?.toString() || '0');
  const [remoteLooseTarget, setRemoteLooseTarget] = useState(match?.looseStockToKeep?.toString() || '0');
  const [localStockInput, setLocalStockInput] = useState(item.stockInHand.toString());
  const [remoteStockInput, setRemoteStockInput] = useState(match ? match.stockInHand.toString() : '');

  // Effects to sync props to state
  useEffect(() => { setPriceInput(item.price.toFixed(2)); }, [item.price]);
  useEffect(() => { setCostInput(item.costPrice.toFixed(2)); }, [item.costPrice]);
  useEffect(() => { setLocalTarget(item.stockToKeep.toString()); }, [item.stockToKeep]);
  useEffect(() => { setLocalLooseTarget(item.looseStockToKeep?.toString() || '0'); }, [item.looseStockToKeep]);
  useEffect(() => { setLocalStockInput(item.stockInHand.toString()); }, [item.stockInHand]);
  useEffect(() => { if (match) setRemoteTarget(match.stockToKeep.toString()); }, [match?.stockToKeep]);
  useEffect(() => { if (match) setRemoteLooseTarget(match?.looseStockToKeep?.toString() || '0'); }, [match?.looseStockToKeep]);
  useEffect(() => { if (match) setRemoteStockInput(match.stockInHand.toString()); }, [match?.stockInHand]);

  // Handlers
  const handlePriceBlur = () => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && Math.abs(val - item.price) > 0.001) onUpdateSharedValues(item.barcode, 'price', val, item.productCode);
    else setPriceInput(item.price.toFixed(2));
  };
  const handleCostBlur = () => {
    const val = parseFloat(costInput);
    if (!isNaN(val) && Math.abs(val - item.costPrice) > 0.001) onUpdateSharedValues(item.barcode, 'costPrice', val, item.productCode);
    else setCostInput(item.costPrice.toFixed(2));
  };
  const handleLocalTargetBlur = () => {
    const val = parseInt(localTarget);
    if (!isNaN(val) && val !== item.stockToKeep) onUpdateTarget(item.id, currentBranch, val);
    else setLocalTarget(item.stockToKeep.toString());
  };
  const handleRemoteTargetBlur = () => {
    if (!match) return;
    const val = parseInt(remoteTarget);
    if (!isNaN(val) && val !== match.stockToKeep) onUpdateTarget(match.id, otherBranch, val);
    else setRemoteTarget(match.stockToKeep.toString());
  };
  const handleLocalLooseTargetBlur = () => {
    const val = parseInt(localLooseTarget);
    if (!isNaN(val) && val !== item.looseStockToKeep) onUpdateLooseTarget(item.id, currentBranch, val);
    else setLocalLooseTarget(item.looseStockToKeep?.toString() || '0');
  };
  const handleRemoteLooseTargetBlur = () => {
    if (!match) return;
    const val = parseInt(remoteLooseTarget);
    if (!isNaN(val) && val !== match.looseStockToKeep) onUpdateLooseTarget(match.id, otherBranch, val);
    else setRemoteLooseTarget(match.looseStockToKeep?.toString() || '0');
  };
  const handleLocalStockBlur = () => {
    const val = parseInt(localStockInput);
    if (!isNaN(val) && val !== item.stockInHand) onUpdateStock(item.id, currentBranch, val);
    else setLocalStockInput(item.stockInHand.toString());
  };
  const handleRemoteStockBlur = () => {
    if (!match) return;
    const val = parseInt(remoteStockInput);
    if (!isNaN(val) && val !== match.stockInHand) onUpdateStock(match.id, otherBranch, val);
    else setRemoteStockInput(match.stockInHand.toString());
  };

  const localBranchKey = currentBranch;
  const partnerBranchKey = otherBranch;

  // Tooltips
  const { isVisible: localHistoryTip, coords: localHistoryCoords, tooltipHandlers: localHistoryHandlers } = useTooltip(400);
  const { isVisible: remoteHistoryTip, coords: remoteHistoryCoords, tooltipHandlers: remoteHistoryHandlers } = useTooltip(400);

  const totalStock = item.stockInHand + (match ? match.stockInHand : 0);
  const totalTarget = item.stockToKeep + (match ? match.stockToKeep : 0);
  const healthPercent = totalTarget > 0 ? (totalStock / totalTarget) * 100 : 0;
  const totalOrder = draft[localBranchKey] || 0;
  const isReady = confirmations[localBranchKey];

  return (
    <tr className={`group hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-0 ${isSelected ? 'bg-emerald-900/10' : ''}`}>
      <td className="p-4 align-top pt-6">
          {onToggleSelection && (
              <button onClick={() => onToggleSelection(item.id)} className={`transition-colors ${isSelected ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
          )}
      </td>      {/* Product Detail */}
      <td className="py-6 pr-6 align-top">
        <div className="flex items-start gap-4">
            <div className="flex flex-col gap-2 shrink-0">
                <ProductThumbnail 
                    src={item.productImage} 
                    alt={item.name} 
                    stockType={item.stockType}
                    onClick={() => item.productImage && onPreviewImage && onPreviewImage(item.productImage, item.name)} 
                />
                <ProductNoteWidget
                    id={item.id}
                    notes={item.notes}
                    partnerNotes={match?.notes}
                    branchLabels={{ local: currentBranch === 'bywood' ? 'Bywood' : 'Broom', partner: currentBranch === 'bywood' ? 'Broom' : 'Bywood' }}
                    isExpanded={isNoteExpanded}
                    onToggle={onToggleNote}
                    stockType={item.stockType}
                />
            </div>
            <div className="pt-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => onOpenEdit && onOpenEdit(item)}
                    className="text-sm font-black text-white hover:text-indigo-400 transition-colors text-left truncate tracking-tight capitalize"
                >
                    {item.name}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.name); setNameCopied(true); setTimeout(() => setNameCopied(false), 2000); }}
                  className="shrink-0 opacity-50 hover:opacity-100 hover:text-emerald-400 transition-all cursor-pointer"
                  data-tooltip="Copy name"
                >
                  {nameCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
                </button>
              </div>
              {item.subheader && <span className="text-xs italic text-slate-400 truncate">{item.subheader}</span>}
              <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                  <span className="text-[10px] italic text-slate-500 uppercase">{item.packSize}</span>
                  <span className="px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-tighter">Shared SKU</span>
                  {item.tags?.map(tag => {
                    const settings = tagSettings[tag];
                    return (
                      <span 
                        key={tag} 
                        style={settings?.color ? { backgroundColor: settings.color, color: '#fff', borderColor: 'transparent' } : {}}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-slate-800 border-slate-700/50 text-slate-400 ${settings?.isFlashing ? 'animate-tag-flash' : ''}`}
                      >
                        #{tag}
                      </span>
                    );
                  })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                  {item.barcode && <CopyableText text={item.barcode} label="BAR" icon={<Barcode size={13} />} />}
                  {item.productCode && <CopyableText text={item.productCode} label="PIP" icon={<Hash size={13} />} />}
              </div>
            </div>
        </div>
      </td>

      {/* Economics */}
      <td className="p-6 text-center align-top">
        <div className="flex flex-col items-center gap-3 min-w-[100px] mt-1">
          {/* Price (RRP) Container */}
          <div 
            className="group/price flex items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 cursor-text border border-transparent hover:bg-slate-800/30 focus-within:bg-slate-900 focus-within:border-emerald-500/30 focus-within:shadow-lg w-full max-w-[100px]"
            onClick={() => document.getElementById(`price-${item.id}`)?.focus()}
          >
            <span className="text-sm font-black text-emerald-600 mt-0.5 group-focus-within/price:text-emerald-500 transition-colors">£</span>
            <input 
              id={`price-${item.id}`}
              type="number"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={handlePriceBlur}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-20 bg-transparent text-center text-xl font-black text-emerald-500 outline-none p-0 transition-all placeholder-slate-700"
            />
          </div>
          
          {/* Cost Container */}
          <div 
            className="group/cost flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 cursor-text border border-transparent hover:bg-slate-800/30 focus-within:bg-slate-900 focus-within:shadow-lg focus-within:border-indigo-500/30 w-full max-w-[100px]"
            onClick={() => document.getElementById(`cost-${item.id}`)?.focus()}
          >
              <label htmlFor={`cost-${item.id}`} className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5 group-hover/cost:text-slate-500 group-focus-within/cost:text-indigo-400 transition-colors cursor-pointer">
                  Cost
              </label>
              <div className="flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-600 mr-0.5 group-focus-within/cost:text-indigo-500 transition-colors">£</span>
                  <input 
                      id={`cost-${item.id}`}
                      type="number"
                      step="0.01"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      onBlur={handleCostBlur}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-16 bg-transparent text-center text-xs font-bold text-slate-500 outline-none p-0 group-focus-within/cost:text-white transition-colors placeholder-slate-700"
                      placeholder="0.00"
                  />
              </div>
          </div>
        </div>
      </td>

      {/* Local Branch */}
      <td className="p-6 text-center bg-indigo-900/5 border-r border-indigo-500/5 align-top">
        <div className="flex flex-col items-center gap-2 mt-1">
            <div className="text-center relative">
              <input 
                  type="number"
                  min="0"
                  value={localStockInput}
                  onChange={(e) => setLocalStockInput(e.target.value)}
                  onBlur={handleLocalStockBlur}
                  className="w-16 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-center text-2xl font-black text-white outline-none transition-all p-0"
              />
              <button 
                  onClick={() => onOpenHistory && onOpenHistory(item)}
                  {...localHistoryHandlers}
                  className="absolute -right-6 top-1 p-1 rounded-lg bg-slate-800/50 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
              >
                  <HistoryIcon size={12} />
              </button>
              <Tooltip x={localHistoryCoords.x} y={localHistoryCoords.y} isVisible={localHistoryTip}>Local History</Tooltip>
              <div className="flex flex-col items-center gap-1 mt-0.5">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{item.stockType === 'dispensary' ? 'P ' : ''}Target:</span>
                  <input 
                      type="number"
                      min="0"
                      value={localTarget}
                      onChange={(e) => setLocalTarget(e.target.value)}
                      onBlur={handleLocalTargetBlur}
                      className="w-8 bg-transparent border-b border-slate-800 hover:border-slate-600 text-center text-[9px] font-bold text-slate-500 focus:text-indigo-400 focus:border-indigo-500 outline-none transition-colors p-0"
                  />
                </div>
                {item.stockType === 'dispensary' && (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[9px] font-bold text-orange-500/70 uppercase tracking-tight">L Target:</span>
                    <input 
                        type="number"
                        min="0"
                        value={localLooseTarget}
                        onChange={(e) => setLocalLooseTarget(e.target.value)}
                        onBlur={handleLocalLooseTargetBlur}
                        className="w-8 bg-transparent border-b border-slate-800 hover:border-slate-600 text-center text-[9px] font-bold text-orange-500/70 focus:text-orange-500 focus:border-orange-500 outline-none transition-colors p-0"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Logic: 'isDiscontinued' corresponds to 'Block Orders' in the form panel */}
            {item.isDiscontinued ? (
               <div className="flex items-center justify-center gap-1 mt-1 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 w-full min-h-[34px]">
                  <Ban size={12} className="text-rose-500" />
                  <span className="text-[8px] font-black uppercase text-rose-500 tracking-widest">Unavailable</span>
               </div>
            ) : (
                <div className={`flex items-center gap-1 mt-1 rounded-lg p-1 border transition-all ${confirmations[localBranchKey] ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                {confirmations[localBranchKey] ? (
                    <>
                        <span className="text-[8px] font-black uppercase text-emerald-500 px-1">Ready</span>
                        <div className="w-10 h-6 flex items-center justify-center font-black text-white text-xs">{draft[localBranchKey] || 0}</div>
                        <button
                            onClick={() => onToggleConfirmation(item.id, localBranchKey)}
                            className="w-6 h-6 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                            <X size={10} strokeWidth={3} />
                        </button>
                    </>
                ) : (
                    <>
                        <span className="text-[8px] font-black uppercase text-amber-500 px-1">Order</span>
                        <input
                            type="number"
                            min="0"
                            value={draft[localBranchKey] || ''}
                            onChange={(e) => onOrderDraftChange(item.id, localBranchKey, e.target.value)}
                            onBlur={() => onSaveDraftOnBlur(item.id)}
                            placeholder="0"
                            className="w-10 h-6 bg-slate-800 rounded border border-slate-700 text-center text-xs font-bold text-amber-500 outline-none focus:border-indigo-500"
                        />
                        <button
                            onClick={() => onToggleConfirmation(item.id, localBranchKey)}
                            className="w-6 h-6 rounded bg-indigo-600 text-white hover:bg-indigo-500 flex items-center justify-center transition-colors shadow-lg"
                        >
                            <Check size={10} strokeWidth={4} />
                        </button>
                    </>
                )}
                </div>
            )}
        </div>
      </td>

      {/* Remote Branch */}
      <td className="p-6 text-center align-top">
        <div className="flex flex-col items-center gap-2 mt-1">
            <div className="text-center relative">
              {match ? (
                  <>
                    <input 
                        type="number"
                        min="0"
                        value={remoteStockInput}
                        onChange={(e) => setRemoteStockInput(e.target.value)}
                        onBlur={handleRemoteStockBlur}
                        className={`w-16 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-center text-2xl font-black ${match ? 'text-slate-400' : 'text-slate-700'} outline-none transition-all p-0`}
                    />
                    <button 
                        onClick={() => onOpenHistory && onOpenHistory(match)}
                        {...remoteHistoryHandlers}
                        className="absolute -right-6 top-1 p-1 rounded-lg bg-slate-800/50 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <HistoryIcon size={12} />
                    </button>
                    <Tooltip x={remoteHistoryCoords.x} y={remoteHistoryCoords.y} isVisible={remoteHistoryTip}>Partner History</Tooltip>
                  </>
              ) : (
                  <span className="text-2xl font-black text-slate-700">-</span>
              )}
              <div className="flex flex-col items-center gap-1 mt-0.5">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">{item.stockType === 'dispensary' ? 'P ' : ''}Target:</span>
                  {match ? (
                      <input 
                          type="number"
                          min="0"
                          value={remoteTarget}
                          onChange={(e) => setRemoteTarget(e.target.value)}
                          onBlur={handleRemoteTargetBlur}
                          className="w-8 bg-transparent border-b border-slate-800 hover:border-slate-600 text-center text-[9px] font-bold text-slate-500 focus:text-indigo-400 focus:border-indigo-500 outline-none transition-colors p-0"
                      />
                  ) : (
                      <span className="text-[9px] font-bold text-slate-700">-</span>
                  )}
                </div>
                {item.stockType === 'dispensary' && (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[9px] font-bold text-orange-500/50 uppercase tracking-tight">L Target:</span>
                    {match ? (
                        <input 
                            type="number"
                            min="0"
                            value={remoteLooseTarget}
                            onChange={(e) => setRemoteLooseTarget(e.target.value)}
                            onBlur={handleRemoteLooseTargetBlur}
                            className="w-8 bg-transparent border-b border-slate-800 hover:border-slate-600 text-center text-[9px] font-bold text-orange-500/50 focus:text-orange-500 focus:border-orange-500 outline-none transition-colors p-0"
                        />
                    ) : (
                        <span className="text-[9px] font-bold text-slate-700">-</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {match?.isDiscontinued && (
               <div className="flex items-center justify-center gap-1 mt-1 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 w-full min-h-[34px]">
                  <Ban size={12} className="text-rose-500" />
                  <span className="text-[8px] font-black uppercase text-rose-500 tracking-widest">Unavailable</span>
               </div>
            )}
        </div>
      </td>

      {/* Health Bar */}
      <td className="p-6 align-top">
        <div className="flex flex-col gap-2 max-w-[140px] mx-auto mt-4">
            <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-widest">
              <span>Total: {totalStock}</span>
              <span>{healthPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${healthPercent < 25 ? 'bg-rose-500' : healthPercent < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(100, healthPercent)}%` }} 
              />
            </div>
        </div>
      </td>

      {/* Suggested Order */}
      <td className="p-6 text-center align-top">
        <div className="flex flex-col items-center mt-4">
          {(() => {
            const isOnOrder = branchOrders.some(o => o.productId === item.id && (o.status === 'ordered' || o.status === 'backorder'));
            if (isOnOrder) {
              return (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg font-black text-slate-600">0</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[8px] font-black uppercase tracking-widest text-sky-400">On Order</span>
                </div>
              );
            }
            if (item.isExcessStock) {
              return (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg font-black text-slate-600">0</span>
                  <span className="px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-[8px] font-black uppercase tracking-widest text-orange-500">Excess Stock</span>
                </div>
              );
            }
            const target = item.stockToKeep || 0;
            const stock = item.stockInHand || 0;
            const localDeficit = Math.max(0, target - stock);
            const itemKey = getProductMatchKey(item);
            const pendingQty = itemKey ? jointOrders
              .filter(o => (o.status === 'restock' || o.status === 'pending_allocation') && getProductMatchKey(o) === itemKey)
              .reduce((sum: number, o: any) => sum + (o[localBranchKey === 'bywood' ? 'allocationBywood' : 'allocationBroom'] || 0), 0) : 0;
            const suggestedOrder = Math.max(0, localDeficit - pendingQty);
            return (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-1">
                    <span className={`text-lg font-black ${suggestedOrder > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                    {suggestedOrder}
                    </span>
                    {suggestedOrder > 0 && !isReady && (
                    <button
                        onClick={() => {
                        onOrderDraftChange(item.id, localBranchKey, suggestedOrder.toString());
                        onSaveDraftOnBlur(item.id);
                        onToggleConfirmation(item.id, localBranchKey);
                        }}
                        className="ml-1 text-amber-400 hover:text-amber-300 hover:scale-110 transition-all"
                        data-tooltip="Fill joint order with suggested quantity"
                    >
                        <ArrowRight size={14} />
                    </button>
                    )}
                </div>
                {match?.isExcessStock && (
                   <span className="px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-[8px] font-black uppercase tracking-widest text-orange-500">Partner Excess</span>
                )}
              </div>
            );
          })()}
        </div>
      </td>

      {/* Joint Order */}
      <td className="p-6 text-right align-top">
        <div className="flex flex-col items-end gap-2 mt-1">
          <div className="flex items-center justify-end gap-3">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Order</span>
                <div className={`w-16 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${totalOrder > 0 ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>
                    {totalOrder}
                </div>
            </div>
            <button
                onClick={() => onPlaceJointOrder(item)}
                disabled={totalOrder <= 0 || !isReady}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shadow-lg mt-4 ${
                    totalOrder > 0 && isReady
                    ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-emerald-900/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'
                }`}
                data-tooltip={!isReady ? "At least one branch must confirm" : "Send Joint Order"}
            >
                <Send size={16} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

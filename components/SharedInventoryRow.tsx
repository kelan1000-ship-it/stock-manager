import React, { useState, useEffect } from 'react';
import { 
  Barcode, Hash, History as HistoryIcon, Lock, Send, Check, X, Ban
} from 'lucide-react';
import { BranchKey, Product } from '../types';
import { ProductThumbnail, CopyableText, Tooltip } from './ManagerComponents';
import { ProductNoteWidget } from './ProductNoteWidget';
import { useTooltip } from '../hooks/useTooltip';

interface SharedInventoryRowProps {
  item: Product;
  match: Product | undefined;
  currentBranch: BranchKey;
  otherBranch: BranchKey;
  draft: { bywood: number; broom: number };
  confirmations: { bywood: boolean; broom: boolean };
  onUpdateSharedValues: (barcode: string, field: 'price' | 'costPrice', value: number) => void;
  onUpdateTarget: (productId: string, branch: BranchKey, value: number) => void;
  onUpdateStock: (productId: string, branch: BranchKey, value: number) => void;
  onOrderDraftChange: (id: string, branch: 'bywood' | 'broom', val: string) => void;
  onToggleConfirmation: (id: string, branch: 'bywood' | 'broom') => void;
  onPlaceJointOrder: (item: Product) => void;
  onOpenEdit?: (product: Product) => void;
  onOpenHistory?: (product: Product) => void;
  onPreviewImage?: (src: string, title: string) => void;
  tagSettings: Record<string, any>;
  isNoteExpanded: boolean;
  onToggleNote: () => void;
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
  onUpdateStock,
  onOrderDraftChange, 
  onToggleConfirmation, 
  onPlaceJointOrder, 
  onOpenEdit, 
  onOpenHistory, 
  onPreviewImage, 
  tagSettings,
  isNoteExpanded,
  onToggleNote
}) => {
  // State for inputs to prevent jitter
  const [priceInput, setPriceInput] = useState(item.price.toFixed(2));
  const [costInput, setCostInput] = useState(item.costPrice.toFixed(2));
  const [localTarget, setLocalTarget] = useState(item.stockToKeep.toString());
  const [remoteTarget, setRemoteTarget] = useState(match ? match.stockToKeep.toString() : '');
  const [localStockInput, setLocalStockInput] = useState(item.stockInHand.toString());
  const [remoteStockInput, setRemoteStockInput] = useState(match ? match.stockInHand.toString() : '');

  // Effects to sync props to state
  useEffect(() => { setPriceInput(item.price.toFixed(2)); }, [item.price]);
  useEffect(() => { setCostInput(item.costPrice.toFixed(2)); }, [item.costPrice]);
  useEffect(() => { setLocalTarget(item.stockToKeep.toString()); }, [item.stockToKeep]);
  useEffect(() => { setLocalStockInput(item.stockInHand.toString()); }, [item.stockInHand]);
  useEffect(() => { if (match) setRemoteTarget(match.stockToKeep.toString()); }, [match?.stockToKeep]);
  useEffect(() => { if (match) setRemoteStockInput(match.stockInHand.toString()); }, [match?.stockInHand]);

  // Handlers
  const handlePriceBlur = () => {
    const val = parseFloat(priceInput);
    if (!isNaN(val) && Math.abs(val - item.price) > 0.001) onUpdateSharedValues(item.barcode, 'price', val);
    else setPriceInput(item.price.toFixed(2));
  };
  const handleCostBlur = () => {
    const val = parseFloat(costInput);
    if (!isNaN(val) && Math.abs(val - item.costPrice) > 0.001) onUpdateSharedValues(item.barcode, 'costPrice', val);
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
  const totalOrder = (draft.bywood || 0) + (draft.broom || 0);
  const isReady = confirmations.bywood && confirmations.broom;

  return (
    <tr className="group hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-0">
      {/* Product Detail */}
      <td className="p-6 align-top">
        <div className="flex items-start gap-4">
            <div className="flex flex-col gap-2 shrink-0">
                <ProductThumbnail 
                    src={item.productImage} 
                    alt={item.name} 
                    onClick={() => item.productImage && onPreviewImage && onPreviewImage(item.productImage, item.name)} 
                />
                <ProductNoteWidget id={item.id} notes={item.notes} isExpanded={isNoteExpanded} onToggle={onToggleNote} stockType={item.stockType} />
            </div>
            <div className="pt-0.5 min-w-0 flex-1">
              <button 
                  onClick={() => onOpenEdit && onOpenEdit(item)}
                  className="text-sm font-black text-white hover:text-indigo-400 transition-colors text-left truncate w-full"
              >
                  {item.name}
              </button>
              <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{item.packSize}</span>
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
                  {item.barcode && <CopyableText text={item.barcode} label="BAR" icon={<Barcode size={10} />} />}
                  {item.productCode && <CopyableText text={item.productCode} label="PIP" icon={<Hash size={10} />} />}
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
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Target:</span>
                <input 
                    type="number"
                    min="0"
                    value={localTarget}
                    onChange={(e) => setLocalTarget(e.target.value)}
                    onBlur={handleLocalTargetBlur}
                    className="w-8 bg-transparent border-b border-slate-800 hover:border-slate-600 text-center text-[9px] font-bold text-slate-500 focus:text-indigo-400 focus:border-indigo-500 outline-none transition-colors p-0"
                />
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
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">Target:</span>
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
            </div>
            
            {match?.isDiscontinued ? (
               <div className="flex items-center justify-center gap-1 mt-1 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 w-full min-h-[34px]">
                  <Ban size={12} className="text-rose-500" />
                  <span className="text-[8px] font-black uppercase text-rose-500 tracking-widest">Unavailable</span>
               </div>
            ) : (
                <div className={`flex items-center gap-1 mt-1 rounded-lg p-1 border transition-all ${confirmations[partnerBranchKey] ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                {confirmations[partnerBranchKey] ? (
                    <>
                        <span className="text-[8px] font-black uppercase text-emerald-500 px-1">Ready</span>
                        <div className="w-10 h-6 flex items-center justify-center font-black text-white text-xs">{draft[partnerBranchKey] || 0}</div>
                        <button 
                            onClick={() => onToggleConfirmation(item.id, partnerBranchKey)} 
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
                            value={draft[partnerBranchKey] || ''}
                            onChange={(e) => onOrderDraftChange(item.id, partnerBranchKey, e.target.value)}
                            placeholder="0"
                            className="w-10 h-6 bg-slate-800 rounded border border-slate-700 text-center text-xs font-bold text-amber-500 outline-none focus:border-indigo-500"
                        />
                        <button 
                            onClick={() => onToggleConfirmation(item.id, partnerBranchKey)} 
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

      {/* Joint Order */}
      <td className="p-6 text-right align-top">
        <div className="flex items-center justify-end gap-3 mt-1">
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
              title={!isReady ? "Both branches must confirm their orders" : "Send Joint Order"}
          >
              {isReady ? <Send size={16} /> : <Lock size={16} />}
          </button>
        </div>
      </td>
    </tr>
  );
};

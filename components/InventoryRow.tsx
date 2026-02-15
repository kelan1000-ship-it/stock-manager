
import React, { useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle2, Link2, Link2Off, XCircle, Handshake, Ban, Store, ShieldAlert,
  Clock, Printer, Hash, MapPin, CheckSquare, Square, ArrowRightLeft, History as HistoryIcon, Barcode, CornerDownRight
} from 'lucide-react';
import { Product, ColumnVisibility } from '../types';
import { useMultiKeyLookup } from '../hooks/useMultiKeyLookup';
import { useTooltip } from '../hooks/useTooltip';
import {
  TooltipIconButton, CopyableText, ComparisonBubble, Tooltip, ProductThumbnail, ProductActionsDropdown
} from './ManagerComponents';
import { ProductNoteWidget } from './ProductNoteWidget';
import { StockCell } from './StockCell';
import { PriceCell } from './PriceCell';
import { OrderCell } from './OrderCell';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { PricingDeskReturn, PricingAlert } from '../hooks/usePricingDesk';
import { TagStyle } from '../hooks/useInventoryTags';

export const InventoryRow: React.FC<{
  item: Product;
  logic: StockLogicReturn;
  pricingLogic: PricingDeskReturn;
  tagSettings: Record<string, TagStyle>;
  onOpenEdit: (p: Product) => void;
  onOpenTransfer: (p: Product) => void;
  onOpenHistory: (p: Product) => void;
  isToOrderActive?: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  manualQty?: number;
  onManualQtyChange?: (id: string, qty: number) => void;
  onPreviewImage: (src: string, title: string) => void;
  isNoteExpanded: boolean;
  onToggleNote: () => void;
  isGroupChild?: boolean;
  columns: ColumnVisibility;
}> = ({
  item, logic, pricingLogic, tagSettings, onOpenEdit, onOpenTransfer, onOpenHistory, isSelected, onToggleSelection, manualQty, onManualQtyChange, onPreviewImage, isNoteExpanded, onToggleNote, isGroupChild, columns
}) => {
  const margin = item.price > 0 ? ((item.price - item.costPrice) / item.price * 100) : 0;
  
  const isCriticalReorder = !item.isDiscontinued && item.stockInHand <= (item.stockToKeep * 0.1);
  const defaultRestock = Math.max(0, item.stockToKeep - item.stockInHand);
  const currentRestockQty = manualQty !== undefined ? manualQty : defaultRestock;

  const otherBranch = logic.currentBranch === 'bywood' ? 'broom' : 'bywood';
  const otherInventory = logic.branchData[otherBranch] || [];
  
  const crossSiteMatches = useMultiKeyLookup(
    { name: item.name, barcode: item.barcode, productCode: item.productCode }, 
    otherInventory
  );
  
  const otherBranchStock = crossSiteMatches.reduce((acc, match) => acc + match.stockInHand, 0);
  const otherBranchParts = crossSiteMatches.reduce((acc, match) => acc + (match.partPacks || 0), 0);
  const primaryMatch = crossSiteMatches[0];

  const isLocalDuplicate = useMemo(() => {
    if (!item.barcode) return false;
    const localItems = logic.branchData[logic.currentBranch] || [];
    return localItems.some((p: Product) => p.barcode === item.barcode && p.id !== item.id && !p.deletedAt);
  }, [item.barcode, item.id, logic.branchData, logic.currentBranch]);

  const { isVisible: isCompareVisible, coords: compareCoords, tooltipHandlers: compareHandlers } = useTooltip(300);
  const { isVisible: isSharedVisible, coords: sharedCoords, tooltipHandlers: sharedHandlers } = useTooltip(300);
  const { isVisible: isSyncedVisible, coords: syncedCoords, tooltipHandlers: syncedHandlers } = useTooltip(300);
  const { isVisible: isAlertVisible, coords: alertCoords, tooltipHandlers: alertHandlers } = useTooltip(300);
  const { isVisible: isBanVisible, coords: banCoords, tooltipHandlers: banHandlers } = useTooltip(300);
  const { isVisible: isExpiryVisible, coords: expiryCoords, tooltipHandlers: expiryHandlers } = useTooltip(300);

  const { isShortExpiry, isCriticalExpiry } = useMemo(() => {
    if (!item.expiryDate) return { isShortExpiry: false, isCriticalExpiry: false };
    const expiry = new Date(item.expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      isShortExpiry: diffDays <= 90 && diffDays > 0,
      isCriticalExpiry: diffDays <= 30 && diffDays > 0
    };
  }, [item.expiryDate]);

  let statusText = 'Healthy';
  let statusColor = 'emerald';
  
  if (item.isDiscontinued) { statusText = 'Unavailable'; statusColor = 'rose'; }
  else if (item.isUnavailable) { statusText = 'Backorder'; statusColor = 'amber'; }
  else if (item.stockInHand === 0) { statusText = 'Out of Stock'; statusColor = 'rose'; }
  else if (item.stockInHand <= (item.stockToKeep * 0.1)) { statusText = 'Critical Reorder'; statusColor = 'rose'; }
  else if (item.stockInHand <= (item.stockToKeep * 0.25)) { statusText = 'Low Stock'; statusColor = 'amber'; }

  const isBinView = logic.mainView === 'bin';
  const isArchiveView = logic.mainView === 'archive';

  if (isBinView && item.deletedAt) {
    const diffDays = Math.ceil((new Date(new Date(item.deletedAt).getTime() + (30 * 24 * 60 * 60 * 1000)).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    statusText = `${Math.max(0, diffDays)} DAYS LEFT`;
    statusColor = diffDays <= 5 ? 'rose' : 'amber';
  } else if (isArchiveView) {
    statusText = 'ARCHIVED'; statusColor = 'amber';
  }

  const alert = pricingLogic.alerts.find((a: PricingAlert) => a.barcode === item.barcode);
  const orderKey = logic.currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
  const activeOrder = (logic.branchData[orderKey] || []).find((o: { productId: string; status: string }) => o.productId === item.id && ['pending', 'ordered', 'backorder'].includes(o.status));

  if (logic.subFilter === 'alerts' && alert) {
    return (
      <tr className={`transition-all duration-300 bg-amber-500/[0.03] border-l-4 ${alert.severity === 'high' ? 'border-l-rose-500' : 'border-l-amber-500'}`}>
        <td className="p-4" colSpan={2}>
           <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.severity === 'high' ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-amber-500/20 text-amber-500'}`}><AlertTriangle size={20} /></div>
              <div><button onClick={() => onOpenEdit(item)} className="font-black text-sm hover:text-emerald-500 transition-all text-left text-white capitalize">{item.name}</button><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] font-mono text-slate-500">{item.barcode}</span><span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-500">Branch Price Gap</span></div></div>
           </div>
        </td>
        <td className="p-4 text-center" colSpan={3}>
           <div className="flex items-center justify-center gap-6"><div className="text-center"><p className="text-[8px] font-black uppercase text-slate-500 mb-1 text-center">Local Price</p><p className="font-black text-sm text-slate-400">£{alert.localPrice.toFixed(2)}</p></div><div className="text-center"><p className="text-[8px] font-black uppercase text-slate-500 mb-1 text-center">{alert.referenceSiteName} RRP</p><p className="font-black text-sm text-emerald-500">£{alert.referencePrice.toFixed(2)}</p></div></div>
        </td>
        <td className="p-4 text-right" colSpan={3}>
           <div className="flex justify-end gap-2"><button onClick={() => pricingLogic.handleMatch(item.barcode)} className="px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={14} /> Match RRP</button><button onClick={() => pricingLogic.toggleSync(item.barcode)} className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${alert.isPriceSynced ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{alert.isPriceSynced ? <Link2 size={14} /> : <Link2Off size={14} />} {alert.isPriceSynced ? 'Stop Sync' : 'Price Sync'}</button><button onClick={() => pricingLogic.handleIgnore(item.barcode)} className="px-4 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 hover:text-yellow-400 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2" title="Ignore Price Gap"><XCircle size={14} /> Ignore Difference</button></div>
        </td>
      </tr>
    );
  }

  return (
    <tr key={item.id} className={`transition-all duration-200 group border-b border-slate-800/50 ${isNoteExpanded ? 'relative z-50 bg-slate-900/30' : ''} ${isCriticalReorder || isCriticalExpiry || alert || isLocalDuplicate ? 'bg-rose-500/[0.03]' : 'hover:bg-slate-800/40'} ${isSelected ? 'bg-emerald-600/5' : ''}`}>
      <td className="p-4 align-top pt-5">
        <button onClick={onToggleSelection} className={`transition-colors ${isSelected ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>
      </td>
      <td className={`p-4 min-w-[320px] align-top ${isNoteExpanded ? 'relative z-50' : ''}`}>
        <div className="flex items-start gap-3">
          {isGroupChild && (
             <div className="w-8 h-10 flex items-center justify-center shrink-0 opacity-30 pt-1">
                <CornerDownRight className="text-slate-400" size={24} />
             </div>
          )}
          <div className="flex flex-col gap-2 shrink-0 group-hover:scale-105 transition-transform duration-300">
            <ProductThumbnail src={item.productImage} alt={item.name} onClick={() => item.productImage && onPreviewImage(item.productImage, item.name)} />
            <ProductNoteWidget id={item.id} notes={item.notes} isExpanded={isNoteExpanded} onToggle={onToggleNote} stockType={item.stockType} />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => onOpenEdit(item)} className="font-bold text-sm hover:text-emerald-500 transition-colors truncate text-left tracking-tight text-white capitalize">{item.name}</button>
                <div className="flex shrink-0 gap-1.5 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                  {item.isShared && <div className="relative" {...sharedHandlers}><Handshake size={13} className="text-blue-500" /><Tooltip x={sharedCoords.x} y={sharedCoords.y} isVisible={isSharedVisible}>Cross-Site Shared Inventory</Tooltip></div>}
                  {item.isPriceSynced && <div className="relative" {...syncedHandlers}><Link2 size={13} className="text-indigo-400" /><Tooltip x={syncedCoords.x} y={syncedCoords.y} isVisible={isSyncedVisible}>Real-time Price Synchronization</Tooltip></div>}
                  {item.enableThresholdAlert && <div className="relative" {...alertHandlers}><AlertCircle size={13} className="text-amber-500" /><Tooltip x={alertCoords.x} y={alertCoords.y} isVisible={isAlertVisible}>Low stock threshold reached</Tooltip></div>}
                  {item.isDiscontinued && <div className="relative" {...banHandlers}><Ban size={13} className="text-rose-500" /><Tooltip x={banCoords.x} y={banCoords.y} isVisible={isBanVisible}>Product Unavailable</Tooltip></div>}
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">{item.packSize}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[18px]">
              {primaryMatch && (
                <><button {...compareHandlers} className="px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 transition-all bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white"><Store size={10} /> {otherBranch.toUpperCase()}: {otherBranchStock}{item.stockType === 'dispensary' && otherBranchParts > 0 ? `+${otherBranchParts}` : ''}</button><ComparisonBubble isVisible={isCompareVisible} x={compareCoords.x} y={compareCoords.y} item={item} match={primaryMatch} activeBranch={logic.currentBranch.toUpperCase()} otherBranch={otherBranch.toUpperCase()} /></>
              )}
              {isLocalDuplicate && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5 animate-pulse"><AlertTriangle size={10}/> DUPLICATE</span>}
              
              {(isShortExpiry || isCriticalExpiry) && (
                <div className="relative" {...expiryHandlers}>
                  {isCriticalExpiry ? (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5 animate-pulse">
                      <ShieldAlert size={10}/> CRITICAL EXP
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5 bg-amber-500/10 border-amber-500/20 text-amber-500">
                      <Clock size={10}/> Short Exp
                    </span>
                  )}
                  <Tooltip x={expiryCoords.x} y={expiryCoords.y} isVisible={isExpiryVisible}>
                    Expires: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                  </Tooltip>
                </div>
              )}

              {item.isReducedToClear && <span className="px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-tighter bg-orange-500/10 border-orange-500/20 text-orange-500">Reduced</span>}
              {item.labelNeedsUpdate && <span className="px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5 animate-pulse bg-indigo-500/10 border-indigo-500/20 text-indigo-400"><Printer size={10}/> Label Req</span>}
              {item.tags?.map(tag => {
                const settings = tagSettings[tag];
                return <span key={tag} style={settings?.color ? { backgroundColor: settings.color, color: '#fff', borderColor: 'transparent' } : {}} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-slate-800 border-slate-700/50 text-slate-400 ${settings?.isFlashing ? 'animate-tag-flash' : ''}`}>#{tag}</span>;
              })}
            </div>
            <div className={`flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/30 transition-opacity duration-200 ${isNoteExpanded ? 'opacity-0 pointer-events-none' : ''}`}>
              {item.productCode && <CopyableText text={item.productCode} label="PIP" icon={<Hash size={10}/>} />}
              <CopyableText text={item.barcode} label="BAR" icon={<Barcode size={10}/>} />
              {item.location && <CopyableText text={item.location} label="LOC" icon={<MapPin size={10}/>} />}
            </div>
          </div>
        </div>
      </td>
      
      {columns.rrp && (
        <PriceCell item={item} alert={alert} onUpdatePrice={logic.updateProductPrice} onUpdateItem={logic.updateProductItem} />
      )}
      
      {columns.margin && (
        <td className="p-4 text-center align-top pt-5">
          <div className="mt-7"><span className={`text-xs font-black ${margin > 30 ? 'text-emerald-500' : margin > 15 ? 'text-amber-500' : 'text-rose-500'}`}>{margin.toFixed(1)}%</span></div>
        </td>
      )}
      
      {columns.stock && (
        <StockCell item={item} onUpdateStockInHand={logic.updateProductStockInHand} onUpdateStockToKeep={logic.updateProductStockToKeep} onUpdatePartPacks={logic.updateProductPartPacks} />
      )}
      
      {columns.order && (
        <OrderCell item={item} activeOrder={activeOrder} statusColor={statusColor} manualQty={currentRestockQty} onManualQtyChange={onManualQtyChange} onSendToOrder={logic.sendToOrder} onReceiveOrder={logic.receiveOrder} onRemoveOrder={logic.removeOrder} onViewShared={() => { logic.setSearchQuery(item.barcode || item.name); logic.setMainView('shared-stock'); }} />
      )}
      
      {columns.status && (
        <td className="p-4 text-center align-top pt-5">
          <div className="mt-6">
            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-${statusColor}-500/20 bg-${statusColor}-500/10 text-${statusColor}-500 flex items-center justify-center gap-1 w-fit mx-auto`}>
              {((isCriticalReorder || isCriticalExpiry) && !isBinView && !isArchiveView) && <AlertCircle size={10} />} {statusText}
            </span>
          </div>
        </td>
      )}
      
      <td className="p-4 text-right align-top pt-5">
        <div className="flex justify-end gap-1.5 mt-6 transition-all duration-300">
          <TooltipIconButton onClick={() => onOpenTransfer(item)} tooltip="Internal Stock Transfer" icon={ArrowRightLeft} className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all bg-slate-800 border-slate-700 text-amber-500 hover:bg-amber-600 hover:text-white hover:border-amber-500 shadow-sm hover:shadow-md" />
          <TooltipIconButton onClick={() => onOpenHistory(item)} tooltip="Audit & History" icon={HistoryIcon} className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all bg-slate-800 border-slate-700 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 shadow-sm hover:shadow-md" />
          <ProductActionsDropdown isArchived={item.isArchived} deletedAt={item.deletedAt} onRestore={() => logic.restoreProduct(item.id)} onArchive={() => logic.toggleArchive(item.id)} onDelete={() => logic.handleDeleteProduct(item.id, !!item.deletedAt)} theme="dark" />
        </div>
      </td>
    </tr>
  );
};

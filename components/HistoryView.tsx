
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { X, History, TrendingUp, ShoppingBag, Clock, AlertTriangle, Loader2, Calendar, ArrowUpRight, ArrowDownLeft, RefreshCw, Box, Layers, Store } from 'lucide-react';
import { Product, BranchData } from '../types';
import { StockState } from './stockSlice';
import { useHistory } from '../hooks/useHistory';
import { useAuth } from '../contexts/AuthContext';

interface HistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  theme: 'dark';
}

export const HistoryView: React.FC<HistoryViewProps> = ({ isOpen, onClose, product }) => {
  const { currentBranch } = useAuth();
  const stock = useSelector((state: { stock: StockState }) => state.stock);
  const branchData: BranchData = {
    bywood: stock.bywood, broom: stock.broom,
    messages: stock.messages, transfers: stock.transfers,
    bywoodRequests: stock.bywoodRequests, broomRequests: stock.broomRequests,
    bywoodRequests_archived: stock.bywoodRequests_archived, broomRequests_archived: stock.broomRequests_archived,
    bywoodOrders: stock.bywoodOrders, broomOrders: stock.broomOrders, jointOrders: stock.jointOrders,
    masterInventory: stock.masterInventory,
    bywoodPlanograms: stock.bywoodPlanograms, broomPlanograms: stock.broomPlanograms,
    bywoodFloorPlans: stock.bywoodFloorPlans, broomFloorPlans: stock.broomFloorPlans,
    suppliers: stock.suppliers, tasks: stock.tasks,
    screenshotHistory: stock.screenshotHistory, sharedOrderDrafts: stock.sharedOrderDrafts,
  };
  const [activeTab, setActiveTab] = useState<'price' | 'orders' | 'movements' | 'combined'>('price');
  const { priceAdjustments, orderHistory, stockMovements, isLoading, error, fetchHistory, clearHistory } = useHistory();

  useEffect(() => {
    if (isOpen && product) {
      fetchHistory(product);
      setActiveTab('price');
    } else if (!isOpen) {
      clearHistory();
    }
  }, [isOpen, product, fetchHistory, clearHistory]);

  const otherBranchKey = currentBranch === 'bywood' ? 'broom' : 'bywood';
  const otherProduct = useMemo(() => {
    if (!product || !product.isShared || !product.barcode) return null;
    return branchData[otherBranchKey]?.find(p => p.barcode === product.barcode && !p.deletedAt);
  }, [product, branchData, otherBranchKey]);

  const combinedHistory = useMemo(() => {
    if (!product || !otherProduct) return [];
    
    const local = (product.stockHistory || []).map(m => ({ ...m, originBranch: currentBranch }));
    const remote = (otherProduct.stockHistory || []).map(m => ({ ...m, originBranch: otherBranchKey }));
    
    return [...local, ...remote].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [product, otherProduct, currentBranch, otherBranchKey]);

  const combinedStats = useMemo(() => {
    if (!product || !otherProduct) return null;
    return {
      totalStock: product.stockInHand + otherProduct.stockInHand,
      totalValue: (product.stockInHand * product.costPrice) + (otherProduct.stockInHand * otherProduct.costPrice)
    };
  }, [product, otherProduct]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[85vh] bg-slate-900 border-slate-800 text-slate-100">
        <div className="p-8 border-b flex items-center justify-between border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors bg-blue-500/10 border-blue-500/20 text-blue-500">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Audit Trail</h2>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-slate-800 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pt-6">
          <div className="flex p-1.5 rounded-2xl border w-full overflow-x-auto no-scrollbar transition-colors bg-slate-800/50 border-slate-800 gap-1">
            <button 
              onClick={() => setActiveTab('price')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                activeTab === 'price' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <TrendingUp size={14} /> Prices
            </button>
            <button 
              onClick={() => setActiveTab('movements')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                activeTab === 'movements' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <RefreshCw size={14} /> Stock Movements
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ShoppingBag size={14} /> Orders
            </button>
            {otherProduct && (
              <button 
                onClick={() => setActiveTab('combined')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  activeTab === 'combined' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Layers size={14} /> Shared View
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compiling history...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex flex-col items-center text-center gap-3">
              <AlertTriangle size={32} />
              <p className="text-sm font-black">{error}</p>
            </div>
          ) : activeTab === 'combined' ? (
            <div className="space-y-6">
               {combinedStats && (
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                       <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Total Network Stock</p>
                       <p className="text-2xl font-black text-white">{combinedStats.totalStock} <span className="text-sm text-indigo-400">units</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                       <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Combined Asset Value</p>
                       <p className="text-2xl font-black text-white">£{combinedStats.totalValue.toFixed(2)}</p>
                    </div>
                 </div>
               )}
               
               <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2 px-2">
                     <Layers size={14} className="text-indigo-400" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Combined Movement Log</span>
                  </div>
                  {combinedHistory.length === 0 ? (
                    <div className="py-12 text-center font-black uppercase text-[10px] tracking-widest border border-dashed rounded-3xl text-slate-500 border-slate-800">No combined movements found</div>
                  ) : (
                    combinedHistory.map((mv, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border flex items-center justify-between transition-colors bg-slate-800/30 border-slate-800 relative overflow-hidden">
                         <div className={`absolute left-0 top-0 bottom-0 w-1 ${mv.originBranch === currentBranch ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                         <div className="flex items-center gap-4 pl-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              mv.type === 'order' ? 'bg-emerald-500/10 text-emerald-500' : 
                              mv.type === 'transfer_in' ? 'bg-indigo-500/10 text-indigo-500' :
                              mv.type === 'transfer_out' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>
                               {mv.type === 'order' ? <ArrowDownLeft size={18}/> : 
                                mv.type === 'transfer_in' ? <ArrowDownLeft size={18}/> :
                                mv.type === 'transfer_out' ? <ArrowUpRight size={18}/> :
                                <Box size={18}/>}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase px-1.5 rounded border ${
                                   mv.originBranch === currentBranch ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                                }`}>
                                   {mv.originBranch === 'bywood' ? 'BYWOOD' : 'BROOM'}
                                </span>
                                <p className="text-sm font-black text-white">
                                   {mv.change > 0 ? '+' : ''}{mv.change} Units
                                </p>
                              </div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{mv.note || 'Adjustment'}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400">{new Date(mv.date).toLocaleDateString()}</p>
                            <p className="text-[8px] font-bold text-slate-500">{new Date(mv.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          ) : activeTab === 'price' ? (
            <div className="space-y-4">
              {priceAdjustments.length === 0 ? (
                <div className="py-12 text-center font-black uppercase text-[10px] tracking-widest border border-dashed rounded-3xl text-slate-500 border-slate-800">No adjustments recorded</div>
              ) : (
                <div className="space-y-3">
                  {[...priceAdjustments].reverse().map((record, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border flex items-center justify-between transition-colors bg-slate-800/30 border-slate-800">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-500 uppercase">{new Date(record.date).toLocaleDateString()} at {new Date(record.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-lg font-black text-emerald-500">£{record.rrp.toFixed(2)}</span>
                             <span className="text-[10px] font-bold text-slate-500">Cost: £{record.costPrice.toFixed(2)}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest ${record.margin > 30 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                             {record.margin.toFixed(1)}% Margin
                          </span>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'movements' ? (
            <div className="space-y-4">
              {stockMovements.length === 0 ? (
                <div className="py-12 text-center font-black uppercase text-[10px] tracking-widest border border-dashed rounded-3xl text-slate-500 border-slate-800">No movements recorded</div>
              ) : (
                <div className="space-y-3">
                  {[...stockMovements].reverse().map((mv, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border flex items-center justify-between transition-colors bg-slate-800/30 border-slate-800">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            mv.type === 'order' ? 'bg-emerald-500/10 text-emerald-500' : 
                            mv.type === 'transfer_in' ? 'bg-indigo-500/10 text-indigo-500' :
                            mv.type === 'transfer_out' ? 'bg-rose-500/10 text-rose-500' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>
                             {mv.type === 'order' ? <ArrowDownLeft size={18}/> : 
                              mv.type === 'transfer_in' ? <ArrowDownLeft size={18}/> :
                              mv.type === 'transfer_out' ? <ArrowUpRight size={18}/> :
                              <Box size={18}/>}
                          </div>
                          <div>
                            <p className="text-sm font-black flex items-center gap-2 text-white">
                               {mv.change > 0 ? '+' : ''}{mv.change} Units
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">• {mv.type.replace('_', ' ')}</span>
                            </p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase">{mv.note || 'Adjustment'}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400">{new Date(mv.date).toLocaleDateString()}</p>
                          <p className="text-[8px] font-bold text-slate-500">Balance: {mv.newBalance}</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {orderHistory.length === 0 ? (
                <div className="py-12 text-center font-black uppercase text-[10px] tracking-widest border border-dashed rounded-3xl text-slate-500 border-slate-800">No order history available</div>
              ) : (
                <div className="grid gap-3">
                  {[...orderHistory].reverse().map((order, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border flex items-center justify-between transition-colors bg-slate-800/30 border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 text-slate-500">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">Received {order.quantity} units</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(order.date).toLocaleDateString()} • System Log</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 border-t transition-colors border-slate-800/50 bg-slate-800/20">
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-sm bg-slate-800 hover:bg-slate-700 text-white"
          >
            Exit Audit
          </button>
        </div>
      </div>
    </div>
  );
};

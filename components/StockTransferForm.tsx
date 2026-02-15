
import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRightLeft, Package, AlertTriangle, CheckCircle2, Loader2, Target, History, Box, Pill, Send, Search, Notebook, ArrowRight, ArrowLeft, MoveRight, MoveLeft } from 'lucide-react';
import { Product, Transfer, BranchKey, BranchData } from '../types';
import { useStockTransfer } from '../hooks/useStockTransfer';

interface StockTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  currentBranch: BranchKey;
  onCompleteInternal: (product: Product, quantity: number, partQuantity?: number, type?: 'send' | 'request', note?: string) => void;
  theme: 'light' | 'dark';
  branchData?: BranchData;
}

export const StockTransferForm: React.FC<StockTransferFormProps> = ({
  isOpen,
  onClose,
  product,
  currentBranch,
  onCompleteInternal,
  theme,
  branchData
}) => {
  const [transferType, setTransferType] = useState<'send' | 'request'>('send');
  const [quantity, setQuantity] = useState<number>(0);
  const [partQuantity, setPartQuantity] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { isSubmitting, error: apiError, success, sendTransferToSheets, resetStatus } = useStockTransfer();

  // Retrieve other branch stock from branchData (live Firestore data)
  const otherBranchStockData = useMemo(() => {
    if (!isOpen || !product) return { full: 0, parts: 0 };
    try {
      if (!branchData) return { full: 0, parts: 0 };
      const otherBranchKey: BranchKey = currentBranch === 'bywood' ? 'broom' : 'bywood';
      const otherInventory: Product[] = branchData[otherBranchKey] || [];
      const matches = otherInventory.filter(p => p.barcode === product.barcode && !p.deletedAt);
      return {
        full: matches.reduce((acc, m) => acc + m.stockInHand, 0),
        parts: matches.reduce((acc, m) => acc + (m.partPacks || 0), 0)
      };
    } catch (e) {
      console.error("Error accessing other branch data", e);
      return { full: 0, parts: 0 };
    }
  }, [isOpen, product, currentBranch, branchData]);

  useEffect(() => {
    if (isOpen) {
      setTransferType('send');
      setQuantity(0);
      setPartQuantity(0);
      setNote('');
      setLocalError(null);
      resetStatus();
    }
  }, [isOpen, resetStatus]);

  if (!isOpen || !product) return null;

  const targetBranch: BranchKey = currentBranch === 'bywood' ? 'broom' : 'bywood';
  const branchLabels = {
    bywood: 'Bywood Ave',
    broom: 'Broom Rd'
  };

  const handleTransfer = async () => {
    // Validation
    if (quantity < 0 || partQuantity < 0) {
      setLocalError("Quantities cannot be negative.");
      return;
    }
    if (quantity === 0 && partQuantity === 0) {
      setLocalError("Please enter a quantity.");
      return;
    }
    
    if (transferType === 'send') {
      // Logic for sending stock (check local)
      if (quantity > product.stockInHand) {
        setLocalError(`Insufficient local packs (${product.stockInHand}).`);
        return;
      }
      if (partQuantity > (product.partPacks || 0)) {
        setLocalError(`Insufficient local parts (${product.partPacks || 0}).`);
        return;
      }
    } else {
      // Logic for requesting stock (check target branch)
      if (quantity > otherBranchStockData.full) {
        setLocalError(`Target branch has only ${otherBranchStockData.full} packs.`);
        return;
      }
      if (partQuantity > otherBranchStockData.parts) {
        setLocalError(`Target branch has only ${otherBranchStockData.parts} parts.`);
        return;
      }
    }

    const transferData: Transfer = {
      id: `tr_${Date.now()}`,
      type: transferType,
      sourceBranch: currentBranch,
      targetBranch,
      barcode: product.barcode,
      name: product.name,
      packSize: product.packSize,
      quantity: quantity,
      partQuantity: partQuantity,
      timestamp: new Date().toISOString(),
      status: 'pending',
      note: note.trim()
    };

    // 1. Send to external log (Google Sheets)
    await sendTransferToSheets(transferData);

    // 2. Perform internal state update
    onCompleteInternal(product, quantity, partQuantity, transferType, note.trim());

    // Close after a brief delay if successful
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const isDispensary = product.stockType === 'dispensary';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className={`relative w-full max-w-[460px] rounded-[2.5rem] border shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide animate-in zoom-in duration-200 ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <div className="px-8 py-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                transferType === 'send' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {transferType === 'send' ? <Send size={24} /> : <Search size={24} />}
              </div>
              <div>
                <h2 className="text-xl font-black leading-none">{transferType === 'send' ? 'Send Stock' : 'Request Stock'}</h2>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">Logistics Desk</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Toggle Type */}
          <div className="flex p-1.5 rounded-2xl bg-slate-800/50 border border-slate-800">
             <button 
                onClick={() => setTransferType('send')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  transferType === 'send' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
             >
                Send
             </button>
             <button 
                onClick={() => setTransferType('request')}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  transferType === 'request' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
             >
                Request
             </button>
          </div>

          {/* Product Info Compact */}
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 ${isDispensary ? 'text-violet-400' : 'text-slate-400'}`}>
                {isDispensary ? <Pill size={20} /> : <Package size={20} />}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black truncate text-white capitalize">{product.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{product.packSize} • {product.barcode}</p>
              </div>
            </div>

            {/* Branch Comparison Area with Visual Aid & Loose Stock */}
            <div className="relative flex items-center gap-2">
              {/* Current Branch Card */}
              <div className={`flex-1 p-4 rounded-xl bg-slate-950/50 border transition-all duration-300 ${transferType === 'send' ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-800'}`}>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">{branchLabels[currentBranch]}</p>
                <div className="space-y-1">
                  <p className={`text-3xl font-black leading-none transition-colors ${transferType === 'send' ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                    {product.stockInHand} <span className={`text-[9px] font-bold tracking-tighter align-middle ${transferType === 'send' ? 'text-amber-600' : 'text-slate-600'}`}>Full</span>
                  </p>
                  <p className={`text-lg font-black leading-none transition-colors ${transferType === 'send' ? 'text-amber-400/80 animate-pulse' : 'text-slate-400'}`}>
                    {product.partPacks || 0} <span className={`text-[9px] font-bold tracking-tighter align-middle ${transferType === 'send' ? 'text-amber-600' : 'text-slate-600'}`}>Loose</span>
                  </p>
                </div>
              </div>

              {/* Visual Direction Aid */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 shadow-lg ${
                  transferType === 'send' 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-amber-900/20' 
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-indigo-900/20'
                }`}>
                  {transferType === 'send' ? (
                    <ArrowRight size={16} className="animate-pulse" />
                  ) : (
                    <ArrowLeft size={16} className="animate-pulse" />
                  )}
                </div>
              </div>

              {/* Target Branch Card */}
              <div className={`flex-1 p-4 rounded-xl bg-slate-950/50 border transition-all duration-300 ${transferType === 'request' ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-800'}`}>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2 text-right">{branchLabels[targetBranch]}</p>
                <div className="space-y-1 text-right">
                  <p className={`text-3xl font-black leading-none transition-colors ${transferType === 'request' ? 'text-emerald-400 animate-pulse' : 'text-white'}`}>
                    <span className={`text-[9px] mr-1 font-bold tracking-tighter align-middle ${transferType === 'request' ? 'text-emerald-600' : 'text-slate-600'}`}>Full</span> {otherBranchStockData.full}
                  </p>
                  <p className={`text-lg font-black leading-none transition-colors ${transferType === 'request' ? 'text-emerald-400/80 animate-pulse' : 'text-slate-400'}`}>
                    <span className={`text-[9px] mr-1 font-bold tracking-tighter align-middle ${transferType === 'request' ? 'text-emerald-600' : 'text-slate-600'}`}>Loose</span> {otherBranchStockData.parts}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quantities Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-widest">Packs</label>
              <input 
                type="number" 
                value={quantity || ''} 
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  setQuantity(parseInt(e.target.value) || 0);
                  setLocalError(null);
                }}
                className={`w-full p-4 rounded-2xl bg-slate-800/50 border text-2xl font-black text-center outline-none transition-all ${
                  localError ? 'border-rose-500' : 
                  transferType === 'send' ? 'border-slate-800 focus:border-amber-500' : 'border-slate-800 focus:border-indigo-500'
                }`}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-widest">Loose</label>
              <input 
                type="number" 
                value={partQuantity || ''} 
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  setPartQuantity(parseInt(e.target.value) || 0);
                  setLocalError(null);
                }}
                className={`w-full p-4 rounded-2xl bg-slate-800/50 border text-2xl font-black text-center outline-none transition-all ${
                  localError ? 'border-rose-500' : 
                  transferType === 'send' ? 'border-slate-800 focus:border-amber-500' : 'border-slate-800 focus:border-indigo-500'
                }`}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-widest">Administrative Note</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-xs font-bold outline-none focus:border-yellow-500/50 text-yellow-100 placeholder-yellow-500/30 resize-none transition-all shadow-inner"
              placeholder="Provide reason for transfer..."
            />
          </div>
          
          {localError && (
            <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase px-1 animate-in fade-in">
              <AlertTriangle size={14} /> {localError}
            </div>
          )}

          {(apiError || success) && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 ${
              success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}>
              {success ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
                {success ? 'Transfer Logged Successfully' : apiError}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleTransfer}
              disabled={isSubmitting || (quantity <= 0 && partQuantity <= 0)}
              className={`flex-[1.5] py-4 rounded-2xl font-black text-[11px] uppercase text-white transition-all shadow-xl disabled:opacity-30 flex items-center justify-center gap-2.5 ${
                transferType === 'send' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40'
              }`}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (transferType === 'send' ? <Send size={16} /> : <Search size={16} />)}
              {transferType === 'send' ? 'Confirm Dispatch' : 'Send Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

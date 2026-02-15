
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';

export const DuplicateMatchModal = ({ isOpen, onClose, product, otherBranchName, onAccept, theme }: { isOpen: boolean; onClose: () => void; product: Product | null; otherBranchName: string; onAccept: () => void; theme: 'dark' }) => {
  if (!isOpen || !product) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black">Duplicate Detected</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Existing Record Found at {otherBranchName}</p>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-black">{product.name}</h4>
                <p className="text-xs font-mono text-slate-500">{product.barcode}</p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
                {product.productCode ? `PIP: ${product.productCode}` : product.packSize}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Other Site Stock</p>
                <p className="text-xl font-black">{product.stockInHand}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Other Site RRP</p>
                <p className="text-xl font-black text-emerald-500">£{product.price.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-bold leading-relaxed px-2">
            This item is already registered at {otherBranchName}. Would you like to import its details and enable real-time price synchronization?
          </p>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-800 font-black text-xs uppercase hover:bg-slate-700 transition-all">Cancel</button>
            <button onClick={onAccept} className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> Import & Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
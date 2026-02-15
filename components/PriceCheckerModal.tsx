
import React from 'react';
import { X, PoundSterling, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface PriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const PriceCheckerModal: React.FC<PriceCheckerModalProps> = ({ isOpen, onClose, product }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl p-8 relative flex flex-col items-center text-center"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
        >
            <X size={24} />
        </button>
        
        <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <PoundSterling size={48} />
        </div>

        {product ? (
            <>
                <h2 className="text-3xl font-black text-white capitalize tracking-tight mb-2 leading-tight">{product.name}</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-10">{product.packSize} • {product.barcode}</p>
                
                <div className="p-10 rounded-[2.5rem] bg-slate-950 border border-slate-800 w-full mb-4 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5" />
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Retail Price</p>
                    <p className="text-7xl font-black text-white tracking-tighter relative z-10">£{product.price.toFixed(2)}</p>
                </div>
            </>
        ) : (
            <div className="py-8">
                <div className="flex items-center justify-center gap-3 text-rose-500 mb-3">
                    <AlertCircle size={24} />
                    <h2 className="text-xl font-black uppercase tracking-widest">Not Found</h2>
                </div>
                <p className="text-sm font-bold text-slate-500">This scanned barcode does not match any active inventory record.</p>
            </div>
        )}
      </div>
    </div>
  );
};

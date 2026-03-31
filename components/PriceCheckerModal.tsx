
import React from 'react';
import { X, PoundSterling, AlertCircle, Calendar, Tag, StickyNote } from 'lucide-react';
import { Product } from '../types';
import { SafeImage } from './SafeImage';

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
        
        <div className="mb-8 relative group">
            {product?.productImage ? (
                <div className="w-40 h-40 rounded-[2.5rem] bg-white border-4 border-slate-800 flex items-center justify-center shadow-2xl overflow-hidden p-4 transition-transform group-hover:scale-105">
                    <SafeImage src={product.productImage} alt={product.name} className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                    <PoundSterling size={48} />
                </div>
            )}
        </div>

        {product ? (
            <>
                <h2 className="text-3xl font-black text-white capitalize tracking-tight leading-tight">{product.name}</h2>
                <div className="text-2xl font-black text-white capitalize tracking-tight mb-4 leading-tight">{product.packSize}</div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-10">{product.barcode}</p>
                
                <div className="p-10 rounded-[2.5rem] bg-slate-950 border border-slate-800 w-full mb-6 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5" />
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Retail Price</p>
                    <p className="text-7xl font-black text-white tracking-tighter relative z-10">£ {product.price.toFixed(2)}</p>
                </div>

                <div className="flex flex-col gap-4 w-full">
                    {product.expiryDate && (() => {
                        const today = new Date();
                        const exp = new Date(product.expiryDate);
                        const diffTime = exp.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const formattedDate = `${exp.getDate().toString().padStart(2, '0')}/${(exp.getMonth() + 1).toString().padStart(2, '0')}/${exp.getFullYear()}`;
                        
                        let status = { label: 'EXPIRY', color: 'text-slate-500', bg: 'bg-slate-800/50', border: 'border-slate-700/50', iconColor: 'text-slate-400' };
                        
                        if (diffDays < 28) {
                             status = { label: 'CRITICAL EXPIRY', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', iconColor: 'text-rose-500' };
                        } else if (diffDays < 90) {
                             status = { label: 'SHORT EXPIRY', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', iconColor: 'text-amber-500' };
                        }

                        return (
                            <div className={`${status.bg} p-4 rounded-2xl border ${status.border} flex flex-col items-center w-full transition-colors`}>
                                <div className={`${status.iconColor} mb-2`}>
                                    <Calendar size={20} />
                                </div>
                                <span className={`text-[10px] uppercase font-black ${status.color} tracking-wider mb-1`}>{status.label}</span>
                                <span className="text-sm font-bold text-white">{formattedDate}</span>
                            </div>
                        );
                    })()}
                    
                    {product.tags && product.tags.length > 0 && (
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center w-full">
                             <div className="text-blue-400 mb-2">
                                <Tag size={20} />
                            </div>
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">Tags</span>
                            <div className="flex flex-wrap justify-center gap-2 mt-1">
                                {product.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.notes && (
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center w-full">
                            <div className="text-amber-400 mb-2">
                                <StickyNote size={20} />
                            </div>
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">Notes</span>
                            <p className="text-sm font-medium text-slate-300 italic">"{product.notes}"</p>
                        </div>
                    )}
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

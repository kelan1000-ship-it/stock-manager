
import React from 'react';
import { ProductFormData } from '../types';

interface ProductStockProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
}

export const ProductStock: React.FC<ProductStockProps> = ({ formData, setFormData }) => {
  return (
    <div className="grid grid-cols-3 gap-3 pt-2">
      <div className="text-center col-span-1">
        <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 tracking-widest">In Stock</label>
        <input 
          type="number" 
          value={formData.stockInHand} 
          onChange={e => setFormData({...formData, stockInHand: e.target.value})} 
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 text-center font-black text-lg text-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-inner" 
        />
      </div>
      <div className="text-center col-span-1">
        <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 tracking-widest">To Keep</label>
        <input 
          type="number" 
          value={formData.stockToKeep} 
          onChange={e => setFormData({...formData, stockToKeep: e.target.value})} 
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 text-center font-bold text-lg text-slate-400 focus:border-emerald-500 outline-none transition-all shadow-inner" 
        />
      </div>
      <div className="text-center col-span-1">
        <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 tracking-widest">Expiry</label>
        <input 
          type="date" 
          value={formData.expiryDate || ''} 
          onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-2 text-center font-bold text-xs text-white focus:border-emerald-500 outline-none transition-all shadow-inner uppercase" 
        />
      </div>

      {formData.stockType === 'dispensary' && (
        <div className="col-span-3 animate-in slide-in-from-top-2 duration-300 border-t border-white/5 pt-4">
          <label className="block text-[9px] font-bold uppercase text-indigo-400 mb-1 ml-1 tracking-widest">Loose Units (Part Packs)</label>
          <input 
            type="number" 
            value={formData.partPacks} 
            onChange={e => setFormData({...formData, partPacks: e.target.value})} 
            className="w-full p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs font-black text-indigo-400 focus:border-indigo-500 outline-none transition-all" 
            placeholder="0" 
          />
        </div>
      )}
    </div>
  );
};

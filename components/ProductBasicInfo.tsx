
import React from 'react';
import { Tag as TagIcon, ScanLine, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { ProductFormData } from '../types';

interface ProductBasicInfoProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onScan: () => void;
  uniqueNames: string[];
  uniquePackSizes: string[];
  uniqueParentGroups: string[];
  onAutoFill: (name: string) => void;
  isAILoading: boolean;
}

export const ProductBasicInfo: React.FC<ProductBasicInfoProps> = ({
  formData,
  setFormData,
  onScan,
  uniqueNames,
  uniquePackSizes,
  uniqueParentGroups,
  onAutoFill,
  isAILoading
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5 shrink-0">
        <TagIcon size={14} className="text-emerald-500" />
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identity & Logistics</h3>
      </div>
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 flex-1">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8 group">
            <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Full Product Name</label>
            <div className="relative">
              <input 
                type="text" 
                list="name-suggestions"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder-slate-800" 
                placeholder="Enter name..." 
              />
              <button
                onClick={() => onAutoFill(formData.name)}
                disabled={isAILoading || !formData.name}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-indigo-400"
                data-tooltip="AI Auto-Populate Details"
              >
                {isAILoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              </button>
            </div>
            <datalist id="name-suggestions">
              {uniqueNames?.map((n: string) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div className="col-span-12">
            <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Subheader</label>
            <input
              type="text"
              value={formData.subheader || ''}
              onChange={e => setFormData({...formData, subheader: e.target.value})}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs italic text-slate-300 outline-none focus:border-emerald-500 transition-all placeholder-slate-800"
              placeholder="Optional subtitle shown below name..."
            />
          </div>
          <div className="col-span-4">
            <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Pack Size</label>
            <input 
              type="text" 
              list="pack-list" 
              value={formData.packSize} 
              onChange={e => setFormData({...formData, packSize: e.target.value})} 
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-black text-white focus:border-emerald-500 transition-all outline-none text-center" 
              placeholder="32pk" 
            />
            <datalist id="pack-list">{uniquePackSizes?.map((p: string) => <option key={p} value={p} />)}</datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Barcode</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.barcode} 
                onChange={e => setFormData({...formData, barcode: e.target.value})} 
                className="w-full p-3 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-white focus:border-emerald-500 transition-all outline-none" 
                placeholder="EAN" 
              />
              <button 
                onClick={onScan}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-slate-700 transition-colors"
                data-tooltip="Scan Barcode"
              >
                <ScanLine size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">PIP Code</label>
            <input 
              type="text" 
              value={formData.productCode} 
              onChange={e => setFormData({...formData, productCode: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})} 
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-white focus:border-emerald-500 transition-all outline-none" 
              placeholder="PIP" 
            />
          </div>
        </div>

        <div>
          <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Product Group</label>
          <input 
            type="text" 
            list="parent-group-list"
            value={formData.parentGroup || ''} 
            onChange={e => setFormData({...formData, parentGroup: e.target.value})} 
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder-slate-700" 
            placeholder="e.g. Summer Sale Bundle (Group ID)" 
          />
          <datalist id="parent-group-list">
            {uniqueParentGroups?.map((g: string) => <option key={g} value={g} />)}
          </datalist>

          {/* New dynamic prompt for Product Grouping */}
          {formData.parentGroup && formData.parentGroup.trim() !== '' && (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-in slide-in-from-top-2 duration-300 shadow-lg shadow-indigo-900/10">
               <RefreshCw size={14} className="animate-spin-slow text-indigo-500" />
               <p className="text-[9px] font-black uppercase tracking-[0.15em] leading-tight">
                  RRP will be synced with this group
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

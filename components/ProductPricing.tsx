
import React from 'react';
import { DollarSign, Percent } from 'lucide-react';
import { ProductFormData } from '../types';

const ToggleButton = ({ label, description, icon: Icon, active, onClick, colorClass = "emerald" }: { label: string; description: string; icon: React.ElementType; active: boolean; onClick: () => void; colorClass?: string }) => {
  const colors = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-500 hover:bg-violet-500/20",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20",
    fuchsia: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-500 hover:bg-fuchsia-500/20",
  };
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl border text-left transition-all group ${active ? colors[colorClass as keyof typeof colors] : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} className={active ? '' : 'opacity-50'} />
        <div className={`w-3 h-3 rounded-full border-2 ${active ? 'bg-current border-current' : 'border-slate-700'}`} />
      </div>
      <p className={`font-black text-xs mb-0.5 ${active ? '' : 'text-slate-400'}`}>{label}</p>
      <p className="text-[9px] opacity-70 leading-tight">{description}</p>
    </button>
  );
};

interface ProductPricingProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  margin: number;
  profit: number;
}

export const ProductPricing: React.FC<ProductPricingProps> = ({
  formData,
  setFormData,
  margin,
  profit
}) => {
  const isDispensary = formData.stockType === 'dispensary';
  const packSizeNum = parseInt(formData.packSize) || 1;
  const priceNum = parseFloat(formData.price) || 0;
  const fallbackLoose = packSizeNum > 1 ? (priceNum / packSizeNum) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-1 border-b border-white/5 shrink-0">
        <DollarSign size={14} className="text-amber-500" />
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Economics</h3>
      </div>
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 flex-1">
        <div className="space-y-2">
          <label className="block text-[8px] font-black uppercase text-slate-500 ml-1 tracking-widest">Retail (RRP)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-sm">£</span>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onFocus={(e) => e.target.select()}
              onChange={e => setFormData({...formData, price: e.target.value})}
              onBlur={() => {
                const val = parseFloat(formData.price);
                if (!isNaN(val)) setFormData(prev => ({...prev, price: val.toFixed(2)}));
              }}
              className="w-full pl-7 pr-3 py-4 rounded-xl bg-slate-950 border border-slate-800 font-black text-2xl text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[8px] font-black uppercase text-slate-500 ml-1 tracking-widest">Wholesale (Cost)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm">£</span>
            <input
              type="number"
              step="0.01"
              value={formData.costPrice}
              onFocus={(e) => e.target.select()}
              onChange={e => setFormData({...formData, costPrice: e.target.value})}
              onBlur={() => {
                const val = parseFloat(formData.costPrice);
                if (!isNaN(val)) setFormData(prev => ({...prev, costPrice: val.toFixed(2)}));
              }}
              className="w-full pl-7 pr-3 py-4 rounded-xl bg-slate-950 border border-slate-800 font-bold text-2xl text-slate-400 outline-none focus:border-slate-500 transition-all shadow-inner"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Loose Unit Price - dispensary only */}
        {isDispensary && packSizeNum > 1 && (
          <div className="space-y-2">
            <label className="block text-[8px] font-black uppercase text-slate-500 ml-1 tracking-widest">Loose Unit Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-sm">£</span>
              <input
                type="number"
                step="0.01"
                value={formData.looseUnitPrice}
                onFocus={(e) => e.target.select()}
                onChange={e => setFormData({...formData, looseUnitPrice: e.target.value})}
                onBlur={() => {
                  const val = parseFloat(formData.looseUnitPrice);
                  if (!isNaN(val)) setFormData(prev => ({...prev, looseUnitPrice: val.toFixed(2)}));
                }}
                className="w-full pl-7 pr-3 py-4 rounded-xl bg-slate-950 border border-slate-800 font-bold text-lg text-amber-400 outline-none focus:border-amber-500 transition-all shadow-inner"
                placeholder={fallbackLoose.toFixed(2)}
              />
            </div>
            <p className="text-[9px] text-slate-600 ml-1">
              Auto-fallback: £{priceNum.toFixed(2)} ÷ {packSizeNum} = <span className="text-amber-500 font-bold">£{fallbackLoose.toFixed(2)}</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
          <ToggleButton 
              label="Zero-Rate VAT" 
              description="Disable 20% VAT charge"
              icon={Percent} 
              active={formData.noVat} 
              onClick={() => setFormData({...formData, noVat: !formData.noVat, reducedVat: !formData.noVat ? false : formData.reducedVat})} 
              colorClass="violet" 
          />
          <ToggleButton 
              label="Reduced Rate VAT" 
              description="5% VAT charge"
              icon={Percent} 
              active={formData.reducedVat} 
              onClick={() => setFormData({...formData, reducedVat: !formData.reducedVat, noVat: !formData.reducedVat ? false : formData.noVat})} 
              colorClass="fuchsia" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Estimated Margin</span>
            <span className={`text-xl font-black ${margin > 30 ? 'text-emerald-500' : margin > 15 ? 'text-amber-500' : 'text-rose-500'}`}>
              {margin.toFixed(1)}%
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Potential Profit</span>
            <span className="text-xl font-black text-white">
              £{profit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

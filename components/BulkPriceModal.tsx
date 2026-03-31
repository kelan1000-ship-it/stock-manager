import React, { useState } from 'react';
import { Percent, PoundSterling, X, Check } from 'lucide-react';

export const BulkPriceModal = ({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean,
  onClose: () => void,
  onConfirm: (adjustment: { type: 'percent' | 'fixed', value: number, priceType: 'rrp' | 'cost' }) => void,
}) => {
  const [priceType, setPriceType] = useState<'rrp' | 'cost'>('rrp');
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent');
  const [valueInput, setValueInput] = useState('5');

  if (!isOpen) return null;

  const handleApply = () => {
    const val = parseFloat(valueInput);
    if (isNaN(val)) return;
    onConfirm({ type: mode, value: val, priceType });
  };

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 p-6 rounded-[2.5rem] bg-slate-950 border border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 min-w-[280px] z-[100]">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            {mode === 'percent' ? <Percent size={16} /> : <PoundSterling size={16} />}
          </div>
          <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Adjust Prices</h4>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Price Type Toggle */}
      <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 mb-3">
        <button
          onClick={() => setPriceType('rrp')}
          className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${priceType === 'rrp' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          RRP
        </button>
        <button
          onClick={() => setPriceType('cost')}
          className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${priceType === 'cost' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Cost Price
        </button>
      </div>

      {/* Adjustment Mode Toggle */}
      <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 mb-4">
        <button
          onClick={() => { setMode('percent'); setValueInput('5'); }}
          className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${mode === 'percent' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Relative %
        </button>
        <button
          onClick={() => { setMode('fixed'); setValueInput('1.00'); }}
          className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${mode === 'fixed' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Fixed £
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg transition-colors ${mode === 'percent' ? 'text-indigo-500' : 'text-emerald-500'}`}>
            {mode === 'percent' ? '%' : '£'}
          </span>
          <input
            type="number"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-center font-black text-xl outline-none transition-all focus:ring-4 ${mode === 'percent' ? 'text-indigo-500 focus:border-indigo-500 ring-indigo-500/10' : 'text-emerald-500 focus:border-emerald-500 ring-emerald-500/10'}`}
            placeholder={mode === 'percent' ? "5" : "0.00"}
            autoFocus
          />
        </div>
        <button
          onClick={handleApply}
          className={`aspect-square rounded-2xl text-white transition-all flex items-center justify-center shadow-lg active:scale-90 px-4 ${mode === 'percent' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'}`}
        >
          <Check size={20} strokeWidth={4} />
        </button>
      </div>

      {mode === 'percent' && (
        <div className="grid grid-cols-2 gap-2">
          {[-10, -5, 5, 10].map(v => (
            <button
              key={v}
              onClick={() => setValueInput(v.toString())}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            >
              {v > 0 ? '+' : ''}{v}%
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 border-r border-b border-slate-800 rotate-45" />
    </div>
  );
};

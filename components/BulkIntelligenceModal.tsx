
import React, { useState } from 'react';
import { X, Check, Handshake, Link2, AlertCircle, Zap } from 'lucide-react';
import { TriState } from '../types';

interface BulkIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: { isShared: TriState, isPriceSynced: TriState, enableThresholdAlert: TriState }) => void;
}

export const BulkIntelligenceModal: React.FC<BulkIntelligenceModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isShared, setIsShared] = useState<TriState>('keep');
  const [isPriceSynced, setIsPriceSynced] = useState<TriState>('keep');
  const [enableThresholdAlert, setEnableThresholdAlert] = useState<TriState>('keep');

  if (!isOpen) return null;

  const handleApply = () => {
    onConfirm({ isShared, isPriceSynced, enableThresholdAlert });
  };

  const TriStateButton = ({ 
    label, 
    value, 
    onChange, 
    icon: Icon 
  }: { 
    label: string, 
    value: TriState, 
    onChange: (v: TriState) => void,
    icon: React.ElementType
  }) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Icon size={12} className="text-slate-500" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
        </div>
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button 
            onClick={() => onChange('keep')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${value === 'keep' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-400'}`}
          >
            Keep
          </button>
          <button 
            onClick={() => onChange('on')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${value === 'on' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            ON
          </button>
          <button 
            onClick={() => onChange('off')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${value === 'off' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-rose-400'}`}
          >
            OFF
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 rounded-[2.5rem] bg-slate-950 border border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 min-w-[280px]">
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Zap size={16} />
          </div>
          <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Intelligence Bulk Set</h4>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5 mb-6">
        <TriStateButton label="Shared Stock" value={isShared} onChange={setIsShared} icon={Handshake} />
        <TriStateButton label="Price Sync" value={isPriceSynced} onChange={setIsPriceSynced} icon={Link2} />
        <TriStateButton label="Threshold Alert" value={enableThresholdAlert} onChange={setEnableThresholdAlert} icon={AlertCircle} />
      </div>

      <button 
        onClick={handleApply}
        className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 active:scale-95 flex items-center justify-center gap-2"
      >
        <Check size={16} strokeWidth={4} />
        Apply Logic
      </button>

      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 border-r border-b border-slate-800 rotate-45" />
    </div>
  );
};

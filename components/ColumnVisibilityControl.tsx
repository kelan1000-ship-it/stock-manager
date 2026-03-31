
import React, { useState, useRef, useEffect } from 'react';
import { Columns, Check } from 'lucide-react';
import { ColumnVisibility } from '../types';

interface ColumnVisibilityControlProps {
  columns: ColumnVisibility;
  onToggle: (key: keyof ColumnVisibility) => void;
  variant?: 'default' | 'ghost';
}

export const ColumnVisibilityControl: React.FC<ColumnVisibilityControlProps> = ({ columns, onToggle, variant = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const Option = ({ id, label }: { id: keyof ColumnVisibility; label: string }) => (
    <button
      onClick={() => onToggle(id)}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${columns[id] ? 'bg-indigo-600/10' : 'hover:bg-slate-800'}`}
    >
      <span className={`text-[11px] font-black uppercase tracking-tight ${columns[id] ? 'text-indigo-400' : 'text-slate-400'}`}>{label}</span>
      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${columns[id] ? 'bg-indigo-600 border-indigo-500' : 'border-slate-700 bg-slate-950'}`}>
        {columns[id] && <Check size={10} className="text-white" strokeWidth={4} />}
      </div>
    </button>
  );

  const buttonClass = variant === 'default'
    ? `h-[56px] w-[56px] rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all flex items-center justify-center ${isOpen ? 'ring-2 ring-indigo-500/50 border-transparent text-white' : ''}`
    : `h-[52px] w-[52px] rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-all flex items-center justify-center ${isOpen ? 'text-indigo-400 bg-slate-900' : ''}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
        data-tooltip="Configure Columns"
      >
        <Columns size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-48 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
          <div className="p-3 border-b flex items-center justify-between border-slate-800">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Table View</span>
          </div>
          <div className="p-1 space-y-1 mt-1">
            <Option id="rrp" label="Price & Cost" />
            <Option id="margin" label="Margin" />
            <Option id="stock" label="Stock Level" />
            <Option id="order" label="Order Qty" />
            <Option id="status" label="Status" />
          </div>
        </div>
      )}
    </div>
  );
};

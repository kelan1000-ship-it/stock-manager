
import React from 'react';
import { LayoutGrid, ShoppingBag, Pill } from 'lucide-react';
import { InventorySubFilter } from '../types';

interface FilterButtonProps {
  label: string;
  value: InventorySubFilter;
  icon: React.ElementType;
  count?: number;
  activeValue: InventorySubFilter;
  onClick: (value: InventorySubFilter) => void;
  activeColorClass?: string;
  className?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  count, 
  activeValue, 
  onClick,
  activeColorClass = "bg-emerald-600 shadow-emerald-900/30",
  className = ""
}) => (
  <button 
    onClick={() => onClick(value)} 
    className={`flex items-center gap-2.5 px-4 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative z-10 rounded-2xl ${activeValue === value ? 'text-white' : 'text-slate-500 hover:text-slate-200'} ${className}`}
  >
    <Icon size={14} className={activeValue === value ? 'text-white' : 'text-slate-500'} />
    {label}
    {count !== undefined && count > 0 && (
      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${activeValue === value ? 'bg-white/90 text-slate-900' : 'bg-rose-500 text-white animate-pulse'}`}>{count}</span>
    )}
    {activeValue === value && <div className={`absolute inset-0 rounded-2xl -z-10 shadow-lg animate-in fade-in zoom-in duration-300 ${activeColorClass}`} />}
  </button>
);

interface DepartmentToggleProps {
  activeFilter: 'all' | 'retail' | 'dispensary';
  onChange: (filter: 'all' | 'retail' | 'dispensary') => void;
}

export const DepartmentToggle: React.FC<DepartmentToggleProps> = ({ activeFilter, onChange }) => (
  <div className="p-1 flex rounded-2xl border transition-colors bg-slate-950 border-slate-800">
    {[
      { id: 'all', label: 'All', icon: LayoutGrid, activeColor: 'bg-black' },
      { id: 'retail', label: 'Retail', icon: ShoppingBag, activeColor: 'bg-emerald-600 shadow-emerald-900/20' },
      { id: 'dispensary', label: 'Dispensary', icon: Pill, activeColor: 'bg-violet-600 shadow-violet-900/20' }
    ].map((dept) => (
      <button 
        key={dept.id} 
        onClick={() => onChange(dept.id as any)} 
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === dept.id ? `${dept.activeColor} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'}`}
      >
        <dept.icon size={14} />
        <span>{dept.label}</span>
      </button>
    ))}
  </div>
);

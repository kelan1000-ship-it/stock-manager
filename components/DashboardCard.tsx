
import React from 'react';
import { LucideIcon, X, Plus } from 'lucide-react';

interface DashboardCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: 'amber' | 'orange' | 'indigo' | 'blue' | 'emerald' | 'rose' | 'slate';
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  isPlaceholder?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  label, value, subValue, icon: Icon, color, isActive, onClick, onRemove, isPlaceholder
}) => {
  const colorStyles = {
    amber: {
      active: 'bg-amber-600/10 border-amber-500/30',
      hover: 'hover:border-amber-500/30',
      icon: 'bg-amber-500/10 border-amber-500/20 text-amber-500'
    },
    orange: {
      active: 'bg-orange-600/10 border-orange-500/30',
      hover: 'hover:border-orange-500/30',
      icon: 'bg-orange-500/10 border-orange-500/20 text-orange-500'
    },
    indigo: {
      active: 'bg-indigo-600/10 border-indigo-500/30',
      hover: 'hover:border-indigo-500/30',
      icon: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
    },
    blue: {
      active: 'bg-blue-600/10 border-blue-500/30',
      hover: 'hover:border-blue-500/30',
      icon: 'bg-blue-500/10 border-blue-500/20 text-blue-500'
    },
    emerald: {
      active: 'bg-emerald-600/10 border-emerald-500/30',
      hover: 'hover:border-emerald-500/30',
      icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
    },
    rose: {
      active: 'bg-rose-600/10 border-rose-500/30',
      hover: 'hover:border-rose-500/30',
      icon: 'bg-rose-500/10 border-rose-500/20 text-rose-500'
    },
    slate: {
      active: 'bg-slate-900 border-slate-700',
      hover: 'hover:border-slate-600',
      icon: 'bg-slate-900 border-slate-700 text-slate-500'
    }
  };

  const styles = colorStyles[color] || colorStyles.slate;

  if (isPlaceholder) {
    return (
      <div 
        onClick={onClick}
        className="h-full min-h-[140px] p-6 rounded-[2rem] border-2 border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-950 hover:border-slate-700 transition-all group animate-in fade-in"
      >
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:scale-110 group-hover:text-emerald-500 group-hover:border-emerald-500/30 transition-all">
          <Plus size={24} />
        </div>
        <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest group-hover:text-slate-400">Add Widget</p>
      </div>
    );
  }

  return (
    <div 
        onClick={onClick}
        className={`p-6 rounded-[2rem] border flex items-center gap-5 shadow-lg relative overflow-hidden group cursor-pointer transition-all ${
            isActive 
            ? styles.active 
            : `bg-slate-950 border-slate-800 hover:bg-slate-950/80 ${styles.hover}`
        }`}
    >
        {onRemove && (
            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-3 right-3 p-1.5 rounded-full text-slate-600 hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                data-tooltip="Remove Widget"
            >
                <X size={14} strokeWidth={3} />
            </button>
        )}

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform ${styles.icon}`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{label}</p>
            <div className="flex flex-col">
                <span className="text-2xl font-black text-white leading-none">
                    {value}
                </span>
                {subValue && <span className="text-[10px] font-bold text-slate-500 mt-0.5">{subValue}</span>}
            </div>
        </div>
    </div>
  );
};

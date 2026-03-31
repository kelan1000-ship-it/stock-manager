
import React, { useRef, useEffect, useState } from 'react';
import { 
  Check, ChevronUp, ChevronDown, ShieldAlert, Store, LucideIcon
} from 'lucide-react';
import { Product } from '../types';
import { useTooltip } from '../hooks/useTooltip';

// Explicitly typed as React.FC to fix children prop recognition errors
export const Tooltip: React.FC<React.PropsWithChildren<{ x: number; y: number; isVisible: boolean }>> = ({ x, y, isVisible, children }) => {
  if (!isVisible) return null;

  const isRightSide = typeof window !== 'undefined' && x > window.innerWidth / 2;

  return (
    <div 
      className="fixed z-[1000] pointer-events-none transition-transform duration-75"
      style={{ 
        left: isRightSide ? x - 15 : x + 15, 
        top: y + 15,
        transform: isRightSide ? 'translateX(-100%)' : 'translate(0, 0)'
      }}
    >
      <div className="relative bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 text-white px-3 py-1.5 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{children}</p>
        {/* Tooltip Arrow */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 border-emerald-500/30 rotate-45 ${
            isRightSide ? '-right-1.5 border-t border-r' : '-left-1.5 border-l border-b'
          }`} 
        />
      </div>
    </div>
  );
};

export const TooltipWrapper = ({ children, tooltip, className = "" }: { children: React.ReactNode, tooltip: string, className?: string }) => {
  const { isVisible, coords, tooltipHandlers } = useTooltip(300);
  return (
    <>
      <div {...tooltipHandlers} className={`inline-block ${className}`}>
        {children}
      </div>
      <Tooltip x={coords.x} y={coords.y} isVisible={isVisible}>
        {tooltip}
      </Tooltip>
    </>
  );
};

export const TooltipIconButton = ({ 
  onClick, 
  icon: Icon, 
  tooltip, 
  className,
  disabled = false 
}: { 
  onClick: (e: React.MouseEvent) => void, 
  icon: LucideIcon, 
  tooltip: string, 
  className: string,
  disabled?: boolean 
}) => {
  const { isVisible, coords, tooltipHandlers } = useTooltip(500);
  return (
    <>
      <button 
        onClick={onClick}
        disabled={disabled}
        {...tooltipHandlers}
        className={className}
      >
        <Icon size={16} />
      </button>
      <Tooltip x={coords.x} y={coords.y} isVisible={isVisible}>
        {tooltip}
      </Tooltip>
    </>
  );
};

export const SortHeader = ({ label, sortKey, config, onSort, align = "left", disabled = false }: { label: string; sortKey: string; config: { key: string; direction: 'asc' | 'desc' }[]; onSort: (key: string, multi: boolean) => void; align?: 'left' | 'center' | 'right'; disabled?: boolean }) => {
  const sortIndex = config.findIndex(c => c.key === sortKey);
  const isActive = sortIndex !== -1;
  const direction = isActive ? config[sortIndex].direction : null;

  return (
    <th
      className={`p-4 transition-colors select-none ${!disabled ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : 'cursor-default'} ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={(e) => !disabled && onSort(sortKey, e.shiftKey)}
      data-tooltip={!disabled ? "Click to sort · Shift+click for multi-column sort" : undefined}
    >
      <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <div className="flex items-center gap-1.5">
          <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider">{label}</span>
          {isActive && !disabled && (
            <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0 leading-none">
              {sortIndex + 1}
            </span>
          )}
        </div>
        {!disabled && (
          <div className="flex flex-col -space-y-1 opacity-60">
            <ChevronUp size={10} className={`transition-colors ${isActive && direction === 'asc' ? 'text-emerald-500 opacity-100' : 'text-slate-400 dark:text-slate-600'}`} />
            <ChevronDown size={10} className={`transition-colors ${isActive && direction === 'desc' ? 'text-emerald-500 opacity-100' : 'text-slate-400 dark:text-slate-600'}`} />
          </div>
        )}
      </div>
    </th>
  );
};

export const StatCard = ({ label, value, subValue, icon, color, theme, customBg }: { label: string; value: string | number; subValue?: string; icon: React.ReactNode; color: string; theme: 'dark'; customBg?: string }) => {
  const colors: Record<string, string> = { 
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', 
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20', 
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20', 
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
  };
  return (
    <div className={`p-6 rounded-[2.5rem] border shadow-sm transition-all hover:scale-[1.02] ${customBg || (theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100')}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colors[color] || colors.emerald}`}>{icon}</div>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black">{value}</span>
            {subValue && <span className="text-[10px] font-bold text-slate-400">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CopyableText = ({ text, label, icon }: { text: string, label?: string, icon?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const { isVisible, coords, tooltipHandlers } = useTooltip(500);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button 
        onClick={handleCopy}
        {...tooltipHandlers}
        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 hover:bg-slate-700 transition-all border border-slate-700/50 group w-fit relative"
      >
        <span className="text-slate-500 group-hover:text-emerald-500 transition-colors">{icon}</span>
        {label && <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-slate-400">{label}:</span>}
        <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-slate-200">{text}</span>
        {copied && <Check size={8} className="text-emerald-500 ml-0.5" />}
      </button>
      <Tooltip x={coords.x} y={coords.y} isVisible={isVisible}>
        Click to Copy {label || 'Value'}
      </Tooltip>
    </>
  );
};

export const ComparisonBubble = ({ 
  isVisible, 
  x, 
  y, 
  item, 
  match, 
  activeBranch, 
  otherBranch 
}: { 
  isVisible: boolean, 
  x: number, 
  y: number, 
  item: Product, 
  match: Product, 
  activeBranch: string, 
  otherBranch: string 
}) => {
  if (!isVisible || !match) return null;

  const getMatchType = () => {
    if (item.barcode === match.barcode) return 'Barcode';
    if (item.productCode && item.productCode === match.productCode) return 'PIP Code';
    if (item.id === match.id) return 'SKU';
    return 'Identity';
  };

  const hasSyncError = (item.productCode && !match.productCode) || (!item.productCode && match.productCode);

  return (
    <div 
      className="fixed z-[1000] pointer-events-none transition-transform duration-100"
      style={{ left: x + 20, top: y - 100 }}
    >
      <div className="w-80 bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in slide-in-from-left-4 duration-300">
        <div className="p-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">Cross-Site Link</span>
            <span className="text-[8px] font-bold text-slate-500">Matched via {getMatchType()}</span>
          </div>
          <h4 className="text-sm font-black text-white truncate">{match.name}</h4>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{activeBranch}</p>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Stock</p>
                <p className="text-lg font-black text-white">
                  {item.stockInHand}
                  {item.stockType === 'dispensary' && item.partPacks && item.partPacks > 0 ? (
                    <span className="text-[10px] font-bold text-violet-400 ml-1">+{item.partPacks}</span>
                  ) : null}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">RRP</p>
                <p className="text-sm font-black text-emerald-500">£{item.price.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-3 border-l border-white/5 pl-4">
              <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">{otherBranch}</p>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Stock</p>
                <p className="text-lg font-black text-white">
                  {match.stockInHand}
                  {match.stockType === 'dispensary' && match.partPacks && match.partPacks > 0 ? (
                    <span className="text-[10px] font-bold text-violet-400 ml-1">+{match.partPacks}</span>
                  ) : null}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">RRP</p>
                <p className={`text-sm font-black ${item.price !== match.price ? 'text-rose-400' : 'text-emerald-500'}`}>
                  £{match.price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase text-slate-600 mb-0.5">Last Synced</p>
              <p className="text-[9px] font-bold text-slate-400">{new Date(match.lastUpdated).toLocaleDateString()} {new Date(match.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            {hasSyncError && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <ShieldAlert size={10} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Data Sync Error</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

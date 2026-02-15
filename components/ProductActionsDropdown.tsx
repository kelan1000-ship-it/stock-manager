
import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, RotateCw, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useTooltip } from '../hooks/useTooltip';
import { Tooltip } from './SharedUI';

export const ProductActionsDropdown = ({ isArchived, deletedAt, onRestore, onArchive, onDelete, theme }: { isArchived?: boolean; deletedAt?: string; onRestore: () => void; onArchive: () => void; onDelete: () => void; theme: 'dark' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isVisible, coords, tooltipHandlers } = useTooltip(500);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        {...tooltipHandlers}
        className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all bg-slate-800 border-slate-700 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-500 shadow-sm"
      >
        <RefreshCw size={16} />
      </button>
      <Tooltip x={coords.x} y={coords.y} isVisible={isVisible}>
        recycle centre
      </Tooltip>
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl z-[50] p-2 animate-in fade-in zoom-in duration-150 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          {deletedAt ? (
            <button onClick={() => { onRestore(); setIsOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/10 text-emerald-500 transition-colors">
              <RotateCw size={14} /> Restore Item
            </button>
          ) : (
            <button onClick={() => { onArchive(); setIsOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-500/10 text-indigo-400 transition-colors">
              {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {isArchived ? 'Unarchive' : 'Archive'}
            </button>
          )}
          <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-rose-500/10 text-rose-500 transition-colors">
            <Trash2 size={14} /> {deletedAt ? 'Delete Permanently' : 'Move to Bin'}
          </button>
        </div>
      )}
    </div>
  );
};
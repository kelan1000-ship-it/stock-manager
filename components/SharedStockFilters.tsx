
import React, { useRef, useEffect } from 'react';
import { Truck, ChevronDown, Check, Tag as TagIcon, Search, X } from 'lucide-react';

interface SharedStockFiltersProps {
  isSupplierMenuOpen: boolean;
  setIsSupplierMenuOpen: (v: boolean) => void;
  isTagMenuOpen: boolean;
  setIsTagMenuOpen: (v: boolean) => void;
  selectedSupplier: string;
  setSelectedSupplier: (v: string) => void;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  uniqueSuppliers: string[];
  sharedTags: string[];
  tagSettings: Record<string, any>;
}

export const SharedStockFilters: React.FC<SharedStockFiltersProps> = ({
  isSupplierMenuOpen,
  setIsSupplierMenuOpen,
  isTagMenuOpen,
  setIsTagMenuOpen,
  selectedSupplier,
  setSelectedSupplier,
  selectedTags,
  setSelectedTags,
  searchQuery,
  setSearchQuery,
  uniqueSuppliers,
  sharedTags,
  tagSettings,
}) => {
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const supplierMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tagMenuRef.current && !tagMenuRef.current.contains(target)) {
        setIsTagMenuOpen(false);
      }
      if (supplierMenuRef.current && !supplierMenuRef.current.contains(target)) {
        setIsSupplierMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsTagMenuOpen, setIsSupplierMenuOpen]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex flex-col xl:flex-row items-center w-full bg-slate-950 border border-slate-800 rounded-2xl p-1 shadow-sm transition-all">
      {/* Supplier Filter */}
      <div className="relative w-full xl:w-auto h-full" ref={supplierMenuRef}>
        <button 
          onClick={() => setIsSupplierMenuOpen(!isSupplierMenuOpen)}
          className={`h-[52px] w-full xl:w-auto min-w-[180px] px-6 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-4 ${isSupplierMenuOpen ? 'bg-slate-900' : ''}`}
        >
          <div className="flex items-center gap-3">
            <Truck size={16} className="text-slate-500" />
            <span className="truncate max-w-[100px]">{selectedSupplier === 'All Suppliers' ? 'All Suppliers' : selectedSupplier}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSupplierMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {isSupplierMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter by Supplier</span>
            </div>
            <div className="max-h-64 overflow-y-auto p-1 space-y-1 scrollbar-hide mt-1">
              {uniqueSuppliers.map(supplier => (
                <button 
                  key={supplier}
                  onClick={() => { setSelectedSupplier(supplier); setIsSupplierMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${selectedSupplier === supplier ? 'bg-indigo-600/10' : 'hover:bg-slate-800'}`}
                >
                  <span className={`text-[11px] font-black uppercase tracking-tight ${selectedSupplier === supplier ? 'text-indigo-400' : 'text-slate-300'}`}>{supplier}</span>
                  {selectedSupplier === supplier && <Check size={14} className="text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

      {/* Tag Filter */}
      <div className="relative w-full xl:w-auto h-full" ref={tagMenuRef}>
        <button 
          onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
          className={`h-[52px] w-full xl:w-auto min-w-[160px] px-6 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-4 ${isTagMenuOpen ? 'bg-slate-900' : ''}`}
        >
          <div className="flex items-center gap-3">
            <TagIcon size={16} className="text-slate-500" />
            <span>{selectedTags.length === 0 ? 'All Tags' : `${selectedTags.length} Tags`}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isTagMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {isTagMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter by tags</span>
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-1 space-y-1 scrollbar-hide mt-1">
              {sharedTags.length === 0 ? (
                <p className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No tags found</p>
              ) : sharedTags.map(tag => {
                const settings = tagSettings[tag];
                const isActive = selectedTags.includes(tag);
                return (
                  <button 
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-indigo-600/10' : 'hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        style={settings?.color ? { backgroundColor: settings.color } : {}}
                        className={`w-3 h-3 rounded-full border border-slate-700 ${settings?.isFlashing ? 'animate-tag-flash' : ''}`}
                      />
                      <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-indigo-400' : 'text-slate-300'}`}>#{tag}</span>
                    </div>
                    {isActive && <Check size={14} className="text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

      {/* Search Input */}
      <div className="flex-1 w-full flex items-center gap-3 px-4 h-[52px]">
        <Search size={18} className="text-slate-500" />
        <input 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shared items..." 
          className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder-slate-600 h-full"
        />
        {searchQuery && (
            <button 
                onClick={() => setSearchQuery('')}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 transition-colors"
            >
                <X size={16} />
            </button>
        )}
      </div>
    </div>
  );
};

import React, { useRef, useEffect } from 'react';
import { Truck, ChevronDown, Check, Tag as TagIcon, Search, X, MapPin, ScanLine } from 'lucide-react';

interface SharedStockFiltersProps {
  isSupplierMenuOpen: boolean;
  setIsSupplierMenuOpen: (v: boolean) => void;
  isTagMenuOpen: boolean;
  setIsTagMenuOpen: (v: boolean) => void;
  isLocationMenuOpen: boolean;
  setIsLocationMenuOpen: (v: boolean) => void;
  selectedSuppliers: string[];
  supplierFilterMode: 'show' | 'hide';
  toggleSupplierFilter: (v: string) => void;
  clearSupplierFilters: () => void;
  toggleSupplierFilterMode: () => void;
  selectedLocations: string[];
  locationFilterMode: 'show' | 'hide';
  toggleLocationFilter: (v: string) => void;
  clearLocationFilters: () => void;
  toggleLocationFilterMode: () => void;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  tagFilterMode: 'show' | 'hide';
  toggleTagFilterMode: () => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  uniqueSuppliers: string[];
  uniqueLocations: string[];
  sharedTags: string[];
  tagSettings: Record<string, any>;
  onOpenScanner?: () => void;
}

export const SharedStockFilters: React.FC<SharedStockFiltersProps> = ({
  isSupplierMenuOpen,
  setIsSupplierMenuOpen,
  isTagMenuOpen,
  setIsTagMenuOpen,
  isLocationMenuOpen,
  setIsLocationMenuOpen,
  selectedSuppliers,
  supplierFilterMode,
  toggleSupplierFilter,
  clearSupplierFilters,
  toggleSupplierFilterMode,
  selectedLocations,
  locationFilterMode,
  toggleLocationFilter,
  clearLocationFilters,
  toggleLocationFilterMode,
  selectedTags,
  setSelectedTags,
  tagFilterMode,
  toggleTagFilterMode,
  searchQuery,
  setSearchQuery,
  uniqueSuppliers,
  uniqueLocations,
  sharedTags,
  tagSettings,
  onOpenScanner,
}) => {
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const supplierMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tagMenuRef.current && !tagMenuRef.current.contains(target)) {
        setIsTagMenuOpen(false);
      }
      if (supplierMenuRef.current && !supplierMenuRef.current.contains(target)) {
        setIsSupplierMenuOpen(false);
      }
      if (locationMenuRef.current && !locationMenuRef.current.contains(target)) {
        setIsLocationMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsTagMenuOpen, setIsSupplierMenuOpen, setIsLocationMenuOpen]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex flex-col xl:flex-row items-center w-full bg-slate-900/40 rounded-3xl p-1 transition-all">
      {/* Supplier Filter */}
      <div className="relative w-full xl:w-auto h-full" ref={supplierMenuRef}>
        <button 
          onClick={() => setIsSupplierMenuOpen(!isSupplierMenuOpen)}
          className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isSupplierMenuOpen ? 'bg-slate-900' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Truck size={16} className={selectedSuppliers.length > 0 ? (supplierFilterMode === 'show' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500'} />
            <span className={selectedSuppliers.length > 0 ? 'text-white' : 'text-slate-400'}>
              Suppliers
              {selectedSuppliers.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({selectedSuppliers.length})</span>}
            </span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSupplierMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {isSupplierMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
              <button 
                onClick={toggleSupplierFilterMode}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                  supplierFilterMode === 'show' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {supplierFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
              </button>
            </div>
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Wholesalers</span>
              {selectedSuppliers.length > 0 && (
                <button onClick={clearSupplierFilters} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-1 space-y-1 scrollbar-hide mt-1">
              {uniqueSuppliers.length === 0 ? (
                <p className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No suppliers found</p>
              ) : uniqueSuppliers.map(supplier => {
                const isActive = selectedSuppliers.includes(supplier);
                return (
                  <button 
                    key={supplier}
                    onClick={() => toggleSupplierFilter(supplier)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-emerald-600/10' : 'hover:bg-slate-800'}`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>{supplier}</span>
                    {isActive && <Check size={14} className="text-emerald-500" />}
                  </button>
                );
              })}
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
          className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isTagMenuOpen ? 'bg-slate-900' : ''}`}
        >
          <div className="flex items-center gap-2">
            <TagIcon size={16} className={selectedTags.length > 0 ? (tagFilterMode === 'show' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500'} />
            <span className={selectedTags.length > 0 ? 'text-white' : 'text-slate-400'}>
              Tags
              {selectedTags.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({selectedTags.length})</span>}
            </span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isTagMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {isTagMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
              <button 
                onClick={toggleTagFilterMode}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                  tagFilterMode === 'show' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {tagFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
              </button>
            </div>
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Labels</span>
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
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-emerald-600/10' : 'hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        style={settings?.color ? { backgroundColor: settings.color } : {}}
                        className={`w-3 h-3 rounded-full border border-slate-700 ${settings?.isFlashing ? 'animate-tag-flash' : ''}`}
                      />
                      <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>#{tag}</span>
                    </div>
                    {isActive && <Check size={14} className="text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

      {/* Location Filter */}
      <div className="relative w-full xl:w-auto h-full" ref={locationMenuRef}>
        <button 
          onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
          className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isLocationMenuOpen ? 'bg-slate-900' : ''}`}
        >
          <div className="flex items-center gap-2">
            <MapPin size={16} className={selectedLocations.length > 0 ? (locationFilterMode === 'show' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500'} />
            <span className={selectedLocations.length > 0 ? 'text-white' : 'text-slate-400'}>
              Locations
              {selectedLocations.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({selectedLocations.length})</span>}
            </span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isLocationMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {isLocationMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
              <button 
                onClick={toggleLocationFilterMode}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                  locationFilterMode === 'show' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {locationFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
              </button>
            </div>
            <div className="p-3 border-b flex items-center justify-between border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aisles & Shelves</span>
              {selectedLocations.length > 0 && (
                <button onClick={clearLocationFilters} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-1 space-y-1 scrollbar-hide mt-1">
              {uniqueLocations.length === 0 ? (
                <p className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No locations found</p>
              ) : uniqueLocations.map(location => {
                const isActive = selectedLocations.includes(location);
                return (
                  <button 
                    key={location}
                    onClick={() => toggleLocationFilter(location)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-emerald-600/10' : 'hover:bg-slate-800'}`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>{location}</span>
                    {isActive && <Check size={14} className="text-emerald-500" />}
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
        {onOpenScanner && (
            <>
              <div className="w-px h-6 bg-slate-800 mx-1" />
              <button onClick={onOpenScanner} className="p-2 rounded-lg text-slate-500 hover:bg-slate-900 hover:text-emerald-400 transition-all"><ScanLine size={18} /></button>
            </>
        )}
      </div>
    </div>
  );
};

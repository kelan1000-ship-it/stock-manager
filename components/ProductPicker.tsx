
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, Search, MapPin, ArrowLeft, Move, Box, Plus, Pencil, X, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Product, PlanogramLayout } from '../types';
import { ProductThumbnail } from './ManagerComponents';
import { matchesSearchTerms, matchesAnySearchField } from '../utils/stringUtils';

interface ProductPickerProps {
  activeTab: 'shelf' | 'floor';
  inventory: Product[];
  planograms: PlanogramLayout[];
  search: string;
  setSearch: (value: string) => void;
  draggedItem: { type: 'library' | 'shelf' | 'floor_tool', id: string | number } | null;
  onDragStart: (e: React.DragEvent, type: 'library' | 'shelf' | 'floor_tool', id: string | number) => void;
  onDragEnd: () => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  isLibraryVisible?: boolean;
  setIsLibraryVisible?: (visible: boolean) => void;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  activeTab,
  inventory,
  planograms,
  search,
  setSearch,
  draggedItem,
  onDragStart,
  onDragEnd,
  onUpdateProduct,
  isLibraryVisible = true,
  setIsLibraryVisible
}) => {
  const [libraryMode, setLibraryMode] = useState<'products' | 'locations'>('products');
  const [selectedLibLocation, setSelectedLibLocation] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [libraryMode, selectedLibLocation, search, activeTab]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    inventory.forEach(p => {
      if (p.location) locs.add(p.location);
    });
    return Array.from(locs).sort();
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(p => !p.deletedAt && !p.isArchived && matchesAnySearchField([p.name, p.barcode], search));
  }, [inventory, search]);

  const handleSaveLocation = (id: string, newLocation: string) => {
    onUpdateProduct(id, { location: newLocation });
    setEditingLocationId(null);
  };

  const currentList = useMemo(() => {
    if (activeTab === 'floor') {
      return planograms.filter(p => matchesSearchTerms(p.name, search));
    }
    
    if (libraryMode === 'locations' && !selectedLibLocation) {
      return uniqueLocations;
    }
    
    if (selectedLibLocation) {
      return inventory.filter(p => p.location === selectedLibLocation && matchesAnySearchField([p.name, p.barcode], search));
    }
    
    return filteredInventory;
  }, [activeTab, libraryMode, selectedLibLocation, planograms, search, uniqueLocations, inventory, filteredInventory]);

  const totalPages = Math.ceil(currentList.length / pageSize);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage, pageSize]);

  if (!isLibraryVisible) {
    return (
      <div className="hidden lg:flex flex-col items-center py-6 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl w-20 shrink-0 h-full">
        <button 
          onClick={() => setIsLibraryVisible?.(true)} 
          className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg border border-slate-700" 
          data-tooltip="Show Library"
        >
          <PanelLeftOpen size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[320px] shrink-0 flex flex-col rounded-[2.5rem] bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-slate-800 space-y-5 bg-slate-900/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
              <LayoutGrid size={18} className={activeTab === 'shelf' ? "text-emerald-500" : "text-indigo-500"} />
              {activeTab === 'shelf' ? 'Product Library' : 'Shelf Catalogue'}
            </h3>
            <button 
              onClick={() => setIsLibraryVisible?.(false)} 
              className="p-2 -mr-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              data-tooltip="Hide Library"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          
          {activeTab === 'shelf' && (
            <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button 
                  onClick={() => { setLibraryMode('products'); setSelectedLibLocation(null); }} 
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${libraryMode === 'products' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Products
                </button>
                <button 
                  onClick={() => setLibraryMode('locations')} 
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${libraryMode === 'locations' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Locations
                </button>
            </div>
          )}
        </div>

        {(activeTab !== 'shelf' || (libraryMode === 'products' || selectedLibLocation)) && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder={activeTab === 'shelf' ? (selectedLibLocation ? `Search in ${selectedLibLocation}...` : "Search products...") : "Search shelves..."} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold outline-none focus:ring-2 ring-emerald-500/50 transition-all text-white placeholder-slate-700"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        
        {activeTab === 'shelf' && libraryMode === 'locations' && selectedLibLocation && (
           <button 
             onClick={() => setSelectedLibLocation(null)}
             className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
           >
             <ArrowLeft size={12} /> Back to Location List
           </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide bg-slate-950/20">
        <datalist id="picker-locations">
            {uniqueLocations.map(loc => <option key={loc} value={loc} />)}
        </datalist>

        {activeTab === 'shelf' ? (
          libraryMode === 'locations' && !selectedLibLocation ? (
             <div className="space-y-2">
                {uniqueLocations.length === 0 ? (
                    <div className="py-10 text-center opacity-40">
                        <MapPin size={24} className="mx-auto mb-2 text-slate-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Locations Found</p>
                    </div>
                ) : (paginatedItems as string[]).map(loc => (
                   <button 
                     key={loc}
                     onClick={() => setSelectedLibLocation(loc)}
                     className="w-full p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:bg-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
                   >
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                            <MapPin size={14} />
                         </div>
                         <span className="text-xs font-bold text-white uppercase">{loc || 'Unassigned'}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-500 group-hover:text-emerald-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                         {inventory.filter(p => p.location === loc).length} Items
                      </span>
                   </button>
                ))}
             </div>
          ) : (
            (paginatedItems as Product[]).map(p => (
              <div 
                key={p.id}
                draggable
                onDragStart={(e) => {
                    // Prevent drag if we are editing text
                    if (editingLocationId === p.id) {
                        e.preventDefault();
                        return;
                    }
                    onDragStart(e, 'library', p.id)
                }}
                onDragEnd={onDragEnd}
                className={`p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing group flex items-center gap-4 select-none ${
                  draggedItem?.id === p.id 
                    ? 'bg-emerald-600/10 border-2 border-dashed border-emerald-500 opacity-60' 
                    : 'bg-slate-800/40 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60'
                }`}
              >
                <ProductThumbnail src={p.productImage} alt={p.name} stockType={p.stockType} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-white truncate group-hover:text-emerald-400 transition-colors capitalize">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] italic text-slate-500 uppercase tracking-widest">{p.packSize}</span>
                    
                    {editingLocationId === p.id ? (
                        <input 
                          autoFocus
                          type="text" 
                          defaultValue={p.location || ''}
                          placeholder="Loc..."
                          list="picker-locations"
                          className="w-20 bg-slate-950 border-2 border-dashed border-indigo-500 rounded-lg px-2 py-0.5 text-[9px] font-bold text-white outline-none focus:bg-indigo-900/20 shadow-lg transition-all"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onBlur={(e) => handleSaveLocation(p.id, e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                    ) : (
                        <div className="flex items-center gap-1.5 group/loc">
                            <span className="text-[9px] font-mono text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{p.location || 'No Loc'}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setEditingLocationId(p.id); }}
                                className="opacity-0 group-hover/loc:opacity-100 p-1 rounded-full hover:bg-slate-700 text-slate-500 hover:text-emerald-400 transition-all"
                                data-tooltip="Edit Location"
                            >
                                <Pencil size={10} />
                            </button>
                        </div>
                    )}
                  </div>
                </div>
                <Move size={14} className="text-slate-600 group-hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            ))
          )
        ) : (
          (paginatedItems as PlanogramLayout[]).map(p => (
            <div 
              key={p.id}
              draggable
              onDragStart={(e) => onDragStart(e, 'floor_tool', p.id)}
              onDragEnd={onDragEnd}
              className={`p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing group flex items-center gap-4 select-none ${
                draggedItem?.id === p.id 
                  ? 'bg-indigo-600/10 border-2 border-dashed border-indigo-500 opacity-60' 
                  : 'bg-slate-800/40 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Box size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white truncate group-hover:text-indigo-400 transition-colors capitalize">{p.name}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{p.location || 'Retail Floor'}</p>
              </div>
              <Plus size={14} className="text-slate-600 group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" />
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {currentList.length > 0 && (
        <div className="p-6 border-t border-slate-800 space-y-4 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Rows:</span>
              <select 
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-emerald-500 transition-colors"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
              {Math.min(currentList.length, (currentPage - 1) * pageSize + 1)}-{Math.min(currentPage * pageSize, currentList.length)} of {currentList.length}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            
            <span className="text-[10px] font-black text-white px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 shadow-inner">
              Page {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

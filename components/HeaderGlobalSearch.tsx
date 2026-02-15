
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, LayoutDashboard, Handshake, ClipboardList, Layers, BarChart3, Archive, Recycle, ChevronRight, Notebook, RefreshCw, Package, X } from 'lucide-react';
import { Product } from '../types';
import { SafeImage } from './SafeImage';

interface HeaderGlobalSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenPriceChecker: () => void;
  onNavigate: (view: any) => void;
  products?: Product[];
  onProductSelect?: (product: Product) => void;
}

export const HeaderGlobalSearch: React.FC<HeaderGlobalSearchProps> = ({
  searchQuery,
  onSearchChange,
  onOpenPriceChecker,
  onNavigate,
  products = [],
  onProductSelect
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sections = [
    { id: 'inventory', label: 'Inventory', icon: LayoutDashboard, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Manage stock & levels' },
    { id: 'shared-stock', label: 'Shared Stock', icon: Handshake, color: 'text-indigo-500', bg: 'bg-indigo-500/10', desc: 'Joint venture inventory' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Customer orders' },
    { id: 'planogram', label: 'Planogram', icon: Layers, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'Shelf management' },
    { id: 'performance', label: 'Performance', icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Analytics & stats' },
    { id: 'master-inventory', label: 'Master Inventory', icon: Notebook, color: 'text-indigo-400', bg: 'bg-indigo-500/10', desc: 'Global product catalogue' },
    { id: 'reconciliation', label: 'Reconciliation', icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Compare vs Master' },
    { id: 'archive', label: 'Archive', icon: Archive, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Hidden items' },
    { id: 'bin', label: 'Recycle Bin', icon: Recycle, color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Deleted items' },
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections.filter(s => ['inventory', 'shared-stock', 'requests', 'planogram', 'performance'].includes(s.id));
    return sections.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, sections]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      !p.deletedAt && !p.isArchived &&
      (p.name.toLowerCase().includes(q) || p.barcode?.includes(q) || p.productCode?.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [searchQuery, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="hidden lg:flex items-center flex-1 max-w-md mx-6" ref={containerRef}>
      <div className="relative w-full group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none">
          <Search size={16} />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Global search or navigate..." 
          className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-2.5 pl-11 pr-20 text-sm font-bold text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-4 ring-emerald-500/5 transition-all shadow-inner"
        />
        {searchQuery && (
            <button 
                onClick={() => onSearchChange('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-500 hover:text-white transition-colors"
            >
                <X size={14} />
            </button>
        )}
        <button 
          onClick={onOpenPriceChecker}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-95 group/btn"
          title="RRP Checker"
        >
          <span className="font-black text-sm px-1">£</span>
        </button>

        {isFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-[70vh] overflow-y-auto scrollbar-hide p-2 space-y-1">
                    {/* Navigation Matches */}
                    {filteredSections.length > 0 && (
                        <>
                            <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                {searchQuery ? 'Navigation Matches' : 'Quick Navigation'}
                            </div>
                            {filteredSections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => {
                                        onNavigate(section.id);
                                        setIsFocused(false);
                                        onSearchChange('');
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors text-left group"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-white/5 ${section.bg} ${section.color}`}>
                                        <section.icon size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-sm font-black text-white">{section.label}</span>
                                        <span className="block text-[10px] text-slate-500 font-medium">{section.desc}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                </button>
                            ))}
                        </>
                    )}

                    {/* Product Matches */}
                    {filteredProducts.length > 0 && (
                        <>
                            <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mt-2">
                                Product Matches
                            </div>
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        if (onProductSelect) onProductSelect(product);
                                        setIsFocused(false);
                                        onSearchChange('');
                                    }}
                                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                        {product.productImage ? (
                                            <SafeImage src={product.productImage} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package size={16} className="text-slate-700" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-black text-white truncate">{product.name}</span>
                                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                                            {product.packSize} • {product.stockInHand} in stock
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </>
                    )}

                    {filteredSections.length === 0 && filteredProducts.length === 0 && searchQuery && (
                        <div className="p-4 text-center text-slate-500 text-xs font-bold">
                            No sections or products match "{searchQuery}"
                        </div>
                    )}
                </div>
                {searchQuery && (
                    <div className="bg-slate-950 p-3 border-t border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 font-bold">Searching current view for "<span className="text-white">{searchQuery}</span>"</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

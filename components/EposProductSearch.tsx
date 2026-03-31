import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Package, X } from 'lucide-react';
import { Product } from '../types';

function parsePackSize(ps: string): number {
  const n = parseInt(ps);
  return isNaN(n) || n <= 0 ? 1 : n;
}

interface EposProductSearchProps {
  products: Product[];
  onAddToCart: (product: Product, opts?: { asLoose?: boolean }) => void;
  onOpenMisc: () => void;
}

export function EposProductSearch({ products, onAddToCart, onOpenMisc }: EposProductSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [packChoiceProduct, setPackChoiceProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeProducts = useMemo(() =>
    products.filter(p => !p.deletedAt && !p.isArchived),
    [products]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return activeProducts
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.productCode && p.productCode.toLowerCase().includes(q)) ||
        p.packSize.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [query, activeProducts]);

  const isDispensaryWithPack = (p: Product) =>
    p.stockType === 'dispensary' && parsePackSize(p.packSize) > 1;

  const handleProductSelect = (product: Product) => {
    if (isDispensaryWithPack(product)) {
      setPackChoiceProduct(product);
    } else {
      onAddToCart(product);
    }
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handlePackChoice = (asLoose: boolean) => {
    if (!packChoiceProduct) return;
    onAddToCart(packChoiceProduct, asLoose ? { asLoose: true } : undefined);
    setPackChoiceProduct(null);
    inputRef.current?.focus();
  };

  // Auto-add on exact barcode match
  useEffect(() => {
    if (!query.trim()) return;
    const exact = activeProducts.find(p => p.barcode === query.trim());
    if (exact) {
      if (isDispensaryWithPack(exact)) {
        setPackChoiceProduct(exact);
      } else {
        onAddToCart(exact);
      }
      setQuery('');
      setIsOpen(false);
    }
  }, [query, activeProducts, onAddToCart]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus search on F2
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && packChoiceProduct) {
        setPackChoiceProduct(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [packChoiceProduct]);

  const loosePrice = packChoiceProduct
    ? (packChoiceProduct.looseUnitPrice ?? (packChoiceProduct.price / parsePackSize(packChoiceProduct.packSize)))
    : 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Scan barcode or search product... (F2)"
          className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {results.map(product => (
            <button
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
            >
              <Package size={16} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">{product.name}</p>
                <p className="text-gray-500 text-xs">
                  {product.barcode} · <span className="italic">{product.packSize}</span>
                  {product.stockType === 'dispensary' && (
                    <span className="ml-1 text-indigo-500 font-bold">RX</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-emerald-600 font-bold text-sm">£{(product.price ?? 0).toFixed(2)}</p>
                <p className={`text-xs ${product.stockInHand > 0 ? 'text-gray-400' : 'text-red-500'}`}>
                  {product.stockInHand} in stock
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Dispensary Pack Choice Overlay */}
      {packChoiceProduct && (
        <div className="absolute z-[60] w-full mt-2 bg-white border-2 border-indigo-300 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200">
            <p className="text-indigo-900 text-sm font-bold truncate">{packChoiceProduct.name}</p>
            <p className="text-indigo-500 text-xs italic">{packChoiceProduct.packSize} pack</p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              onClick={() => handlePackChoice(false)}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100 transition-all active:scale-95"
            >
              <Package size={24} className="text-emerald-600" />
              <span className="text-emerald-900 text-xs font-black uppercase tracking-widest">Full Pack</span>
              <span className="text-emerald-600 text-lg font-black">£{(packChoiceProduct.price ?? 0).toFixed(2)}</span>
            </button>
            <button
              onClick={() => handlePackChoice(true)}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-amber-50 border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-100 transition-all active:scale-95"
            >
              <span className="text-amber-600 text-2xl font-black">1</span>
              <span className="text-amber-900 text-xs font-black uppercase tracking-widest">Loose Unit</span>
              <span className="text-amber-600 text-lg font-black">£{(Math.round(loosePrice * 100) / 100).toFixed(2)}</span>
            </button>
          </div>
          <button
            onClick={() => setPackChoiceProduct(null)}
            className="w-full py-2.5 text-gray-400 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 border-t border-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <button
        onClick={onOpenMisc}
        className="mt-3 w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors"
      >
        + Add Misc Item
      </button>
    </div>
  );
}

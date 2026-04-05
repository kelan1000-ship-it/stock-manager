import React, { useState } from 'react';
import { X } from 'lucide-react';

interface EposMiscItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, price: number, noVat?: boolean, reducedVat?: boolean, noDiscountAllowed?: boolean) => void;
}

export function EposMiscItemModal({ isOpen, onClose, onAdd }: EposMiscItemModalProps) {
  const [name, setName] = useState('');
  const [priceDigits, setPriceDigits] = useState('');
  const [noVat, setNoVat] = useState(false);
  const [reducedVat, setReducedVat] = useState(false);
  const [noDiscountAllowed, setNoDiscountAllowed] = useState(false);

  if (!isOpen) return null;

  const currentPrice = priceDigits ? (parseInt(priceDigits) / 100).toFixed(2) : '0.00';

  const handleNumpad = (val: string) => {
    if (val === 'C') {
      setPriceDigits('');
      return;
    }
    if (val === '⌫') {
      setPriceDigits(prev => prev.slice(0, -1));
      return;
    }
    if (val === '00') {
      setPriceDigits(prev => (prev + '00').slice(0, 10));
      return;
    }
    if (/[0-9]/.test(val)) {
      setPriceDigits(prev => (prev + val).slice(0, 10));
    }
  };

  const handleAdd = () => {
    const p = parseFloat(currentPrice);
    if (isNaN(p) || p <= 0) return;
    onAdd(name.trim() || 'Misc Item', p, noVat, reducedVat, noDiscountAllowed);
    setName('');
    setPriceDigits('');
    setNoVat(false);
    setReducedVat(false);
    setNoDiscountAllowed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-900 font-black text-lg">Add Miscellaneous Item</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misc Item (optional)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Price (£)</label>
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-2xl font-black text-center">
              £{currentPrice}
            </div>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-4 gap-1.5">
            {['7','8','9','⌫','4','5','6','C','1','2','3','00','0'].map(key => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className={`py-3 rounded-xl font-bold text-lg transition-colors ${
                  key === 'C' ? 'bg-red-50 text-red-500 hover:bg-red-100' :
                  key === '⌫' ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' :
                  key === '0' ? 'col-span-2 bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100' :
                  'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={noVat}
              onChange={(e) => {
                setNoVat(e.target.checked);
                if (e.target.checked) setReducedVat(false);
              }}
              className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-gray-700 text-sm font-medium">Zero-Rate VAT</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={reducedVat}
              onChange={(e) => {
                setReducedVat(e.target.checked);
                if (e.target.checked) setNoVat(false);
              }}
              className="w-4 h-4 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500"
            />
            <span className="text-gray-700 text-sm font-medium">Reduced Rate VAT (5%)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={noDiscountAllowed}
              onChange={(e) => setNoDiscountAllowed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-gray-700 text-sm font-medium">No discount allowed</span>
          </label>
        </div>

        <button
          onClick={handleAdd}
          disabled={parseFloat(currentPrice) <= 0}
          className="mt-6 w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-blue-500 transition-colors disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

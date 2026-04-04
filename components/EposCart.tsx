import React from 'react';
import { Minus, Plus, X, ShoppingCart, Ban, RotateCcw } from 'lucide-react';
import { EposCartItem } from '../types';

interface EposCartProps {
  items: EposCartItem[];
  subtotal: number;
  total: number;
  discountPercent: number;
  setDiscountPercent: (v: number) => void;
  discountAmount: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  isRefundMode?: boolean;
  staffDiscountPercent?: number;
}

export function EposCart({ 
  items, subtotal, total, discountPercent, setDiscountPercent, 
  discountAmount, onUpdateQuantity, onRemove, isRefundMode,
  staffDiscountPercent = 0
}: EposCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
        {isRefundMode ? (
          <>
            <RotateCcw size={48} className="mb-4 opacity-30 text-orange-400" />
            <p className="text-sm font-medium text-orange-500">Refund Mode</p>
            <p className="text-xs mt-1">Add items to refund</p>
          </>
        ) : (
          <>
            <ShoppingCart size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs mt-1">Scan a barcode or search to add items</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-300 shadow-sm group"
          >
            <span className="text-gray-300 text-xs font-mono w-5 shrink-0">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-medium truncate" style={{ fontSize: 'var(--product-title-size, 14px)' }}>
                {item.name}
                {item.noDiscountAllowed && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-amber-600 bg-amber-50 px-1 py-0.5 rounded align-middle">
                    <Ban size={8} /> No disc.
                  </span>
                )}
              </p>
              {item.packSize && <p className="text-gray-400 text-xs">{item.packSize}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="p-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                min="0"
                value={item.quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) onUpdateQuantity(item.id, val);
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!e.target.value || isNaN(val) || val <= 0) onRemove(item.id);
                }}
                className="text-gray-900 font-bold text-sm w-8 text-center bg-transparent border-none outline-none focus:bg-blue-50 focus:rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="p-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-emerald-600 hover:text-white transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
            <span className="text-gray-400 text-xs w-16 text-right">@ £{item.unitPrice.toFixed(2)}</span>
            <span className="text-gray-900 font-bold text-sm w-20 text-right">£{item.lineTotal.toFixed(2)}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 mt-3 space-y-1">
        <div className="flex justify-between text-gray-500 text-sm">
          <span>Subtotal ({items.length} items)</span>
          <span>£{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>Discount</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="0"
                className="w-12 px-1.5 py-0.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-400 text-xs mr-1">%</span>
              
              {staffDiscountPercent > 0 && (
                <button
                  onClick={() => setDiscountPercent(staffDiscountPercent)}
                  className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap"
                >
                  Staff ({staffDiscountPercent}%)
                </button>
              )}
            </div>
          </div>
          {discountAmount > 0 && (
            <span className="text-orange-600 font-medium">-£{discountAmount.toFixed(2)}</span>
          )}
        </div>
        <div className="flex justify-between text-gray-900 text-xl font-black">
          <span>TOTAL</span>
          <span>£{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

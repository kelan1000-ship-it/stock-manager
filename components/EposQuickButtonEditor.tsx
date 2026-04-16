import React, { useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { EposQuickButton, Product } from '../types';

interface EposQuickButtonEditorProps {
  isOpen: boolean;
  onClose: () => void;
  buttons: EposQuickButton[];
  onSave: (btn: Partial<EposQuickButton>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (newOrder: EposQuickButton[]) => Promise<void>;
  currentBranch: BranchKey;
}

const COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-violet-600', 'bg-rose-600',
  'bg-amber-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
];

export function EposQuickButtonEditor({ isOpen, onClose, buttons, onSave, onDelete, onReorder, currentBranch }: EposQuickButtonEditorProps) {
  const items = useSelector((state: any) => 
    (currentBranch === 'bywood' ? state.stock.bywood : state.stock.broom) || []
  );

  const [editingButton, setEditingButton] = useState<Partial<EposQuickButton> | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [localPriceInput, setLocalPriceInput] = useState('');
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const activeProducts = useMemo(() => 
    items.filter((p: Product) => !p.deletedAt && !p.isArchived),
    [items]
  );

  if (!isOpen) return null;

  const handleEdit = (btn: EposQuickButton) => {
    setEditingButton(btn);
    setLocalPriceInput(btn.price.toFixed(2));
  };

  const handleAddButton = () => {
    setEditingButton({ color: COLORS[0], isActive: true, noDiscountAllowed: false });
    setLocalPriceInput('0.00');
  };

  const handlePriceBlur = () => {
    const val = parseFloat(localPriceInput);
    if (!isNaN(val)) {
      const formatted = val.toFixed(2);
      setLocalPriceInput(formatted);
      setEditingButton(prev => prev ? { ...prev, price: val } : prev);
    } else if (editingButton?.price !== undefined) {
      setLocalPriceInput(editingButton.price.toFixed(2));
    }
  };

  const handleSave = () => {
    if (!editingButton || !editingButton.label || editingButton.price === undefined) return;
    const btn: EposQuickButton = {
      id: editingButton.id || crypto.randomUUID(),
      label: editingButton.label,
      description: editingButton.description || undefined,
      price: editingButton.price,
      productId: editingButton.productId || undefined,
      color: editingButton.color || COLORS[0],
      sortOrder: editingButton.sortOrder ?? buttons.length,
      isActive: editingButton.isActive ?? true,
      noDiscountAllowed: editingButton.noDiscountAllowed || false,
      variablePrice: editingButton.variablePrice || false,
      noVat: editingButton.noVat || false,
    };
    onSave(btn);
    setEditingButton(null);
    setLocalPriceInput('');
    setProductSearch('');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIdx.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIdx.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      dragIdx.current = null;
      setDragOverIdx(null);
      return;
    }
    const reordered = [...buttons];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorder(reordered);
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-900 font-black text-lg">Quick Buttons</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Existing buttons list */}
        <div className="space-y-2 mb-4">
          {buttons.map((btn, i) => (
            <div
              key={btn.id}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing ${
                dragOverIdx === i ? 'border-blue-400 border-t-2' : 'border-gray-200'
              }`}
            >
              <GripVertical size={14} className="text-gray-300 shrink-0" />
              <div className={`w-3 h-3 rounded-full ${btn.color} shrink-0`} />
              <span className="text-gray-900 text-sm flex-1 font-medium truncate">{btn.label}</span>
              {btn.variablePrice && (
                <span className="text-violet-600 text-[9px] font-bold bg-violet-50 px-1 py-0.5 rounded shrink-0">VP</span>
              )}
              {btn.noDiscountAllowed && (
                <span className="text-amber-600 text-[9px] font-bold bg-amber-50 px-1 py-0.5 rounded shrink-0">ND</span>
              )}
              {btn.noVat && (
                <span className="text-rose-600 text-[9px] font-bold bg-rose-50 px-1 py-0.5 rounded shrink-0">NV</span>
              )}
              <span className="text-gray-400 text-xs shrink-0">£{(btn.price ?? 0).toFixed(2)}</span>
              <button onClick={() => handleEdit(btn)} className="text-blue-500 text-xs font-bold hover:text-blue-600 shrink-0">Edit</button>
              <button onClick={() => { if(window.confirm('Delete this quick button?')) onDelete(btn.id); }} className="p-1 text-gray-400 hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        {/* Always-visible Add button */}
        <button
          onClick={handleAddButton}
          className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <Plus size={14} /> Add Quick Button
        </button>

        {/* Add/Edit form */}
        {editingButton && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-gray-900 text-sm font-bold">{editingButton.id ? 'Edit Button' : 'New Button'}</h4>
            <input
              type="text"
              placeholder="Label"
              value={editingButton.label || ''}
              onChange={(e) => setEditingButton(prev => ({ ...prev!, label: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={editingButton.description || ''}
              onChange={(e) => setEditingButton(prev => ({ ...prev!, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none ${editingButton.variablePrice ? 'text-gray-300' : 'text-gray-400'}`}>£</span>
              <input
                type="text"
                placeholder="0.00"
                value={localPriceInput}
                onChange={(e) => setLocalPriceInput(e.target.value.replace(/[^0-9.]/g, ''))}
                onBlur={handlePriceBlur}
                disabled={editingButton.variablePrice || false}
                className={`w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 ${editingButton.variablePrice ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-gray-900'}`}
              />
            </div>
            {/* Product link picker */}
            <div>
              {editingButton.productId ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl mb-2">
                  <span className="text-gray-900 text-sm flex-1 truncate">
                    {activeProducts.find(p => p.id === editingButton.productId)?.name || 'Unknown product'}
                  </span>
                  <button
                    onClick={() => { setEditingButton(prev => ({ ...prev!, productId: undefined })); setProductSearch(''); }}
                    className="text-red-500 hover:text-red-600 text-xs font-bold shrink-0"
                  >Unlink</button>
                </div>
              ) : (
                <p className="text-gray-400 text-xs mb-2">No linked product (misc)</p>
              )}
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500"
              />
              {productSearch && (
                <div className="mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {activeProducts
                    .filter(p => {
                      const q = productSearch.toLowerCase();
                      return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
                    })
                    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }))
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setEditingButton(prev => ({ ...prev!, productId: p.id })); setProductSearch(''); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 transition-colors"
                      >
                        {p.name} <span className="text-gray-400 text-xs">{p.barcode}</span>
                      </button>
                    ))}
                  {activeProducts.filter(p => {
                    const q = productSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
                  }).length === 0 && (
                    <p className="px-3 py-2 text-gray-400 text-xs">No products found</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setEditingButton(prev => ({ ...prev!, color: c }))}
                  className={`w-7 h-7 rounded-lg ${c} ${editingButton.color === c ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-50' : ''}`}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingButton.noDiscountAllowed || false}
                onChange={(e) => setEditingButton(prev => ({ ...prev!, noDiscountAllowed: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-gray-700 text-sm">No discount allowed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingButton.variablePrice || false}
                onChange={(e) => setEditingButton(prev => ({ ...prev!, variablePrice: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-gray-700 text-sm">Variable price</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingButton.noVat || false}
                onChange={(e) => setEditingButton(prev => ({ ...prev!, noVat: e.target.checked, reducedVat: e.target.checked ? false : prev?.reducedVat }))}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-gray-700 text-sm">Zero-Rate VAT</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingButton.reducedVat || false}
                onChange={(e) => setEditingButton(prev => ({ ...prev!, reducedVat: e.target.checked, noVat: e.target.checked ? false : prev?.noVat }))}
                className="w-4 h-4 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span className="text-gray-700 text-sm">Reduced Rate VAT (5%)</span>
            </label>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">Save</button>
              <button onClick={() => setEditingButton(null)} className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

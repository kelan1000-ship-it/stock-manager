
import React, { useState, useMemo } from 'react';
import { LayoutGrid, Plus, X, Edit2, Check, Cuboid, Trash2 } from 'lucide-react';
import { Product, PlanogramLayout, PlanogramFace } from '../types';
import { SafeImage } from './SafeImage';

interface ShelfPlanogramViewProps {
  activePlanogram: PlanogramLayout;
  planograms: PlanogramLayout[];
  inventory: Product[];
  viewMode: '2d' | '3d';
  rotation: number;
  draggedItem: { type: 'library' | 'shelf' | 'floor_tool', id: string | number, faceId?: string } | null;
  dragOverSlotId: number | null;
  setDragOverSlotId: (id: number | null) => void;
  onSelectPlanogram: (id: string) => void;
  onAddPlanogram: () => void;
  onUpdatePlanogramDetails: (id: string, updates: { name: string; rows: number; cols: number }, faceId?: string) => void;
  setIsAllShelvesOpen: (isOpen: boolean) => void;
  onDragStart: (e: React.DragEvent, type: 'library' | 'shelf' | 'floor_tool', id: string | number, faceId?: string) => void;
  onDragEnd: () => void;
  onDropOnSlot: (e: React.DragEvent, slotId: number, faceId?: string) => void;
  onUpdateSlot: (slotId: number, productId: string | null, faceId?: string) => void;
  setSelectingSlotId: (id: number) => void;
  setPickerSearch: (term: string) => void;
  onAddFace?: (planogramId: string, name: string, rows: number, cols: number) => void;
  onRemoveFace?: (planogramId: string, faceId: string) => void;
}

export const ShelfPlanogramView: React.FC<ShelfPlanogramViewProps> = ({
  activePlanogram,
  planograms,
  inventory,
  viewMode,
  rotation,
  draggedItem,
  dragOverSlotId,
  setDragOverSlotId,
  onSelectPlanogram,
  onAddPlanogram,
  onUpdatePlanogramDetails,
  setIsAllShelvesOpen,
  onDragStart,
  onDragEnd,
  onDropOnSlot,
  onUpdateSlot,
  setSelectingSlotId,
  setPickerSearch,
  onAddFace,
  onRemoveFace
}) => {
  const [editingFace, setEditingFace] = useState<{ id: string | null, name: string, rows: number, cols: number } | null>(null);
  const [activeFaceId, setActiveFaceId] = useState<string | 'main'>('main');
  const [isAddingFace, setIsAddingFace] = useState(false);
  const [newFaceName, setNewFaceName] = useState('');

  // Determine current face data
  const currentFace = useMemo(() => {
    if (activeFaceId === 'main') {
        return { 
            id: undefined, // Main face has no ID in current structure, handled as undefined/null
            name: activePlanogram.name, // Or "Side A" visual override
            rows: activePlanogram.rows, 
            cols: activePlanogram.cols, 
            slots: activePlanogram.slots 
        };
    }
    return activePlanogram.faces?.find(f => f.id === activeFaceId);
  }, [activePlanogram, activeFaceId]);

  const openEditModal = () => {
    if (!currentFace) return;
    setEditingFace({
        id: activeFaceId === 'main' ? null : activeFaceId,
        name: activeFaceId === 'main' ? activePlanogram.name : currentFace.name,
        rows: currentFace.rows,
        cols: currentFace.cols
    });
  };

  const saveChanges = () => {
    if (editingFace) {
      onUpdatePlanogramDetails(activePlanogram.id, {
        name: editingFace.name,
        rows: editingFace.rows,
        cols: editingFace.cols
      }, editingFace.id || undefined);
      setEditingFace(null);
    }
  };

  const handleAddSide = () => {
      if (onAddFace) {
          onAddFace(activePlanogram.id, newFaceName || `Side ${ (activePlanogram.faces?.length || 0) + 2 }`, activePlanogram.rows, activePlanogram.cols);
          setIsAddingFace(false);
          setNewFaceName('');
      }
  };

  const handleDeleteFace = () => {
      if (!onRemoveFace || activeFaceId === 'main') return;
      if (window.confirm('Are you sure you want to delete this face? All items on this side will be removed.')) {
          onRemoveFace(activePlanogram.id, activeFaceId);
          setActiveFaceId('main');
      }
  };

  const handleDragOverSlot = (e: React.DragEvent, slotId: number) => {
    e.preventDefault();
    if (draggedItem?.type === 'library' || draggedItem?.type === 'shelf') {
      if (dragOverSlotId !== slotId) setDragOverSlotId(slotId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Ensure active face resets if planogram changes
  React.useEffect(() => {
      setActiveFaceId('main');
  }, [activePlanogram.id]);

  if (!currentFace) return <div>Error loading face data</div>;

  return (
    <>
      {/* PLANOGRAM SELECTOR STRIP */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-4 w-full">
            <button 
                onClick={() => setIsAllShelvesOpen(true)}
                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0 shadow-lg border border-slate-700"
                title="View All Shelves"
            >
                <LayoutGrid size={20} />
            </button>
            
            <div className="flex-1 flex gap-3 overflow-x-auto pb-2 -mb-2 scrollbar-hide mask-fade-sides items-center">
                {planograms.map(p => (
                <div key={p.id} className="relative group">
                    <button 
                        onClick={() => onSelectPlanogram(p.id)}
                        className={`flex-shrink-0 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activePlanogram.id === p.id 
                            ? 'bg-emerald-600 text-white shadow-lg scale-105' 
                            : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {p.name}
                    </button>
                </div>
                ))}
            </div>

            <button 
            onClick={onAddPlanogram}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-emerald-500/50 transition-all shrink-0 whitespace-nowrap"
            >
            <Plus size={14} /> New Unit
            </button>
        </div>

        {/* FACE SELECTOR & EDIT TOOLBAR */}
        <div className="flex items-center justify-between px-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button 
                    onClick={() => setActiveFaceId('main')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFaceId === 'main' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                >
                    <Cuboid size={14} />
                    Side A (Main)
                </button>
                {activePlanogram.faces?.map((face, idx) => (
                    <button 
                        key={face.id}
                        onClick={() => setActiveFaceId(face.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFaceId === face.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                    >
                        <Cuboid size={14} />
                        {face.name || `Side ${idx + 2}`}
                    </button>
                ))}
                
                {onAddFace && (
                    <button 
                        onClick={() => setIsAddingFace(true)}
                        className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all"
                        title="Add Side/Face"
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={openEditModal}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all"
                >
                    <Edit2 size={12} /> Edit Face
                </button>
                {activeFaceId !== 'main' && onRemoveFace && (
                    <button 
                        onClick={handleDeleteFace}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-900/20 text-rose-500 font-black text-[9px] uppercase tracking-widest hover:bg-rose-900/40 transition-all"
                    >
                        <Trash2 size={12} /> Remove
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Add Face Modal */}
      {isAddingFace && (
          <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
             <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-8 animate-in zoom-in duration-200">
                <h3 className="text-xl font-black text-white mb-4">Add Gondola Side</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Side Name</label>
                        <input type="text" value={newFaceName} onChange={e => setNewFaceName(e.target.value)} placeholder="e.g. End Cap, Side B" className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm text-white focus:border-indigo-500 outline-none transition-colors" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsAddingFace(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs">Cancel</button>
                        <button onClick={handleAddSide} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-lg hover:bg-indigo-500">Add Side</button>
                    </div>
                </div>
             </div>
          </div>
      )}

      {/* Edit Modal */}
      {editingFace && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-8 animate-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Edit {activeFaceId === 'main' ? 'Main Shelf' : 'Side Face'}</h3>
                    <button onClick={() => setEditingFace(null)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Face Name</label>
                        <input type="text" value={editingFace.name} onChange={e => setEditingFace({...editingFace, name: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm text-white focus:border-emerald-500 outline-none transition-colors shadow-inner" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rows</label>
                            <input type="number" value={editingFace.rows} onChange={e => setEditingFace({...editingFace, rows: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm text-white focus:border-emerald-500 outline-none transition-colors shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Columns</label>
                            <input type="number" value={editingFace.cols} onChange={e => setEditingFace({...editingFace, cols: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm text-white focus:border-emerald-500 outline-none transition-colors shadow-inner" />
                        </div>
                    </div>
                    
                    <button onClick={saveChanges} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95">
                        <Check size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 3D Viewport */}
      <div className={`flex-1 relative flex items-center justify-center p-6 md:p-10 overflow-hidden rounded-[3.5rem] transition-all duration-1000 ease-in-out ${viewMode === '3d' ? 'perspective-[2500px] bg-slate-200 border-[16px] border-slate-300 shadow-2xl' : 'bg-slate-900/10 border-2 border-dashed border-slate-300'}`}>
        {viewMode === '3d' && (
          <div className="absolute inset-0 pointer-events-none z-0 animate-in fade-in duration-1000">
            <div className="absolute top-0 bottom-0 left-[2%] w-6 bg-slate-300 border-x border-slate-400 shadow-sm" />
            <div className="absolute top-0 bottom-0 right-[2%] w-6 bg-slate-300 border-x border-slate-400 shadow-sm" />
            {Array.from({ length: currentFace.rows + 1 }).map((_, i) => (
              <div key={i} className="absolute left-[2%] right-[2%] h-6 bg-slate-100/50 border-y border-slate-300" style={{ top: `${(i / currentFace.rows) * 100}%` }} />
            ))}
          </div>
        )}

        <div 
          className={`relative transition-all duration-700 ease-out z-10 ${viewMode === '3d' ? 'preserve-3d' : ''}`}
          style={{ transform: viewMode === '3d' ? `rotateY(${rotation}deg) rotateX(2deg)` : 'none', width: '98%', height: '98%' }}
        >
          <div 
            className={`grid gap-2 md:gap-4 mx-auto transition-all duration-700 ${viewMode === '3d' ? 'preserve-3d' : ''}`} 
            style={{ gridTemplateColumns: `repeat(${currentFace.cols}, 1fr)`, gridTemplateRows: `repeat(${currentFace.rows}, 1fr)`, height: '100%' }}
          >
            {currentFace.slots.map(slot => {
              const product = slot.productId ? inventory.find(i => i.id === slot.productId) : null;
              const isBeingHovered = dragOverSlotId === slot.id;
              const isDraggingItem = !!draggedItem && (draggedItem.type === 'library' || draggedItem.type === 'shelf');

              return (
                <div 
                  key={slot.id}
                  onDragOver={(e) => handleDragOverSlot(e, slot.id)}
                  onDragLeave={() => setDragOverSlotId(null)}
                  onDrop={(e) => onDropOnSlot(e, slot.id, activeFaceId === 'main' ? undefined : activeFaceId)}
                  onClick={() => {
                    if (!product) {
                      setSelectingSlotId(slot.id);
                      setPickerSearch('');
                    }
                  }}
                  className={`relative transition-all flex flex-col items-center justify-center group cursor-pointer rounded-2xl overflow-hidden ${viewMode === '3d' ? 'preserve-3d' : ''} ${
                    isBeingHovered ? 'ring-8 ring-emerald-500 ring-inset bg-emerald-500/30 z-20 scale-[1.05] shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 
                    product ? (viewMode === '3d' ? 'bg-white/60 shadow-xl border border-white/50' : 'bg-white border border-slate-200 shadow-md') : 
                    isDraggingItem ? 'bg-emerald-500/10 border-2 border-dashed border-emerald-500/50' :
                    'bg-slate-500/5 border border-dashed border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {product ? (
                    <div draggable onDragStart={(e) => onDragStart(e, 'shelf', slot.id, activeFaceId === 'main' ? undefined : activeFaceId)} onDragEnd={onDragEnd} className={`w-full h-full p-2 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-all ${viewMode === '3d' ? 'preserve-3d' : ''} ${draggedItem?.type === 'shelf' && draggedItem?.id === slot.id ? 'opacity-30' : ''}`}>
                      <div className={`w-14 h-14 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white transition-all shadow-lg group-hover:scale-110 pointer-events-none relative`}>
                        <SafeImage src={product.productImage || ''} alt="" className="w-full h-full object-contain p-2" />
                        
                        {/* Hover Overlay: Name */}
                        <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                           <p className="text-[7px] md:text-[9px] font-black text-white text-center capitalize tracking-wide leading-tight line-clamp-4">
                              {product.name}
                           </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSlot(slot.id, null, activeFaceId === 'main' ? undefined : activeFaceId); }}
                        className="absolute top-1 right-1 p-1.5 rounded-lg bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center gap-2 transition-all ${isBeingHovered ? 'opacity-100 scale-110 text-emerald-600' : 'opacity-20 group-hover:opacity-60 text-slate-500'}`}>
                       <Plus size={24} />
                       <span className="text-[8px] font-black uppercase tracking-widest">Place Item</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .perspective-2500 { perspective: 2500px; }
        .preserve-3d { transform-style: preserve-3d; }
        .mask-fade-sides {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </>
  );
};

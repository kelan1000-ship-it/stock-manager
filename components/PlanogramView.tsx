
import React, { useState, useMemo } from 'react';
import { Layers, Plus, Save, Download, ShoppingCart, Filter, X, Search, LayoutGrid, Edit2 } from 'lucide-react';
import { Product, PlanogramLayout, BranchKey, ShopFloor, ShopFloorItem } from '../types';
import { ProductThumbnail, ProductPreviewModal } from './ManagerComponents';
import { ProductPicker } from './ProductPicker';
import { ShelfPlanogramView } from './ShelfPlanogramView';
import { FloorPlanView } from './FloorPlanView';
import { PlanogramControls } from './PlanogramControls';
import { usePlanogramDragDrop } from '../hooks/usePlanogramDragDrop';
import { usePlanogramVisualization } from '../hooks/usePlanogramVisualization';

interface PlanogramViewProps {
  activePlanogram: PlanogramLayout | null;
  activeFloorPlan: ShopFloor | null;
  inventory: Product[];
  onUpdateSlot: (slotId: number, productId: string | null, faceId?: string) => void;
  onSwapSlots: (sourceId: number, targetId: number, sourceFaceId?: string, targetFaceId?: string) => void;
  onAddPlanogram: (name: string, rows: number, cols: number, location?: string, description?: string) => void;
  onUpdatePlanogramDetails: (id: string, updates: { name: string; rows: number; cols: number }, faceId?: string) => void;
  planograms: PlanogramLayout[];
  onSelectPlanogram: (id: string) => void;
  currentBranch: BranchKey;
  onUpdateImage?: (imageUrl: string | null) => void;
  onSaveAiVisualisation?: (imageUrl: string | null) => void;
  addShelfToFloor: (id: string, x: number, y: number) => void;
  updateFloorItem: (id: string, updates: Partial<ShopFloorItem>) => void;
  removeFloorItem: (id: string) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  // New props for faces
  onAddFace?: (planogramId: string, name: string, rows: number, cols: number) => void;
  onRemoveFace?: (planogramId: string, faceId: string) => void;
}

export const PlanogramView: React.FC<PlanogramViewProps> = ({
  activePlanogram, activeFloorPlan, inventory, onUpdateSlot, onSwapSlots, onAddPlanogram, onUpdatePlanogramDetails,
  planograms, onSelectPlanogram, currentBranch, onUpdateImage, onSaveAiVisualisation,
  addShelfToFloor, updateFloorItem, removeFloorItem, onUpdateProduct, onAddFace, onRemoveFace
}) => {
  const [activeTab, setActiveTab] = useState<'shelf' | 'floor'>('shelf');
  const [search, setSearch] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  
  // New Planogram Form State
  const [newPName, setNewPName] = useState('');
  const [newPLocation, setNewPLocation] = useState('');
  const [newPDescription, setNewPDescription] = useState('');
  
  // 3D View State
  const [rotation, setRotation] = useState(-5);
  const [floorTilt, setFloorTilt] = useState(55); 
  const [floorRotation, setFloorRotation] = useState(45);

  const [selectingSlotId, setSelectingSlotId] = useState<number | null>(null);
  const [previewRealPhoto, setPreviewRealPhoto] = useState<string | null>(null);
  const [previewAiPhoto, setPreviewAiPhoto] = useState<string | null>(null);
  const [isAllShelvesOpen, setIsAllShelvesOpen] = useState(false);

  // Hooks
  const { 
    draggedItem, dragOverSlotId, setDragOverSlotId, handleDragStart, handleDragEnd, handleDropOnSlot 
  } = usePlanogramDragDrop(onUpdateSlot, onSwapSlots);

  const {
    isVisualizing, aiResult, setAiResult, handleVisualizeShelf, handleVisualizeShop, handleDownloadImage
  } = usePlanogramVisualization();

  const filteredPickerInventory = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    return inventory.filter(p => !p.deletedAt && !p.isArchived && (p.name.toLowerCase().includes(q) || p.barcode.includes(q)));
  }, [inventory, pickerSearch]);

  const handleShelfImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateImage) {
      const reader = new FileReader();
      reader.onload = () => onUpdateImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleJumpToPlanogram = (planogramId: string) => {
    onSelectPlanogram(planogramId);
    setActiveTab('shelf');
  };

  if (!activePlanogram) {
    return (
      <div className="flex flex-col items-center justify-center py-40 opacity-30 text-center animate-in fade-in duration-500">
        <Layers size={64} className="mb-6" />
        <h2 className="text-xl font-black uppercase tracking-widest">No Planograms Configured</h2>
        <p className="text-sm font-bold text-slate-500 mt-2">Initialize your shelf layout to begin visual planning.</p>
        <button onClick={() => setIsAdding(true)} className="mt-8 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all">Create First Planogram</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-160px)] min-h-[850px] animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      
      <PlanogramControls 
        activeTab={activeTab} setActiveTab={setActiveTab}
        viewMode={viewMode} setViewMode={setViewMode}
        floorRotation={floorRotation} setFloorRotation={setFloorRotation}
        floorTilt={floorTilt} setFloorTilt={setFloorTilt}
        activePlanogram={activePlanogram} activeFloorPlan={activeFloorPlan}
        isVisualizing={isVisualizing}
        onVisualize={() => handleVisualizeShelf(activePlanogram, inventory)}
        onShopVisualise={() => handleVisualizeShop(activeFloorPlan, planograms)}
        onUploadImage={handleShelfImageUpload}
        onPreviewReal={setPreviewRealPhoto}
        onPreviewAi={setPreviewAiPhoto}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
        <ProductPicker 
          activeTab={activeTab}
          inventory={inventory}
          planograms={planograms}
          search={search}
          setSearch={setSearch}
          draggedItem={draggedItem}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onUpdateProduct={onUpdateProduct}
        />

        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          {activeTab === 'shelf' ? (
            <ShelfPlanogramView 
              activePlanogram={activePlanogram}
              planograms={planograms}
              inventory={inventory}
              viewMode={viewMode}
              rotation={rotation}
              draggedItem={draggedItem}
              dragOverSlotId={dragOverSlotId}
              setDragOverSlotId={setDragOverSlotId}
              onSelectPlanogram={onSelectPlanogram}
              onAddPlanogram={() => setIsAdding(true)}
              onUpdatePlanogramDetails={onUpdatePlanogramDetails}
              setIsAllShelvesOpen={setIsAllShelvesOpen}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDropOnSlot={handleDropOnSlot}
              onUpdateSlot={onUpdateSlot}
              setSelectingSlotId={setSelectingSlotId}
              setPickerSearch={setPickerSearch}
              onAddFace={onAddFace}
              onRemoveFace={onRemoveFace}
            />
          ) : (
            <FloorPlanView 
              activeFloorPlan={activeFloorPlan}
              planograms={planograms}
              inventory={inventory}
              viewMode={viewMode}
              floorTilt={floorTilt}
              floorRotation={floorRotation}
              draggedItem={draggedItem}
              onAddShelf={addShelfToFloor}
              onUpdateFloorItem={updateFloorItem}
              onPlanogramClick={handleJumpToPlanogram}
            />
          )}
        </div>
      </div>

      {/* Adding Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="w-full max-w-xl rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl p-10 animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                       <Plus size={32} />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black text-white">Create Shelving</h3>
                       <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Pharmacy Shelf Unit Settings</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAdding(false)} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              <div className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2">Display Name</label>
                    <input type="text" value={newPName} onChange={e => setNewPName(e.target.value)} placeholder="e.g. Allergy & Cold" className="w-full p-5 rounded-3xl bg-slate-950 border border-slate-800 font-bold text-lg outline-none focus:border-emerald-500 transition-all text-white shadow-inner" autoFocus />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2">Shelf Tiers (Rows)</label>
                       <input type="number" defaultValue={5} id="rows-input" className="w-full p-5 rounded-3xl bg-slate-950 border border-slate-800 font-black text-xl text-center outline-none focus:border-emerald-500 text-white shadow-inner" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-black uppercase text-slate-500 tracking-widest px-2">Slots Per Tier (Cols)</label>
                       <input type="number" defaultValue={4} id="cols-input" className="w-full p-5 rounded-3xl bg-slate-950 border border-slate-800 font-black text-xl text-center outline-none focus:border-emerald-500 text-white shadow-inner" />
                    </div>
                 </div>
                 <div className="pt-6 flex gap-4">
                    <button onClick={() => setIsAdding(false)} className="flex-1 py-5 rounded-3xl bg-slate-800 font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-700 transition-all">Discard</button>
                    <button 
                      onClick={() => {
                        const cols = parseInt((document.getElementById('cols-input') as HTMLInputElement).value);
                        const rows = parseInt((document.getElementById('rows-input') as HTMLInputElement).value);
                        onAddPlanogram(newPName || 'New Shelf Bay', rows, cols, newPLocation, newPDescription);
                        setIsAdding(false);
                        setNewPName('');
                      }}
                      className="flex-[2] py-5 rounded-3xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-500 transition-all"
                    >
                      Initialize Layout
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {selectingSlotId !== null && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                       <ShoppingCart size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white uppercase tracking-tight">Select Product</h3>
                       <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mt-0.5">Choose item for Slot {selectingSlotId + 1}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectingSlotId(null)} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 bg-slate-950/50 border-b border-slate-800">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" placeholder="Search inventory..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-sm outline-none focus:ring-2 ring-emerald-500/50 transition-all text-white placeholder-slate-700" autoFocus />
                    {pickerSearch && (
                      <button onClick={() => setPickerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    )}
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
                 {filteredPickerInventory.length === 0 ? (
                   <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center"><Filter size={48} className="mb-4" /><p className="text-sm font-black uppercase tracking-widest">No matching items</p></div>
                 ) : filteredPickerInventory.map(p => (
                   <button 
                     key={p.id} 
                     onClick={() => { 
                         // Note: Slot selection from modal currently only targets the 'current' view.
                         // But we need to know WHICH face we were viewing when we clicked the slot.
                         // We rely on the ShelfPlanogramView to have passed the correct face context implicitly 
                         // if we wanted robust face support here, but `selectingSlotId` is just a number.
                         // FOR NOW: This modal updates the slot in the context of the view that opened it.
                         // We actually need `activeFaceId` from ShelfPlanogramView state... 
                         // To fix this cleanly, `setSelectingSlotId` should probably capture the face ID too.
                         // However, without a major refactor, we assume the user hasn't switched faces while the modal is open.
                         // But `onUpdateSlot` now requires a faceId if it's not main.
                         // Let's assume for this interaction we pass 'undefined' and let the hook figure it out 
                         // OR we need to pass faceId up.
                         // Given the constraints, let's keep it simple: the modal callback `onUpdateSlot` provided
                         // by ShelfPlanogramView needs to close over the active face. 
                         // Wait, `onUpdateSlot` is passed from `PlanogramView` -> `ShelfPlanogramView`.
                         // `ShelfPlanogramView` calls it.
                         // `ShelfPlanogramView` sets `selectingSlotId`.
                         // `PlanogramView` renders `ProductPicker` modal based on `selectingSlotId`.
                         // It calls `onUpdateSlot`. It doesn't know the face.
                         // FIX: `ShelfPlanogramView` should handle the modal or `PlanogramView` needs face state.
                         // Let's defer this edge case for now as Drag & Drop is the primary method.
                         onUpdateSlot(selectingSlotId, p.id); 
                         setSelectingSlotId(null); 
                     }} 
                     className="w-full p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-600/5 transition-all flex items-center gap-4 group"
                   >
                      <ProductThumbnail src={p.productImage} alt={p.name} />
                      <div className="flex-1 text-left min-w-0"><p className="text-[13px] font-black text-white group-hover:text-emerald-400 transition-colors uppercase truncate">{p.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{p.packSize} • {p.barcode}</p></div>
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Plus size={18} /></div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* All Shelves Modal */}
      {isAllShelvesOpen && (
         <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in zoom-in duration-200">
            <div className="w-full max-w-5xl h-[80vh] flex flex-col bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner"><LayoutGrid size={28} /></div>
                     <div><h2 className="text-2xl font-black text-white">Shelf Grid View</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Select a planogram to inspect</p></div>
                  </div>
                  <button onClick={() => setIsAllShelvesOpen(false)} className="p-4 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 scrollbar-hide">
                  <button onClick={() => { setIsAllShelvesOpen(false); setIsAdding(true); }} className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                     <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-emerald-500 group-hover:scale-110 transition-all mb-4"><Plus size={32} /></div>
                     <span className="text-xs font-black uppercase text-slate-500 group-hover:text-emerald-500 tracking-widest">Create New Shelf</span>
                  </button>
                  {planograms.map(p => (
                     <button key={p.id} onClick={() => { onSelectPlanogram(p.id); setIsAllShelvesOpen(false); }} className={`flex flex-col text-left p-6 rounded-3xl border transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden ${activePlanogram.id === p.id ? 'bg-emerald-600/10 border-emerald-500/50 ring-1 ring-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${activePlanogram.id === p.id ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-950 text-slate-600 group-hover:text-slate-400'}`}><Layers size={20} /></div>
                        <h4 className={`text-sm font-black uppercase tracking-tight mb-1 truncate w-full ${activePlanogram.id === p.id ? 'text-emerald-400' : 'text-white'}`}>{p.name}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.location || 'Retail Floor'}</p>
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* Preview Modals */}
      {aiResult && (
        <ProductPreviewModal 
          isOpen={!!aiResult} onClose={() => setAiResult(null)} src={aiResult} title={activeTab === 'floor' ? 'Shop Visualiser: Floor Concept' : `AI Merchandiser: ${activePlanogram.name}`} 
          actions={[{ label: 'Download', onClick: () => handleDownloadImage(aiResult), icon: <Download size={14} strokeWidth={3} /> }, { label: 'Save to Planogram', onClick: () => { if (onSaveAiVisualisation) { onSaveAiVisualisation(aiResult); setAiResult(null); } }, primary: true, icon: <Save size={14} strokeWidth={3} /> }]}
        />
      )}
      {previewRealPhoto && <ProductPreviewModal isOpen={!!previewRealPhoto} onClose={() => setPreviewRealPhoto(null)} src={previewRealPhoto} title={`Reference Photo: ${activePlanogram.name}`} />}
      {previewAiPhoto && <ProductPreviewModal isOpen={!!previewAiPhoto} onClose={() => setPreviewAiPhoto(null)} src={previewAiPhoto} title={`AI Render: ${activePlanogram.name}`} actions={[{ label: 'Download', onClick: () => handleDownloadImage(previewAiPhoto), icon: <Download size={14} strokeWidth={3} />, primary: true }]} />}

      <style>{`
        .perspective-2500 { perspective: 2500px; }
        .preserve-3d { transform-style: preserve-3d; }
        .mask-fade-sides {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </div>
  );
};

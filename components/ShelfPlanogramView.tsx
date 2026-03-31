
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { LayoutGrid, Plus, X, Edit2, Check, Cuboid, Trash2, ZoomIn, ZoomOut, RotateCcw, Save, FolderOpen, Lock, Unlock, Camera, Maximize2, Minimize2, Settings } from 'lucide-react';
import { Product, PlanogramLayout, PlanogramFace } from '../types';
import { SafeImage } from './SafeImage';
import { LiveVisionScanner } from './BarcodeScanner';

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
  onUpdateSlotPurpose?: (slotId: number, purpose: 'product' | 'gap' | undefined, faceId?: string) => void;
  setSelectingSlotId: (id: number) => void;
  setPickerSearch: (term: string) => void;
  onAddFace?: (planogramId: string, name: string, rows: number, cols: number) => void;
  onRemoveFace?: (planogramId: string, faceId: string) => void;
  activeFaceId: string | 'main';
  setActiveFaceId: (id: string | 'main') => void;
  onUpdateProduct?: (id: string, updates: Partial<Product>) => void;
  isLocked?: boolean;
  setIsLocked?: (locked: boolean) => void;
  onSaveConfiguration?: (planogramId: string, name: string) => void;
  onLoadConfiguration?: (planogramId: string, configId: string) => void;
  onDeleteConfiguration?: (planogramId: string, configId: string) => void;
  onRenameConfiguration?: (planogramId: string, configId: string, newName: string) => void;
  onOpenProductEdit?: (product: Product) => void;
  onDeletePlanogram?: (planogramId: string) => void;
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
  onUpdateSlotPurpose,
  setSelectingSlotId,
  setPickerSearch,
  onAddFace,
  onRemoveFace,
  activeFaceId,
  setActiveFaceId,
  onUpdateProduct,
  isLocked = false,
  setIsLocked,
  onSaveConfiguration,
  onLoadConfiguration,
  onDeleteConfiguration,
  onRenameConfiguration,
  onOpenProductEdit,
  onDeletePlanogram
}) => {
  const [editingFace, setEditingFace] = useState<{ id: string | null, name: string, rows: number, cols: number } | null>(null);
  const [isAddingFace, setIsAddingFace] = useState(false);
  const [isManagingConfigs, setIsManagingConfigs] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [newFaceName, setNewFaceName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewPriceInput, setPreviewPriceInput] = useState<string>('');
  const [isPreviewLocked, setIsPreviewLocked] = useState(true);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showShelfMgmt, setShowShelfMgmt] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingConfigName, setEditingConfigName] = useState('');
  const [zoomInput, setZoomInput] = useState(String(Math.round(zoom * 100)));
  const [editingMainName, setEditingMainName] = useState(false);
  const [mainNameDraft, setMainNameDraft] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const shelfMgmtRef = useRef<HTMLDivElement>(null);
  const mainNameInputRef = useRef<HTMLInputElement>(null);

  const clampZoom = (z: number) => Math.min(3, Math.max(0.3, z));

  useEffect(() => setZoomInput(String(Math.round(zoom * 100))), [zoom]);

  useEffect(() => { if (editingMainName) mainNameInputRef.current?.select(); }, [editingMainName]);

  const commitZoomInput = () => {
    const val = parseInt(zoomInput);
    if (!isNaN(val)) setZoom(clampZoom(val / 100));
    else setZoomInput(String(Math.round(zoom * 100)));
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(prev => clampZoom(prev - e.deltaY * 0.002));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shelfMgmtRef.current && !shelfMgmtRef.current.contains(event.target as Node)) setShowShelfMgmt(false);
    };
    if (showShelfMgmt) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShelfMgmt]);

  // Determine current face data
  const currentFace = useMemo(() => {
    if (activeFaceId === 'main') {
        return { 
            id: undefined, // Main face has no ID in current structure, handled as undefined/null
            name: activePlanogram.name, // Or "Side A" visual override
            rows: activePlanogram.rows, 
            cols: activePlanogram.cols, 
            slots: activePlanogram.slots,
            realShelfImage: activePlanogram.realShelfImage
        };
    }
    const face = activePlanogram.faces?.find(f => f.id === activeFaceId);
    return face ? {
        ...face,
        realShelfImage: face.realShelfImage || activePlanogram.realShelfImage
    } : null;
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

  const handleDragOverSlot = (e: React.DragEvent, slotId: number, slot: { purpose?: string }) => {
    e.preventDefault();
    if (slot.purpose === 'gap') {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    if (draggedItem?.type === 'library' || draggedItem?.type === 'shelf') {
      if (dragOverSlotId !== slotId) setDragOverSlotId(slotId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  if (!currentFace) return <div>Error loading face data</div>;

  return (
    <>
      {/* PLANOGRAM SELECTOR STRIP */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-4 w-full">
            <button 
                onClick={() => setIsAllShelvesOpen(true)}
                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0 shadow-lg border border-slate-700"
                data-tooltip="View All Shelves"
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
                    onDoubleClick={(e) => { e.stopPropagation(); setMainNameDraft(activePlanogram.name || 'Side A (Main)'); setEditingMainName(true); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFaceId === 'main' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                >
                    <Cuboid size={14} />
                    {editingMainName ? (
                      <input
                        ref={mainNameInputRef}
                        value={mainNameDraft}
                        onChange={e => setMainNameDraft(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={() => { if (mainNameDraft.trim()) onUpdatePlanogramDetails(activePlanogram.id, { name: mainNameDraft.trim(), rows: activePlanogram.rows, cols: activePlanogram.cols }); setEditingMainName(false); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.currentTarget.blur(); }
                          if (e.key === 'Escape') { setEditingMainName(false); }
                        }}
                        className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest w-24 text-center"
                      />
                    ) : (
                      activePlanogram.name || 'Side A (Main)'
                    )}
                </button>
                {activePlanogram.faces?.filter(Boolean).map((face, idx) => (
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
                        data-tooltip="Add Side/Face"
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>

            {setIsLocked && (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-2 rounded-lg transition-colors ${
                            isLocked
                                ? 'text-rose-400 hover:text-rose-300'
                                : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                        data-tooltip={isLocked ? "Unlock Shelf Planogram" : "Lock Shelf Planogram"}
                    >
                        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <div className="w-px h-4 bg-slate-700" />
                    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg px-1.5 py-1">
                        <button onClick={() => setZoom(prev => clampZoom(prev - 0.1))} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" data-tooltip="Zoom Out">
                            <ZoomOut size={14} />
                        </button>
                        <input
                          type="number"
                          min={30} max={300} step={10}
                          value={zoomInput}
                          onChange={e => setZoomInput(e.target.value)}
                          onBlur={commitZoomInput}
                          onKeyDown={e => e.key === 'Enter' && commitZoomInput()}
                          className="text-[10px] font-bold text-slate-300 w-[3rem] text-center tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] font-bold text-slate-400">%</span>
                        <button onClick={() => setZoom(prev => clampZoom(prev + 0.1))} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" data-tooltip="Zoom In">
                            <ZoomIn size={14} />
                        </button>
                        <div className="w-px h-4 bg-slate-700 mx-0.5" />
                        <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" data-tooltip="Reset Zoom">
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div className="relative" ref={shelfMgmtRef}>
                <button
                    onClick={() => setShowShelfMgmt(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${
                        showShelfMgmt
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                    <Settings size={12} /> Shelf Management
                </button>

                {showShelfMgmt && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl z-[50] p-2 animate-in fade-in zoom-in duration-150 bg-slate-900 border-slate-800">
                        <button onClick={() => { openEditModal(); setShowShelfMgmt(false); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                            <Edit2 size={14} /> Edit Face
                        </button>
                        <button onClick={() => { setIsManagingConfigs(true); setShowShelfMgmt(false); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                            <FolderOpen size={14} /> Saved Planograms
                        </button>
                        {activeFaceId !== 'main' && onRemoveFace && (
                            <button onClick={() => { handleDeleteFace(); setShowShelfMgmt(false); }}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                                <Trash2 size={14} /> Remove
                            </button>
                        )}
                        {activeFaceId === 'main' && onDeletePlanogram && (
                            <button onClick={() => {
                                if (window.confirm("Are you sure? Deleting a shelf unit removes all associated products and faces. This cannot be undone.")) {
                                    onDeletePlanogram(activePlanogram.id);
                                }
                                setShowShelfMgmt(false);
                            }}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                                <Trash2 size={14} /> Delete Unit
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Manage Configurations Modal */}
      {isManagingConfigs && (
          <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-8 animate-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white">Shelf Configurations</h3>
                    <button onClick={() => setIsManagingConfigs(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
                </div>

                <div className="space-y-6">
                    {/* Save Current Configuration */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Save Current Layout</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newConfigName} 
                                onChange={e => setNewConfigName(e.target.value)} 
                                placeholder="e.g. Winter Promo Layout" 
                                className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 font-bold text-sm text-white focus:border-indigo-500 outline-none transition-colors" 
                            />
                            <button 
                                onClick={() => {
                                    if (onSaveConfiguration && newConfigName.trim()) {
                                        onSaveConfiguration(activePlanogram.id, newConfigName.trim());
                                        setNewConfigName('');
                                    }
                                }}
                                disabled={!newConfigName.trim() || !onSaveConfiguration}
                                className="px-4 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
                            >
                                <Save size={14} /> Save
                            </button>
                        </div>
                    </div>

                    {/* Saved Configurations List */}
                    <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Saved Layouts</h4>
                        {activePlanogram.savedConfigurations && activePlanogram.savedConfigurations.length > 0 ? (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {activePlanogram.savedConfigurations.map(config => (
                                    <div key={config.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors group">
                                        <div className="flex flex-col min-w-0 pr-4 flex-1">
                                            {editingConfigId === config.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingConfigName}
                                                        onChange={e => setEditingConfigName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && editingConfigName.trim()) {
                                                                onRenameConfiguration?.(activePlanogram.id, config.id, editingConfigName.trim());
                                                                setEditingConfigId(null);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingConfigId(null);
                                                            }
                                                        }}
                                                        className="flex-1 p-1.5 rounded-lg bg-slate-900 border border-indigo-500 font-bold text-sm text-white outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (editingConfigName.trim()) {
                                                                onRenameConfiguration?.(activePlanogram.id, config.id, editingConfigName.trim());
                                                                setEditingConfigId(null);
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-colors"
                                                        data-tooltip="Save Name"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingConfigId(null)}
                                                        className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                                                        data-tooltip="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-white text-sm truncate">{config.name}</span>
                                                    <span className="text-[9px] font-mono text-slate-500">{new Date(config.timestamp).toLocaleString()}</span>
                                                </>
                                            )}
                                        </div>
                                        {editingConfigId !== config.id && (
                                            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingConfigId(config.id);
                                                        setEditingConfigName(config.name);
                                                    }}
                                                    className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors"
                                                    data-tooltip="Rename Configuration"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Load this layout? Your current unsaved changes will be lost.')) {
                                                            onLoadConfiguration?.(activePlanogram.id, config.id);
                                                            setIsManagingConfigs(false);
                                                        }
                                                    }}
                                                    className="p-2 rounded-lg bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-colors"
                                                    data-tooltip="Load Configuration"
                                                >
                                                    <FolderOpen size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this configuration?')) {
                                                            onDeleteConfiguration?.(activePlanogram.id, config.id);
                                                        }
                                                    }}
                                                    className="p-2 rounded-lg bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors"
                                                    data-tooltip="Delete Configuration"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/20">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No saved configurations</span>
                            </div>
                        )}
                    </div>
                </div>
             </div>
          </div>
      )}

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
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-auto rounded-[3.5rem] transition-all duration-1000 ease-in-out perspective-[2500px] bg-slate-200 border-[16px] border-slate-300 shadow-2xl"
      >

        <div
          className="relative transition-all duration-700 ease-out z-10 p-6 md:p-10 preserve-3d"
          style={{
            transform: `rotateY(${rotation}deg) rotateX(2deg) scale(${zoom})`,
            transformOrigin: 'top left',
            width: zoom < 1 ? `${100 / zoom}%` : '100%',
          }}
        >
          <div
            className="grid gap-2 md:gap-4 mx-auto transition-all duration-700 preserve-3d"
            style={{
              gridTemplateColumns: `repeat(${currentFace.cols}, minmax(60px, 1fr))`,
              gridTemplateRows: `repeat(${currentFace.rows}, minmax(60px, 1fr))`,
            }}
          >
            {currentFace.slots.filter(Boolean).map(slot => {
              const isGap = slot.purpose === 'gap';
              const isShelfEnd = slot.purpose === 'shelf_end';
              const product = slot.productId ? inventory.find(i => i.id === slot.productId) : null;
              const isBeingHovered = dragOverSlotId === slot.id && !isGap && !isShelfEnd;
              const isDraggingItem = !!draggedItem && (draggedItem.type === 'library' || draggedItem.type === 'shelf');
              const faceIdParam = activeFaceId === 'main' ? undefined : activeFaceId;

              return (
                <div
                  key={slot.id}
                  onDragOver={(e) => handleDragOverSlot(e, slot.id, slot)}
                  onDragLeave={() => setDragOverSlotId(null)}
                  onDrop={(e) => { if (!isGap && !isShelfEnd) onDropOnSlot(e, slot.id, faceIdParam); }}
                  onClick={() => {
                    if (isGap || isShelfEnd) return;
                    if (product) {
                        setPreviewProduct(product);
                        setPreviewPriceInput(product.price.toFixed(2));
                        return;
                    }
                    if (isLocked) return;
                    setSelectingSlotId(slot.id);
                    setPickerSearch('');
                  }}
                  className={`relative transition-all flex flex-col items-center justify-center group rounded-2xl overflow-hidden aspect-square preserve-3d ${
                    (isGap || isShelfEnd) ? 'cursor-default' :
                    isBeingHovered ? 'ring-8 ring-emerald-500 ring-inset bg-emerald-500/30 z-20 scale-[1.05] shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer' :
                    product ? 'bg-white/60 shadow-xl border border-white/50 cursor-pointer' :
                    isDraggingItem ? 'bg-emerald-500/10 border-2 border-dashed border-emerald-500/50 cursor-pointer' :
                    'bg-slate-500/5 border border-dashed border-slate-300 hover:border-emerald-400 cursor-pointer'
                  }`}
                >
                  {isGap ? (
                    /* GAP SLOT RENDERING */
                    <div className="w-full h-full relative flex flex-col items-center justify-center gap-1 bg-slate-700/30 border-2 border-slate-600/50 rounded-2xl" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(100,116,139,0.15) 6px, rgba(100,116,139,0.15) 8px)' }}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 select-none">GAP</span>
                      {onUpdateSlotPurpose && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateSlotPurpose(slot.id, undefined, faceIdParam); }}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-500 z-30"
                          data-tooltip="Clear gap"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ) : isShelfEnd ? (
                    /* SHELF END RENDERING */
                    <div className="w-full h-full relative flex flex-col items-center justify-center gap-1 bg-amber-700/30 border-2 border-amber-600/50 rounded-2xl" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(217,119,6,0.15) 6px, rgba(217,119,6,0.15) 8px)' }}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 select-none text-center leading-tight">SHELF<br/>END</span>
                      {onUpdateSlotPurpose && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateSlotPurpose(slot.id, undefined, faceIdParam); }}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-amber-600 text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 z-30"
                          data-tooltip="Clear shelf end"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ) : product ? (
                    <div draggable onDragStart={(e) => onDragStart(e, 'shelf', slot.id, faceIdParam)} onDragEnd={onDragEnd} className={`w-full h-full p-2 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-all preserve-3d ${draggedItem?.type === 'shelf' && draggedItem?.id === slot.id ? 'opacity-30' : ''}`}>
                      <div className="w-full h-auto aspect-square max-w-[96px] rounded-2xl overflow-hidden bg-white transition-all shadow-lg group-hover:scale-110 pointer-events-none relative">
                        <SafeImage src={product.productImage || ''} alt="" className="w-full h-full object-contain p-1" />

                        {/* Hover Overlay: Name */}
                        <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                           <p className="text-[7px] md:text-[9px] font-black text-white text-center capitalize tracking-wide leading-tight line-clamp-4">
                              {product.name}
                           </p>
                        </div>
                      </div>

                      {!isLocked && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateSlot(slot.id, null, faceIdParam); }}
                          className="absolute top-1 right-1 p-1.5 rounded-lg bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      <div className={`flex flex-col items-center gap-1 transition-all ${isBeingHovered ? 'opacity-100 scale-110 text-emerald-600' : 'opacity-20 group-hover:opacity-60 text-slate-500'}`}>
                         <Plus size={18} />
                         <span className="text-[7px] font-black uppercase tracking-widest">Place Item</span>
                      </div>
                      {onUpdateSlotPurpose && (
                        <div className="absolute bottom-1 right-1 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdateSlotPurpose(slot.id, 'shelf_end', faceIdParam); }}
                                className="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800/80 hover:text-amber-400 hover:bg-slate-700"
                                data-tooltip="Mark as shelf end"
                            >
                                End
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdateSlotPurpose(slot.id, 'gap', faceIdParam); }}
                                className="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800/80 hover:text-emerald-400 hover:bg-slate-700"
                                data-tooltip="Mark as gap"
                            >
                                Gap
                            </button>
                        </div>
                      )}
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

      {/* Product Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`bg-slate-900 border border-slate-700 ${isPreviewExpanded ? 'p-10 max-w-2xl' : 'p-6 max-w-sm'} rounded-2xl w-full shadow-2xl relative transition-all duration-300`}>
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => setIsPreviewExpanded(!isPreviewExpanded)} className="text-slate-400 hover:text-white transition-colors" data-tooltip={isPreviewExpanded ? "Normal View" : "Enlarged View"}>
                {isPreviewExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button onClick={() => setIsPreviewLocked(!isPreviewLocked)} className={`transition-colors ${isPreviewLocked ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}`} data-tooltip={isPreviewLocked ? "Unlock for quick edits" : "Lock edits"}>
                {isPreviewLocked ? <Lock size={20} /> : <Unlock size={20} />}
              </button>
              <button onClick={() => {
                setPreviewProduct(null);
                setIsPreviewLocked(true);
              }} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col items-center mb-6">
              <div className={`${isPreviewExpanded ? 'w-48 h-48' : 'w-24 h-24'} bg-white rounded-xl p-2 mb-4 shadow-inner transition-all duration-300 hover:scale-[2.5] hover:shadow-2xl cursor-zoom-in relative z-10`}>
                <SafeImage src={previewProduct.productImage || ''} alt={previewProduct.name} className="w-full h-full object-contain" />
              </div>
              <button
                type="button"
                className={`${isPreviewExpanded ? 'text-3xl' : 'text-lg'} font-black text-white text-center leading-tight hover:underline focus:outline-none ${onOpenProductEdit ? 'cursor-pointer hover:text-emerald-400 transition-colors' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onOpenProductEdit && previewProduct) {
                    onOpenProductEdit(previewProduct);
                    setPreviewProduct(null);
                  }
                }}
                data-tooltip={onOpenProductEdit ? "Edit Product" : undefined}
              >
                {previewProduct.name}
              </button>            </div>
            <div className={`${isPreviewExpanded ? 'space-y-6' : 'space-y-3'} text-sm`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className={`text-slate-400 font-bold uppercase tracking-wider ${isPreviewExpanded ? 'text-xs' : 'text-[10px]'}`}>Barcode</span>
                {isPreviewLocked ? (
                  <span className={`text-white font-mono ${isPreviewExpanded ? 'text-xl' : ''}`}>{previewProduct.barcode}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={previewProduct.barcode}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPreviewProduct({ ...previewProduct, barcode: val });
                        if (onUpdateProduct) onUpdateProduct(previewProduct.id, { barcode: val });
                      }}
                      className={`${isPreviewExpanded ? 'w-64 text-xl py-2' : 'w-32 text-sm py-1'} bg-slate-800 border border-slate-700 rounded-lg px-2 text-white text-right font-mono focus:outline-none focus:border-indigo-500 transition-all`}
                    />
                    <button 
                      onClick={() => setIsScanning(true)}
                      className={`${isPreviewExpanded ? 'p-2' : 'p-1.5'} rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors`}
                      data-tooltip="Scan Barcode"
                    >
                      <Camera size={isPreviewExpanded ? 20 : 14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className={`text-slate-400 font-bold uppercase tracking-wider ${isPreviewExpanded ? 'text-xs' : 'text-[10px]'}`}>PIP Code</span>
                {isPreviewLocked ? (
                  <span className={`text-white font-mono ${isPreviewExpanded ? 'text-xl' : ''}`}>{previewProduct.productCode || 'N/A'}</span>
                ) : (
                  <input 
                    type="text" 
                    value={previewProduct.productCode || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPreviewProduct({ ...previewProduct, productCode: val });
                      if (onUpdateProduct) onUpdateProduct(previewProduct.id, { productCode: val });
                    }}
                    className={`${isPreviewExpanded ? 'w-48 text-xl py-2' : 'w-24 text-sm py-1'} bg-slate-800 border border-slate-700 rounded-lg px-2 text-white text-right font-mono focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                )}
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className={`text-slate-400 font-bold uppercase tracking-wider ${isPreviewExpanded ? 'text-xs' : 'text-[10px]'}`}>Pack Size</span>
                {isPreviewLocked ? (
                  <span className={`text-white font-mono ${isPreviewExpanded ? 'text-xl' : ''}`}>{previewProduct.packSize || 'N/A'}</span>
                ) : (
                  <input 
                    type="text" 
                    value={previewProduct.packSize || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPreviewProduct({ ...previewProduct, packSize: val });
                      if (onUpdateProduct) onUpdateProduct(previewProduct.id, { packSize: val });
                    }}
                    className={`${isPreviewExpanded ? 'w-40 text-xl py-2' : 'w-20 text-sm py-1'} bg-slate-800 border border-slate-700 rounded-lg px-2 text-white text-right font-mono focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                )}
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className={`text-slate-400 font-bold uppercase tracking-wider ${isPreviewExpanded ? 'text-xs' : 'text-[10px]'}`}>RRP</span>
                {isPreviewLocked ? (
                  <span className={`text-emerald-400 font-bold ${isPreviewExpanded ? 'text-2xl' : ''}`}>£{previewProduct.price.toFixed(2)}</span>
                ) : (
                  <div className="relative">
                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 ${isPreviewExpanded ? 'text-xl' : 'text-sm'}`}>£</span>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={previewPriceInput}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setPreviewPriceInput(e.target.value);
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setPreviewProduct({ ...previewProduct, price: val });
                          if (onUpdateProduct) onUpdateProduct(previewProduct.id, { price: val });
                        }
                      }}
                      onBlur={() => {
                        const val = parseFloat(previewPriceInput);
                        if (!isNaN(val)) {
                          setPreviewPriceInput(val.toFixed(2));
                        } else {
                          setPreviewPriceInput(previewProduct.price.toFixed(2));
                        }
                      }}
                      className={`${isPreviewExpanded ? 'w-48 text-xl py-2 pl-8' : 'w-24 text-sm py-1 pl-6'} bg-slate-800 border border-slate-700 rounded-lg pr-2 text-emerald-400 text-right font-bold focus:outline-none focus:border-indigo-500 transition-all`}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className={`text-slate-400 font-bold uppercase tracking-wider ${isPreviewExpanded ? 'text-xs' : 'text-[10px]'}`}>Target Stock</span>
                {isPreviewLocked ? (
                  <span className={`text-white font-mono ${isPreviewExpanded ? 'text-xl' : ''}`}>{previewProduct.stockToKeep}</span>
                ) : (
                  <input 
                    type="number" 
                    value={previewProduct.stockToKeep}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPreviewProduct({ ...previewProduct, stockToKeep: val });
                      if (onUpdateProduct) onUpdateProduct(previewProduct.id, { stockToKeep: val });
                    }}
                    className={`${isPreviewExpanded ? 'w-40 text-xl py-2' : 'w-20 text-sm py-1'} bg-slate-800 border border-slate-700 rounded-lg px-2 text-white text-right font-bold focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                )}
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className={`text-slate-400 font-bold uppercase tracking-wider ${isPreviewExpanded ? 'text-xs' : 'text-[10px]'}`}>Stock in Hand</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={previewProduct.stockInHand}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPreviewProduct({ ...previewProduct, stockInHand: val });
                      if (onUpdateProduct) onUpdateProduct(previewProduct.id, { stockInHand: val });
                    }}
                    className={`${isPreviewExpanded ? 'w-32 text-xl py-2' : 'w-16 text-sm py-1'} bg-slate-800 border border-slate-700 rounded-lg px-2 text-yellow-400 text-right font-bold focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScanning && previewProduct && (
        <LiveVisionScanner
          theme="dark"
          onDetected={(code) => {
            setPreviewProduct({ ...previewProduct, barcode: code });
            if (onUpdateProduct) onUpdateProduct(previewProduct.id, { barcode: code });
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}
    </>
  );
};

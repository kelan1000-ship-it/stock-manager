
import React, { useState, useRef } from 'react';
import { Box, Monitor, Move, RotateCcw, Scaling } from 'lucide-react';
import { ShopFloor, PlanogramLayout, Product, ShopFloorItem } from '../types';
import { SafeImage } from './SafeImage';

interface FloorPlanViewProps {
  activeFloorPlan: ShopFloor | null;
  planograms: PlanogramLayout[];
  inventory: Product[];
  viewMode: '2d' | '3d';
  floorTilt: number;
  floorRotation: number;
  draggedItem: { type: 'library' | 'shelf' | 'floor_tool', id: string | number } | null;
  onAddShelf: (id: string, x: number, y: number) => void;
  onUpdateFloorItem: (id: string, updates: Partial<ShopFloorItem>) => void;
  onPlanogramClick: (planogramId: string) => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  activeFloorPlan,
  planograms,
  inventory,
  viewMode,
  floorTilt,
  floorRotation,
  draggedItem,
  onAddShelf,
  onUpdateFloorItem,
  onPlanogramClick
}) => {
  const [selectedFloorItemId, setSelectedFloorItemId] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [isDraggingInfo, setIsDraggingInfo] = useState(false);
  const [infoBubblePos, setInfoBubblePos] = useState({ x: 72, y: 5 });
  const [interactionStart, setInteractionStart] = useState<{ x: number, y: number, itemX: number, itemY: number, itemW: number, itemD: number } | null>(null);
  const [isDraggingOverFloor, setIsDraggingOverFloor] = useState(false);
  
  const floorMapRef = useRef<HTMLDivElement>(null);
  const SHELF_HEIGHT_PX = 60;

  const handleFloorMouseDown = (e: React.MouseEvent, item: ShopFloorItem | null, interactionType: 'move' | 'resize' | 'info') => {
    e.stopPropagation();
    if (interactionType === 'info') {
      setIsDraggingInfo(true);
      setInteractionStart({
        x: e.clientX,
        y: e.clientY,
        itemX: infoBubblePos.x,
        itemY: infoBubblePos.y,
        itemW: 0,
        itemD: 0
      });
      return;
    }

    if (!item) return;
    
    // Select item on mouse down to allow immediate dragging
    setSelectedFloorItemId(item.id);
    
    if (interactionType === 'move') setMovingItemId(item.id);
    else setResizingItemId(item.id);

    setInteractionStart({
      x: e.clientX,
      y: e.clientY,
      itemX: item.x,
      itemY: item.y,
      itemW: item.width,
      itemD: item.depth
    });
  };

  const handleFloorMouseMove = (e: React.MouseEvent) => {
    if (!interactionStart || !floorMapRef.current) return;
    
    const rect = floorMapRef.current.getBoundingClientRect();
    const dx = ((e.clientX - interactionStart.x) / rect.width) * 100;
    const dy = ((e.clientY - interactionStart.y) / rect.height) * 100;

    if (movingItemId) {
      onUpdateFloorItem(movingItemId, {
        x: Math.max(0, Math.min(100, interactionStart.itemX + dx)),
        y: Math.max(0, Math.min(100, interactionStart.itemY + dy))
      });
    } else if (resizingItemId) {
      onUpdateFloorItem(resizingItemId, {
        width: Math.max(2, Math.min(50, interactionStart.itemW + dx)),
        depth: Math.max(2, Math.min(50, interactionStart.itemD + dy))
      });
    } else if (isDraggingInfo) {
      setInfoBubblePos({
        x: Math.max(0, Math.min(85, interactionStart.itemX + dx)),
        y: Math.max(0, Math.min(85, interactionStart.itemY + dy))
      });
    }
  };

  const handleFloorMouseUp = () => {
    setMovingItemId(null);
    setResizingItemId(null);
    setIsDraggingInfo(false);
    setInteractionStart(null);
  };

  const handleFloorDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverFloor(false);
    
    // Support robust data transfer types
    const sourceType = e.dataTransfer.getData('application/x-greenchem-type');
    const sourceId = e.dataTransfer.getData('application/x-greenchem-id');
    
    const type = draggedItem?.type || sourceType;
    const id = draggedItem?.id?.toString() || sourceId;

    if (type === 'floor_tool' && floorMapRef.current && id) {
      const rect = floorMapRef.current.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Clamp coordinates
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      
      onAddShelf(id, x, y);
    }
  };

  const handleFloorDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Mandatory for allowing drop
    const hasValidType = e.dataTransfer.types.includes('application/x-greenchem-type');
    
    if (draggedItem?.type === 'floor_tool' || hasValidType) {
      setIsDraggingOverFloor(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  return (
    <div 
      ref={floorMapRef}
      className={`flex-1 relative overflow-hidden rounded-[3.5rem] transition-all duration-1000 ${
        viewMode === '3d' ? 'perspective-[2000px] bg-slate-950 shadow-inner perspective-origin-center' : 'bg-slate-900/40 border-2 border-dashed border-slate-800'
      } ${isDraggingOverFloor ? 'ring-4 ring-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.3)] bg-slate-900/60' : ''}`}
      onDragOver={handleFloorDragOver}
      onDragLeave={() => setIsDraggingOverFloor(false)}
      onDrop={handleFloorDrop}
      onMouseMove={handleFloorMouseMove}
      onMouseUp={handleFloorMouseUp}
      onMouseLeave={handleFloorMouseUp}
      onClick={() => setSelectedFloorItemId(null)}
    >
       <div 
         className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${viewMode === '3d' ? 'preserve-3d' : ''}`}
         style={{
           transform: viewMode === '3d' ? `translateY(100px) rotateX(${floorTilt}deg) rotateZ(${floorRotation}deg)` : 'none'
         }}
       >
          <div 
            className={`relative bg-slate-900 border-[16px] border-slate-800 shadow-[0_0_300px_rgba(0,0,0,1)] ${viewMode === '3d' ? 'preserve-3d' : ''}`}
            style={{ 
              width: '100%', 
              height: '100%', 
              background: viewMode === '3d' ? 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)' : '#020617'
            }}
          >
             <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 0)', backgroundSize: '40px 40px' }} />

             {activeFloorPlan?.items.map(item => {
               const p = planograms.find(plan => plan.id === item.planogramId);
               const isSelected = selectedFloorItemId === item.id;
               
               return (
                 <div 
                   key={item.id}
                   onMouseDown={(e) => handleFloorMouseDown(e, item, 'move')}
                   onClick={(e) => { 
                     e.stopPropagation(); 
                     // Only select, do not navigate
                     setSelectedFloorItemId(item.id); 
                   }}
                   onDoubleClick={(e) => {
                       e.stopPropagation();
                       // Double click to navigate
                       onPlanogramClick(item.planogramId);
                   }}
                   className={`absolute cursor-move transition-all group ${viewMode === '3d' ? 'preserve-3d' : ''} ${isSelected ? 'z-50 scale-105 ring-4 ring-indigo-500/40 rounded-sm' : 'z-10'}`}
                   style={{
                     left: `${item.x}%`,
                     top: `${item.y}%`,
                     width: `${item.width}%`,
                     height: `${item.depth}%`,
                     transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                   }}
                 >
                    {viewMode === '3d' ? (
                      <div className="preserve-3d w-full h-full relative">
                          {/* Shadow on floor */}
                          <div className="absolute inset-0 bg-black/60 blur-md" style={{ transform: 'translateZ(0px)' }} />

                          {/* Upright Walls (Shelf Body) */}
                          <div className={`absolute top-0 left-0 right-0 border border-white/5 ${isSelected ? 'bg-indigo-600' : 'bg-slate-700'}`} style={{ height: `${SHELF_HEIGHT_PX}px`, transformOrigin: 'top', transform: 'rotateX(90deg)' }} />
                          <div className={`absolute bottom-0 left-0 right-0 border border-white/5 ${isSelected ? 'bg-indigo-500' : 'bg-slate-600'}`} style={{ height: `${SHELF_HEIGHT_PX}px`, transformOrigin: 'bottom', transform: 'rotateX(-90deg)' }} />
                          <div className={`absolute left-0 top-0 bottom-0 border border-white/5 ${isSelected ? 'bg-indigo-700' : 'bg-slate-700'}`} style={{ width: `${SHELF_HEIGHT_PX}px`, transformOrigin: 'left', transform: 'rotateY(-90deg)' }} />
                          <div className={`absolute right-0 top-0 bottom-0 border border-white/5 ${isSelected ? 'bg-indigo-700' : 'bg-slate-700'}`} style={{ width: `${SHELF_HEIGHT_PX}px`, transformOrigin: 'right', transform: 'rotateY(90deg)' }} />

                          {/* Lid (Top Face) */}
                          <div 
                              className={`absolute inset-0 border border-white/10 flex flex-col items-center justify-center text-center shadow-inner transition-colors overflow-hidden ${isSelected ? 'bg-indigo-500' : 'bg-slate-800'}`}
                              style={{ transform: `translateZ(${SHELF_HEIGHT_PX}px)` }}
                          >
                              {/* Products Grid Rendering */}
                              {p && (
                                  <div className="absolute inset-0 grid p-0.5 gap-px opacity-80" style={{ 
                                      gridTemplateColumns: `repeat(${p.cols}, 1fr)`, 
                                      gridTemplateRows: `repeat(${p.rows}, 1fr)` 
                                  }}>
                                      {p.slots.map(slot => {
                                          const product = slot.productId ? inventory.find(i => i.id === slot.productId) : null;
                                          return (
                                              <div key={slot.id} className="w-full h-full bg-black/20 flex items-center justify-center overflow-hidden">
                                                  {product?.productImage && (
                                                      <SafeImage src={product.productImage} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" alt="" />
                                                  )}
                                              </div>
                                          )
                                      })}
                                  </div>
                              )}

                              {/* Shelf Name Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                                   <span className={`text-[8px] font-black capitalize tracking-widest truncate max-w-full px-1 py-0.5 rounded ${isSelected ? 'text-white bg-indigo-900/50' : 'text-slate-200 bg-slate-900/50'}`}>
                                      {p?.name || 'Shelf'}
                                   </span>
                              </div>
                          </div>
                      </div>
                    ) : (
                      <div className={`w-full h-full rounded-md flex flex-col items-center justify-center p-2 text-center transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-[0_0_300px_rgba(99,102,241,0.5)] scale-110 ring-2 ring-white/50' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700/80'}`}>
                         <Box size={16} className="mb-1" />
                         <span className="text-[8px] font-black capitalize tracking-tight leading-none truncate w-full">{p?.name}</span>
                      </div>
                    )}
                    
                    {/* Resize Handle - Shows on Selection OR Hover */}
                    <div 
                      onMouseDown={(e) => handleFloorMouseDown(e, item, 'resize')}
                      className={`absolute bottom-[-8px] right-[-8px] w-5 h-5 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-xl cursor-nwse-resize z-[60] border border-indigo-200 hover:scale-110 transition-all duration-200
                        ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto'}
                      `}
                    >
                       <Scaling size={10} />
                    </div>
                 </div>
               );
             })}
          </div>
       </div>

       <div 
         className="absolute z-[100] animate-in slide-in-from-right-10 duration-700 cursor-grab active:cursor-grabbing"
         style={{ left: `${infoBubblePos.x}%`, top: `${infoBubblePos.y}%` }}
         onMouseDown={(e) => handleFloorMouseDown(e, null, 'info')}
       >
          <div className="px-6 py-4 rounded-[2rem] bg-slate-950/80 backdrop-blur-3xl border border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] select-none ring-1 ring-white/5">
             <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Monitor size={16} />
                </div>
                {viewMode === '3d' ? '3D Architecture View' : 'Schematic Mapping'}
             </h4>
             <p className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-[260px]">
                {viewMode === '3d' ? 'Full store perspective rendered in real-time. Use the rotation slider to adjust viewpoint.' : 'Physical bay coordinate mapping. Drag elements to reposition or resize.'}
             </p>
             <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center gap-4 text-[8px] font-black text-indigo-400 uppercase tracking-widest opacity-80">
                <div className="flex items-center gap-1.5"><Move size={10}/> Move</div>
                <div className="flex items-center gap-1.5"><Scaling size={10}/> Resize</div>
                <div className="flex items-center gap-1.5"><RotateCcw size={10}/> Rotate</div>
             </div>
          </div>
       </div>
    </div>
  );
};

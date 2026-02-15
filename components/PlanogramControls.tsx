
import React, { useRef } from 'react';
import { Layers, Map as MapIcon, Square, Box, Monitor, Navigation, ImagePlus, FileImage, Eye, Aperture, Loader2, Sparkles } from 'lucide-react';
import { PlanogramLayout, ShopFloor } from '../types';

interface PlanogramControlsProps {
  activeTab: 'shelf' | 'floor';
  setActiveTab: (tab: 'shelf' | 'floor') => void;
  viewMode: '2d' | '3d';
  setViewMode: (mode: '2d' | '3d') => void;
  floorRotation: number;
  setFloorRotation: (deg: number) => void;
  floorTilt: number;
  setFloorTilt: (deg: number) => void;
  activePlanogram: PlanogramLayout | null;
  activeFloorPlan: ShopFloor | null;
  isVisualizing: boolean;
  onVisualize: () => void;
  onShopVisualise: () => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewReal: (url: string) => void;
  onPreviewAi: (url: string) => void;
}

export const PlanogramControls: React.FC<PlanogramControlsProps> = ({
  activeTab, setActiveTab, viewMode, setViewMode,
  floorRotation, setFloorRotation, floorTilt, setFloorTilt,
  activePlanogram, activeFloorPlan, isVisualizing,
  onVisualize, onShopVisualise, onUploadImage, onPreviewReal, onPreviewAi
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0">
      <div className="flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit shadow-xl">
        <button 
          onClick={() => { setActiveTab('shelf'); setViewMode('3d'); }}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'shelf' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Layers size={16} /> Shelf Planogram
        </button>
        <button 
          onClick={() => { setActiveTab('floor'); setViewMode('3d'); }}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'floor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <MapIcon size={16} /> Shop Floor Map
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto max-w-full pb-2 xl:pb-0 scrollbar-hide">
         {activeTab === 'shelf' ? (
            <>
               <div className="flex p-1.5 rounded-xl bg-slate-800/50 border border-slate-700 shrink-0">
                  <button onClick={() => setViewMode('2d')} className={`p-2.5 rounded-lg transition-all ${viewMode === '2d' ? 'bg-slate-300 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="2D Map"><Square size={18} /></button>
                  <button onClick={() => setViewMode('3d')} className={`p-2.5 rounded-lg transition-all ${viewMode === '3d' ? 'bg-slate-300 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="3D Visualizer"><Box size={18} /></button>
               </div>

               <div className="flex items-center gap-2 shrink-0">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onUploadImage} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-6 py-3.5 rounded-xl border font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all ${activePlanogram?.realShelfImage ? 'bg-amber-600/10 text-amber-500 border-amber-500/30 hover:bg-amber-600/20' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                    title="Upload a photo of your physical shelf."
                  >
                     {activePlanogram?.realShelfImage ? <FileImage size={16} /> : <ImagePlus size={16} />}
                     {activePlanogram?.realShelfImage ? 'Change Shelf Photo' : 'Actual Shelf Image'}
                  </button>
                  {activePlanogram?.realShelfImage && (
                     <button 
                       onClick={() => onPreviewReal(activePlanogram.realShelfImage!)} 
                       className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/50 text-amber-500 hover:bg-amber-600 hover:text-white hover:border-amber-500 transition-all shadow-lg shadow-amber-900/20"
                       title="Preview Reference Photo"
                     >
                        <Eye size={16} />
                     </button>
                  )}
                  {activePlanogram?.aiVisualisation && (
                     <button 
                       onClick={() => onPreviewAi(activePlanogram.aiVisualisation!)} 
                       className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/50 text-amber-500 hover:bg-amber-600 hover:text-white hover:border-amber-500 transition-all shadow-lg shadow-amber-900/20"
                       title="View Saved AI Visualisation"
                     >
                        <Aperture size={16} />
                     </button>
                  )}
               </div>

               <button 
                 onClick={onVisualize} 
                 disabled={isVisualizing} 
                 className={`shrink-0 px-6 py-3.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl group border relative overflow-hidden ${
                   isVisualizing 
                     ? 'ai-pulse-light cursor-not-allowed' 
                     : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/30 animate-ai-glow shadow-indigo-900/40'
                 }`}
               >
                 <div className="relative z-10 flex items-center gap-3">
                   {isVisualizing ? <Loader2 size={16} className="animate-spin text-white" /> : <Sparkles size={16} />}
                   {isVisualizing ? 'RENDERING...' : 'AI MERCHANDISER'}
                 </div>
               </button>
            </>
         ) : (
            <>
               <div className="flex p-1.5 rounded-xl bg-slate-800/50 border border-slate-700 shrink-0">
                  <button onClick={() => setViewMode('2d')} className={`p-3 rounded-lg transition-all ${viewMode === '2d' ? 'bg-slate-300 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="2D Map"><Square size={20} /></button>
                  <button onClick={() => setViewMode('3d')} className={`p-3 rounded-lg transition-all ${viewMode === '3d' ? 'bg-slate-300 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`} title="3D View"><Monitor size={20} /></button>
               </div>
               {viewMode === '3d' && (
                  <div className="flex items-center gap-4 px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700 shrink-0 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-800/70">
                     <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-indigo-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Rotate</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="360" 
                          value={floorRotation} 
                          onChange={(e) => setFloorRotation(parseInt(e.target.value))} 
                          className="w-20 accent-indigo-500 h-1.5 cursor-pointer bg-slate-700 rounded-full appearance-none" 
                        />
                     </div>
                     
                     <div className="w-px h-4 bg-slate-700/50" />
                     
                     <div className="flex items-center gap-2">
                        <Monitor size={14} className="text-emerald-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Tilt</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="85" 
                          value={floorTilt} 
                          onChange={(e) => setFloorTilt(parseInt(e.target.value))} 
                          className="w-20 accent-emerald-500 h-1.5 cursor-pointer bg-slate-700 rounded-full appearance-none" 
                        />
                     </div>
                  </div>
               )}
               <button 
                 onClick={onShopVisualise} 
                 disabled={isVisualizing || !activeFloorPlan?.items.length} 
                 className={`shrink-0 px-6 py-3.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl disabled:opacity-50 group relative overflow-hidden ${
                   isVisualizing 
                     ? 'ai-pulse-light cursor-not-allowed'
                     : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                 }`}
               >
                 <div className="relative z-10 flex items-center gap-3">
                    {isVisualizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isVisualizing ? 'RENDERING...' : 'Shop Visualiser'}
                 </div>
               </button>
            </>
         )}
      </div>
    </div>
  );
};

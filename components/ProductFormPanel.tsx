
import React, { useRef, useEffect } from 'react';
import { 
  X, Plus, ScanLine, Loader2, Sparkles, ShoppingBag, Pill, Check, Upload, Camera, Database, Copy
} from 'lucide-react';
import { ProductImageSection } from './ProductImageSection';
import { ProductBasicInfo } from './ProductBasicInfo';
import { ProductPricing } from './ProductPricing';
import { ProductStock } from './ProductStock';
import { ProductMetadata } from './ProductMetadata';
import { ProductPhotoCapture } from './ProductImageUploader';
import { ProductThumbnail } from './ImageComponents';
import { SafeImage } from './SafeImage';
import { useProductForm } from '../hooks/useProductForm';
import { ProductFormData, MasterProduct, Product } from '../types';
import { TagStyle } from '../hooks/useInventoryTags';

interface ProductFormPanelProps {
  isOpen: boolean;
  onClose: () => void;
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onSave: () => void;
  onScan: () => void;
  onFullScan: (base64: string, mimeType: string) => Promise<void>;
  onFindMasterRecord: (criteria: { barcode?: string, productCode?: string, name?: string }) => MasterProduct | undefined;
  onSuggestMaster: (query: string) => MasterProduct[];
  onUpdateMasterProduct: (id: string, updates: Partial<MasterProduct>) => void;
  onAutoFill: (name: string) => void;
  tagSettings: Record<string, TagStyle>;
  onUpdateTagSettings: (tag: string, settings: Partial<TagStyle>) => void;
  theme: 'dark';
  isEditing: boolean;
  editingId: string | null;
  inventory: Product[];
  copyToBoth: boolean;
  setCopyToBoth: (v: boolean) => void;
  isAILoading: boolean;
  uniqueNames: string[];
  uniqueSuppliers: string[];
  uniqueLocations: string[];
  uniquePackSizes: string[];
  uniqueParentGroups: string[];
  allUniqueTags: string[];
}

export const ProductFormPanel = ({ 
  isOpen, onClose, formData, setFormData, onSave, onScan, onFullScan, 
  onFindMasterRecord, onSuggestMaster, onUpdateMasterProduct, onAutoFill, tagSettings, onUpdateTagSettings, 
  theme, isEditing, editingId, inventory, copyToBoth, setCopyToBoth, isAILoading, 
  uniqueNames, uniqueSuppliers, uniqueLocations, uniquePackSizes, uniqueParentGroups, allUniqueTags 
}: ProductFormPanelProps) => {
  const [isAICameraOpen, setIsAICameraOpen] = React.useState(false);
  const masterSearchRef = useRef<HTMLDivElement>(null);

  const {
    newTagInput, setNewTagInput, activeSettingsTag, setActiveSettingsTag,
    masterQuery, setMasterQuery, isMasterSearchActive, setIsMasterSearchActive, isSelectingFromMaster,
    profit, margin, masterMatch, isAssetSynced,
    handleAddTag, handleRemoveTag, handleSelectMasterProduct, handlePushAssetToMaster, handlePullAssetFromMaster, handleSmartScan
  } = useProductForm({ 
    formData, 
    setFormData, 
    onUpdateMasterProduct, 
    onFindMasterRecord,
    inventory,
    editingId
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (masterSearchRef.current && !masterSearchRef.current.contains(e.target as Node)) {
        setIsMasterSearchActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsMasterSearchActive]);

  useEffect(() => {
    if (isSelectingFromMaster.current) return;
    if (formData.barcode !== undefined && formData.barcode !== masterQuery) {
      setMasterQuery(formData.barcode);
      if (formData.barcode.length > 3) setIsMasterSearchActive(true);
    }
  }, [formData.barcode, setMasterQuery, setIsMasterSearchActive]);

  if (!isOpen) return null;

  const suggestions = masterQuery.length > 2 ? onSuggestMaster(masterQuery) : [];
  const isRetail = formData.stockType === 'retail';
  const headerBgClass = isRetail ? 'bg-emerald-700/20' : 'bg-indigo-700/20';
  const tagClass = isRetail ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-indigo-500 bg-indigo-500/20 text-indigo-400';
  const HeaderIcon = isRetail ? ShoppingBag : Pill;
  const themeColor = isRetail ? 'emerald' : 'indigo';

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in slide-in-from-right duration-300">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className={`relative w-full max-w-5xl h-full flex flex-col shadow-2xl ${theme === 'dark' ? 'bg-[#0a0f18]' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`p-6 ${headerBgClass} relative overflow-hidden transition-colors duration-500 flex-shrink-0`}>
            <div className="flex items-center justify-between relative z-10">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border font-black text-[10px] uppercase tracking-widest ${tagClass}`}>
                  <Plus size={12} strokeWidth={4} />
                  <span>{isEditing ? 'Update Stock Entry' : 'Create Inventory Item'}</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"><X size={20}/></button>
            </div>
            <HeaderIcon className="absolute -right-5 -bottom-8 text-white/5 transition-transform duration-500" size={150} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-6 space-y-8">
                
                {/* Top Controls: Department & Scan */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-1 rounded-2xl bg-[#111827] border border-slate-800 flex shadow-inner h-full">
                        <button type="button" onClick={() => setFormData({...formData, stockType: 'retail'})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRetail ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><ShoppingBag size={14} /> Retail</button>
                        <button type="button" onClick={() => setFormData({...formData, stockType: 'dispensary'})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRetail ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Pill size={14} /> Dispensary</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={onScan} className="group relative flex items-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all active:scale-95">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform"><ScanLine size={20} /></div>
                            <div className="text-left"><span className="block text-[10px] font-black text-white uppercase tracking-wider">Barcode</span><span className="text-[8px] font-bold text-slate-500">Camera</span></div>
                        </button>
                        <div className={`group relative min-h-[66px] rounded-2xl transition-all shadow-sm overflow-hidden cursor-pointer ${isAILoading ? 'ai-pulse-light' : 'bg-white/5 backdrop-blur-xl border border-white/10 animate-ai-glow hover:bg-white/15 hover:border-white/20'}`}>
                            <div className={`absolute inset-0 flex items-center gap-2 p-3 transition-all duration-300 ease-out ${isAILoading ? '' : 'group-hover:opacity-0 group-hover:-translate-y-4 pointer-events-none'}`}>
                                <div className={`w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-110 transition-transform ${isAILoading ? 'border-indigo-500/50' : ''}`}>{isAILoading ? <Loader2 size={20} className="animate-spin text-white" /> : <Sparkles size={20} />}</div>
                                <div className="text-left"><span className="block text-[10px] font-black text-white uppercase tracking-wider">{isAILoading ? 'Processing' : 'AI Scan'}</span><span className="text-[8px] font-bold text-slate-500">Detect</span></div>
                            </div>
                            {!isAILoading && (
                                <div className="absolute inset-0 flex items-center p-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                                    <label className="flex-1 h-full flex flex-col items-center justify-center gap-0.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors">
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSmartScan(e, onFullScan)} />
                                        <Upload size={14} className="text-emerald-400 mb-0.5" /><span className="text-[8px] font-black text-white uppercase tracking-widest">Upload</span>
                                    </label>
                                    <div className="w-px h-6 bg-white/20" />
                                    <button onClick={(e) => { e.stopPropagation(); setIsAICameraOpen(true); }} className="flex-1 h-full flex flex-col items-center justify-center gap-0.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"><Camera size={14} className="text-indigo-400" /><span className="text-[8px] font-black text-white uppercase tracking-widest">Camera</span></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Master Search */}
                <div className="space-y-3 relative" ref={masterSearchRef}>
                  <div className="flex items-center gap-2 mb-1 px-1"><Database size={12} className="text-indigo-400" /><span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Smart Master Catalogue Match</span></div>
                  <div className="relative group">
                    <input type="text" value={masterQuery} onFocus={() => setIsMasterSearchActive(true)} onChange={(e) => { setMasterQuery(e.target.value); setIsMasterSearchActive(true); }} placeholder="Search global catalogue to auto-fill..." className="w-full pl-14 pr-12 py-5 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 text-sm font-black text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-4 ring-indigo-500/5 transition-all shadow-inner" />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">{isMasterSearchActive && masterQuery.length > 0 && <button onClick={() => setMasterQuery('')} className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-colors"><X size={14} /></button>}<Sparkles size={18} className="text-indigo-400 animate-pulse" /></div>
                  </div>
                  {isMasterSearchActive && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 z-[120] bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between"><span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2"><Database size={14} /> Verified Database Matches ({suggestions.length})</span></div>
                      <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                        {suggestions.map((p: MasterProduct) => (
                          <button key={p.id} onClick={() => handleSelectMasterProduct(p)} className="w-full p-5 flex items-center gap-5 hover:bg-indigo-600/10 transition-all text-left border-b border-slate-800/50 last:border-0 group">
                            <div className="w-14 h-14 rounded-2xl bg-white overflow-hidden shrink-0 border border-slate-800 shadow-sm p-1">
                                <ProductThumbnail src={p.image} alt={p.name} stockType="retail" />
                            </div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors uppercase truncate">{p.name}</p><div className="flex items-center gap-3 mt-1"><span className="text-[9px] italic text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{p.packSize || 'N/A'}</span><span className="text-[9px] font-mono font-bold text-slate-500">{p.barcode || p.productCode}</span></div></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Sections */}
                <ProductImageSection formData={formData} setFormData={setFormData} isEditing={isEditing} masterMatch={masterMatch} isAssetSynced={isAssetSynced} onPullAsset={handlePullAssetFromMaster} onPushAsset={handlePushAssetToMaster} />
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <ProductBasicInfo formData={formData} setFormData={setFormData} onScan={onScan} uniqueNames={uniqueNames} uniquePackSizes={uniquePackSizes} uniqueParentGroups={uniqueParentGroups} onAutoFill={onAutoFill} isAILoading={isAILoading} />
                        <ProductStock formData={formData} setFormData={setFormData} />
                    </div>
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <ProductPricing formData={formData} setFormData={setFormData} margin={margin} profit={profit} />
                    </div>
                </div>

                <ProductMetadata 
                  formData={formData} setFormData={setFormData} uniqueSuppliers={uniqueSuppliers} uniqueLocations={uniqueLocations} allUniqueTags={allUniqueTags}
                  tagSettings={tagSettings} onUpdateTagSettings={onUpdateTagSettings} newTagInput={newTagInput} setNewTagInput={setNewTagInput}
                  activeSettingsTag={activeSettingsTag} setActiveSettingsTag={setActiveSettingsTag} handleAddTag={handleAddTag} handleRemoveTag={handleRemoveTag}
                />
            </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-[#0a0f18]/90 backdrop-blur-xl z-20 flex flex-col gap-4">
           {!isEditing && (
                <button type="button" onClick={() => setCopyToBoth(!copyToBoth)} className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full group text-left ${copyToBoth ? `bg-${themeColor}-500/10 border-${themeColor}-500/50 text-${themeColor}-400 shadow-[0_0_15px_rgba(var(--tw-color-${themeColor}-500),0.1)]` : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                    <div className="flex items-center gap-3 min-w-0"><Copy size={16} className={`shrink-0 transition-colors ${copyToBoth ? `text-${themeColor}-400` : 'text-slate-600'}`} /><div className="min-w-0"><span className="block text-[9px] font-black uppercase tracking-widest leading-none truncate">Add Product to All Branches</span><span className="block text-[8px] font-bold opacity-60 mt-1 leading-tight truncate">Clone corporate listing to partner site</span></div></div>
                    <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${copyToBoth ? `border-${themeColor}-500 bg-${themeColor}-500` : 'border-slate-700 bg-slate-950'}`}>{copyToBoth && <Check size={10} className="text-slate-950" strokeWidth={4} />}</div>
                </button>
           )}
           <button onClick={onSave} className={`w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-2xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isEditing ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40' : (isRetail ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40')}`}>
              <Check size={18} strokeWidth={4} />
              {isEditing ? 'Save Changes' : 'Create Product'}
           </button>
        </div>
      </div>
      
      {isAICameraOpen && (
        <ProductPhotoCapture 
          onCaptured={(base64) => {
            const data = base64.split(',')[1] || base64;
            onFullScan(data, 'image/jpeg');
            setIsAICameraOpen(false);
          }}
          onClose={() => setIsAICameraOpen(false)}
        />
      )}
    </div>
  );
};


import React, { useRef, useEffect } from 'react';
import { 
  Tag as TagIcon, Settings, Notebook, Handshake, Link2, AlertCircle, Ban, 
  Plus, Palette, X, Zap, Check, Search, Archive, Percent
} from 'lucide-react';
import { ProductFormData } from '../types';
import { TagStyle } from '../hooks/useInventoryTags';
import { toTitleCase } from '../utils/stringUtils';

const TagSettingsPopover = ({ tag, settings, onUpdate, onClose }: { tag: string; settings: TagStyle; onUpdate: (tag: string, settings: Partial<TagStyle>) => void; onClose: () => void }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const colors = [
    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#64748b', '#1e293b', '#f43f5e'
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={popoverRef}
      className="absolute top-full left-0 mt-2 z-[110] w-64 p-4 rounded-3xl bg-slate-900 border border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
          <Palette size={14} className="text-indigo-400" /> Style #{tag}
        </span>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[8px] font-black uppercase text-slate-500 mb-2 tracking-widest">Select Background Color</p>
          <div className="grid grid-cols-5 gap-2">
            {colors.map(c => (
              <button 
                key={c}
                onClick={() => onUpdate(tag, { color: c })}
                className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${settings?.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <button 
          onClick={() => onUpdate(tag, { isFlashing: !settings?.isFlashing })}
          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${settings?.isFlashing ? 'bg-amber-600/10 border-amber-500/50 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className={settings?.isFlashing ? 'text-amber-400' : 'text-slate-600'} />
            <span className="text-[9px] font-black uppercase tracking-widest">Flashing Alert</span>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${settings?.isFlashing ? 'bg-amber-500' : 'bg-slate-800'}`}>
            <div className={`absolute top-1 bottom-1 w-2 h-2 bg-white rounded-full transition-all ${settings?.isFlashing ? 'left-5' : 'left-1'}`} />
          </div>
        </button>
      </div>
    </div>
  );
};

const ToggleButton = ({ label, description, icon: Icon, active, onClick, colorClass = "emerald" }: { label: string; description: string; icon: React.ElementType; active: boolean; onClick: () => void; colorClass?: string }) => {
  const activeBg = `bg-${colorClass}-500/10 border-${colorClass}-500/50 text-${colorClass}-400 shadow-[0_0_15px_rgba(var(--tw-color-${colorClass}-500),0.1)]`;
  const inactiveBg = `bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700`;
  
  return (
    <button 
        onClick={onClick}
        type="button"
        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full group text-left ${active ? activeBg : inactiveBg}`}
    >
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={16} className={`shrink-0 transition-colors ${active ? `text-${colorClass}-400` : 'text-slate-600'}`} />
            <div className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-widest leading-none truncate">{label}</span>
                {description && <span className="block text-[8px] font-bold opacity-60 mt-1 leading-tight truncate">{description}</span>}
            </div>
        </div>
        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${active ? `border-${colorClass}-500 bg-${colorClass}-500 shadow-[0_0_10px_rgba(var(--tw-color-${colorClass}-500),0.4)]` : 'border-slate-700 bg-slate-950'}`}>
            {active && <Check size={10} className="text-slate-950" strokeWidth={4} />}
        </div>
    </button>
  );
};

interface ProductMetadataProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  uniqueSuppliers: string[];
  uniqueLocations: string[];
  allUniqueTags: string[];
  tagSettings: Record<string, TagStyle>;
  onUpdateTagSettings: (tag: string, settings: Partial<TagStyle>) => void;
  newTagInput: string;
  setNewTagInput: (val: string) => void;
  activeSettingsTag: string | null;
  setActiveSettingsTag: (val: string | null) => void;
  handleAddTag: (e?: React.FormEvent) => void;
  handleRemoveTag: (tag: string) => void;
}

export const ProductMetadata: React.FC<ProductMetadataProps> = ({
  formData, setFormData, uniqueSuppliers, uniqueLocations, allUniqueTags,
  tagSettings, onUpdateTagSettings, newTagInput, setNewTagInput,
  activeSettingsTag, setActiveSettingsTag, handleAddTag, handleRemoveTag
}) => {
  return (
    <div className="space-y-8">
      {/* 1. Supplier & Location Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Supplier</label>
          <input 
            type="text" 
            list="supplier-list" 
            value={formData.supplier} 
            onChange={e => setFormData({...formData, supplier: e.target.value})} 
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-bold text-white focus:border-emerald-500 transition-all outline-none uppercase" 
            placeholder="Supplier" 
          />
          <datalist id="supplier-list">{uniqueSuppliers?.map((s: string) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className="block text-[8px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest">Location</label>
          <input 
            type="text" 
            list="location-list" 
            value={formData.location} 
            onChange={e => setFormData({...formData, location: toTitleCase(e.target.value)})} 
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-white focus:border-emerald-500 transition-all outline-none text-center" 
            placeholder="Shelf" 
          />
          <datalist id="location-list">{uniqueLocations?.map((l: string) => <option key={l} value={l} />)}</datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <TagIcon size={14} className="text-indigo-500" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Categorical Tagging</h3>
          </div>
          
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="space-y-2">
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input 
                    type="text" 
                    list="existing-tags-list"
                    value={newTagInput} 
                    onChange={e => setNewTagInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all shadow-inner" 
                    placeholder="Add label..." 
                  />
                  <datalist id="existing-tags-list">
                    {allUniqueTags.map((t: string) => <option key={t} value={t} />)}
                  </datalist>
                  <button type="submit" className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg active:scale-90"><Plus size={18} /></button>
                </form>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-2xl bg-slate-950/30 border border-slate-800/50">
                {formData.tags.length === 0 ? (
                  <p className="text-[9px] font-bold text-slate-800 uppercase tracking-widest italic flex items-center gap-2 px-2 py-1.5">No labels assigned</p>
                ) : formData.tags.map((tag: string) => {
                  const settings = tagSettings[tag];
                  return (
                    <div key={tag} className="relative flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-xl text-white font-black uppercase group/tag transition-all shadow-md" style={{ backgroundColor: settings?.color || '#1e293b' }}>
                      <span className={`text-[9px] tracking-widest ${settings?.isFlashing ? 'animate-tag-flash' : ''}`}>#{tag}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity">
                          <button onClick={() => setActiveSettingsTag(activeSettingsTag === tag ? null : tag)} className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-all"><Settings size={10} /></button>
                          <button onClick={() => handleRemoveTag(tag)} className="p-1 rounded-lg bg-black/20 hover:bg-rose-500 text-white transition-all"><X size={10} /></button>
                      </div>
                      {activeSettingsTag === tag && <TagSettingsPopover tag={tag} settings={settings} onUpdate={onUpdateTagSettings} onClose={() => setActiveSettingsTag(null)} />}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Search size={14} className="text-indigo-500" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Search Keywords</h3>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 h-[calc(100%-2.5rem)]">
            <textarea 
                value={formData.keywords || ''} 
                onChange={e => setFormData({...formData, keywords: e.target.value})} 
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder-slate-700 h-full min-h-[120px] resize-none shadow-inner" 
                placeholder="Enter backend search keywords (e.g. brand, alternate names, ingredients)..." 
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <Settings size={14} className="text-slate-500" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Inventory Intelligence</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <ToggleButton 
                label="Shared Stock" 
                description="Visible to partner branch"
                icon={Handshake} 
                active={formData.isShared} 
                onClick={() => {
                    const nextShared = !formData.isShared;
                    setFormData({
                        ...formData, 
                        isShared: nextShared,
                        // Automatically enable price sync when sharing is turned on
                        isPriceSynced: nextShared ? true : formData.isPriceSynced
                    });
                }} 
                colorClass="blue" 
            />
            <ToggleButton 
                label="Sync Price" 
                description="Auto-match RRP changes"
                icon={Link2} 
                active={formData.isPriceSynced} 
                onClick={() => setFormData({...formData, isPriceSynced: !formData.isPriceSynced})} 
                colorClass="indigo" 
            />
            <ToggleButton 
                label="Threshold Alert" 
                description={formData.enableThresholdAlert 
                    ? `Alert when < ${formData.thresholdValue !== undefined ? formData.thresholdValue : 25}${formData.thresholdType === 'quantity' ? ' units' : '%'}`
                    : "Notify on low stock"}
                icon={AlertCircle} 
                active={formData.enableThresholdAlert} 
                onClick={() => setFormData({...formData, enableThresholdAlert: !formData.enableThresholdAlert})} 
                colorClass="amber" 
            />
            <ToggleButton 
                label="Block Orders" 
                description="Stock to be cleared"
                icon={Ban} 
                active={formData.isDiscontinued} 
                onClick={() => setFormData({...formData, isDiscontinued: !formData.isDiscontinued})} 
                colorClass="rose" 
            />
            <ToggleButton 
                label="No VAT" 
                description="Disable 20% VAT charge"
                icon={Percent} 
                active={formData.noVat} 
                onClick={() => setFormData({...formData, noVat: !formData.noVat})} 
                colorClass="violet" 
            />
            <ToggleButton 
                label="Excess Stock" 
                description="Blocks & flags as excess"
                icon={Archive} 
                active={formData.isExcessStock} 
                onClick={() => setFormData({...formData, isExcessStock: !formData.isExcessStock})} 
                colorClass="orange" 
            />
          </div>
          
          {formData.enableThresholdAlert && (
            <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 mt-2">
              <div className="flex-1">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 block">Threshold Type</label>
                <select
                  value={formData.thresholdType || 'percentage'}
                  onChange={e => setFormData({...formData, thresholdType: e.target.value as 'percentage' | 'quantity'})}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="percentage">Percentage of Stock to Keep</option>
                  <option value="quantity">Remaining Quantity (Units)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 block">Threshold Value</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.thresholdValue !== undefined ? formData.thresholdValue : 25}
                    onChange={e => setFormData({...formData, thresholdValue: parseInt(e.target.value) || 0})}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-amber-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500">
                    {formData.thresholdType === 'quantity' ? 'Units' : '%'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <Notebook size={14} className="text-slate-500" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Internal Notes</h3>
        </div>
        <textarea 
            value={formData.notes || ''} 
            onChange={e => setFormData({...formData, notes: e.target.value})} 
            className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder-slate-700 min-h-[80px] resize-y shadow-inner" 
            placeholder="Add internal stock notes..." 
        />
      </div>
    </div>
  );
};

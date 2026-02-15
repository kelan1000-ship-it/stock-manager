
import React from 'react';
import { ImageIcon, Database, DownloadCloud, UploadCloud, CheckCircle } from 'lucide-react';
import ProductImageUploader from './ProductImageUploader';
import { SafeImage } from './SafeImage';
import { MasterProduct, ProductFormData } from '../types';

interface ProductImageSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  isEditing: boolean;
  masterMatch?: MasterProduct | null;
  isAssetSynced: boolean;
  onPullAsset: () => void;
  onPushAsset: () => void;
}

export const ProductImageSection: React.FC<ProductImageSectionProps> = ({
  formData,
  setFormData,
  isEditing,
  masterMatch,
  isAssetSynced,
  onPullAsset,
  onPushAsset
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-white/5">
        <ImageIcon size={14} className="text-indigo-500" />
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Asset Configuration</h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8 flex">
          <ProductImageUploader 
            productId={isEditing ? 'edit_mode' : 'new_mode'} 
            productName={formData.name} 
            currentImageUrl={formData.productImage}
            onUploadComplete={(url) => setFormData((prev) => ({ ...prev, productImage: url }))}
          />
        </div>

        <div className="lg:col-span-4 flex">
          <div className="w-full p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col shadow-xl relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Database size={10} className="text-indigo-400" />
              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Master Inventory Link</h4>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-1">
              <div className="relative w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center bg-white/5">
                {masterMatch?.image ? (
                  <SafeImage src={masterMatch.image} alt="Master Visual" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={20} className="text-slate-800" />
                )}
                {isAssetSynced && masterMatch && (
                  <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center animate-in fade-in">
                    <CheckCircle size={20} className="text-emerald-500 drop-shadow-md" strokeWidth={3} />
                  </div>
                )}
              </div>

              <div className="text-center space-y-0.5">
                <p className="text-[9px] font-black text-white uppercase tracking-tight">
                  {masterMatch ? 'Link Detected' : 'Unlinked Item'}
                </p>
                <p className={`text-[7px] font-bold uppercase tracking-widest ${isAssetSynced ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {isAssetSynced ? 'Visuals Verified' : masterMatch ? 'Sync Pending' : 'No Catalog Match'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-auto shrink-0">
              <button 
                onClick={onPullAsset}
                disabled={!masterMatch?.image || isAssetSynced}
                className={`w-full py-2 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${!masterMatch?.image || isAssetSynced ? 'bg-slate-950 text-slate-700 border border-slate-900 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/20'}`}
              >
                <DownloadCloud size={12} /> Pull Master Inventory Image
              </button>
              <button 
                onClick={onPushAsset}
                disabled={!masterMatch || isAssetSynced || !formData.productImage}
                className={`w-full py-2 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${!masterMatch || isAssetSynced || !formData.productImage ? 'bg-slate-950 text-slate-800 border border-slate-900 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-900/20'}`}
              >
                <UploadCloud size={12} /> Upload to Master Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

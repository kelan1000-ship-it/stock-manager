
import React, { useState, useEffect } from 'react';
import { Camera, Globe, Eye, Check, X } from 'lucide-react';
import { MasterProduct } from '../types';
import { LiveVisionScanner } from './BarcodeScanner';
import { researchBarcodeFromWeb } from '../services/geminiService';

interface MasterProductFormProps {
  initialData?: Partial<MasterProduct>;
  onSave: (data: any) => void;
  onCancel: () => void;
  theme: string;
}

export const MasterProductForm: React.FC<MasterProductFormProps> = ({ initialData, onSave, onCancel, theme }) => {
  const [formData, setFormData] = useState({
    name: '', subheader: '', barcode: '', productCode: '', packSize: '',
    price: '', costPrice: '', image: '', supplier: ''
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isResearching, setIsResearching] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        subheader: initialData.subheader || '',
        barcode: initialData.barcode || '',
        productCode: initialData.productCode || '',
        packSize: initialData.packSize || '',
        price: initialData.price?.toString() || '0.00',
        costPrice: initialData.costPrice?.toString() || '0.00',
        image: initialData.image || '',
        supplier: initialData.supplier || ''
      });
    }
  }, [initialData]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Product Name is mandatory.");
      return;
    }
    onSave({
      ...formData,
      price: parseFloat(formData.price) || 0,
      costPrice: parseFloat(formData.costPrice) || 0
    });
  };

  const researchBarcode = async () => {
    if (!formData.name) {
      alert("Please enter a product name first to research.");
      return;
    }
    setIsResearching(true);
    try {
      const result = await researchBarcodeFromWeb(formData.name, formData.packSize, formData.productCode || undefined);
      if (result.barcode) {
        setFormData(prev => ({ ...prev, barcode: result.barcode || prev.barcode }));
        alert(`AI found a potential match: ${result.barcode}\n\nSources: ${result.sources.join(', ')}`);
      } else {
        alert("AI could not verify a retail barcode for this item name.");
      }
    } catch (e) {
      alert("Research failed. Verify connection or name format.");
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="p-6 bg-slate-800/80 border-b border-emerald-500/30 grid grid-cols-1 md:grid-cols-12 gap-3 animate-in slide-in-from-top-4 relative z-20 shadow-2xl">
        <div className="space-y-1 md:col-span-2">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Product Name <span className="text-rose-500">*</span></p>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-bold outline-none focus:border-emerald-500" placeholder="Name..." />
        </div>
        <div className="space-y-1 md:col-span-1">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Subheader</p>
            <input type="text" value={formData.subheader} onChange={(e) => setFormData({...formData, subheader: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs italic outline-none focus:border-emerald-500" placeholder="Subheader..." />
        </div>
        <div className="space-y-1 md:col-span-1">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Pack Size</p>
            <input type="text" value={formData.packSize} onChange={(e) => setFormData({...formData, packSize: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold outline-none focus:border-emerald-500" placeholder="e.g. 32pk" />
        </div>
        <div className="space-y-1 md:col-span-1">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">PIP Code</p>
            <input type="text" value={formData.productCode} onChange={(e) => setFormData({...formData, productCode: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono outline-none focus:border-emerald-500" placeholder="PIP..." />
        </div>
        <div className="space-y-1 md:col-span-2">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Barcode (EAN)</p>
            <div className="relative">
                <input type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono outline-none focus:border-emerald-500 pr-16" placeholder="000..." />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                <button onClick={() => setIsScanning(true)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><Camera size={14}/></button>
                <button onClick={researchBarcode} disabled={isResearching} className={`p-1.5 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors ${isResearching ? 'animate-pulse' : ''}`}><Globe size={14}/></button>
                </div>
            </div>
        </div>
        <div className="space-y-1 md:col-span-1">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Supplier</p>
            <input type="text" value={formData.supplier} onChange={(e) => setFormData({...formData, supplier: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold outline-none focus:border-emerald-500" placeholder="Supplier..." />
        </div>
        <div className="space-y-1 md:col-span-1">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Image URL</p>
            <div className="flex gap-1.5">
                <input type="text" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-[10px] font-bold outline-none focus:border-emerald-500 truncate" placeholder="https://..." />
                {formData.image && (
                    <button onClick={() => window.open(formData.image, '_blank')} className="p-2 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-all shrink-0"><Eye size={14}/></button>
                )}
            </div>
        </div>
        <div className="space-y-1 md:col-span-1">
            <p className="text-[8px] font-black uppercase text-slate-500 ml-1">RRP (£)</p>
            <input 
                type="number" 
                step="0.01" 
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
                onBlur={() => { const val = parseFloat(formData.price); if (!isNaN(val)) setFormData(prev => ({...prev, price: val.toFixed(2)})); }}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-black text-emerald-500 outline-none focus:border-emerald-500" 
                placeholder="0.00" 
            />
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
            <div className="flex-1 space-y-1">
                <p className="text-[8px] font-black uppercase text-slate-500 ml-1">Cost (£)</p>
                <input 
                    type="number" 
                    step="0.01" 
                    value={formData.costPrice} 
                    onChange={(e) => setFormData({...formData, costPrice: e.target.value})} 
                    onBlur={() => { const val = parseFloat(formData.costPrice); if (!isNaN(val)) setFormData(prev => ({...prev, costPrice: val.toFixed(2)})); }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold outline-none focus:border-emerald-500" 
                    placeholder="0.00" 
                />
            </div>
            <button onClick={handleSubmit} className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg"><Check size={20}/></button>
            <button onClick={onCancel} className="p-2.5 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors"><X size={20}/></button>
        </div>

        {isScanning && (
            <LiveVisionScanner theme={theme} onDetected={(code) => { setFormData(prev => ({ ...prev, barcode: code })); setIsScanning(false); }} onClose={() => setIsScanning(false)} />
        )}
    </div>
  );
};

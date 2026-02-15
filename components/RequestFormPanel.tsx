
import React, { useState, useEffect } from 'react';
import { X, ClipboardList } from 'lucide-react';
import { RequestFormData, MasterProduct } from '../types';

interface RequestFormPanelProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RequestFormData;
  setFormData: React.Dispatch<React.SetStateAction<RequestFormData>>;
  onSave: () => void;
  theme: 'dark';
  isEditing: boolean;
  uniqueNames: string[];
  onSuggestProduct: (query: string) => MasterProduct[];
}

export const RequestFormPanel = ({ isOpen, onClose, formData, setFormData, onSave, theme, isEditing, uniqueNames, onSuggestProduct }: RequestFormPanelProps) => {
  const [localPrice, setLocalPrice] = useState((formData.priceToPay || 0).toFixed(2));

  // Sync local price with prop when it changes externally (e.g. product selection)
  useEffect(() => {
    const currentLocal = parseFloat(localPrice);
    const incoming = formData.priceToPay || 0;
    // Only update local state if the numeric values differ significantly
    // This prevents overwriting "10." (which parses to 10) with "10.00" while typing
    if (Math.abs(currentLocal - incoming) > 0.001 || (isNaN(currentLocal) && incoming === 0 && localPrice !== '')) {
       setLocalPrice(incoming.toFixed(2));
    }
  }, [formData.priceToPay]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in slide-in-from-right duration-300">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-xl h-full overflow-y-auto shadow-2xl border-l p-0 flex flex-col ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="p-8 pb-10 bg-rose-700/20 relative overflow-hidden flex-shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md shadow-sm border border-white/5"
          >
            <X size={20}/>
          </button>
          
          <div className="relative z-10 mt-2">
            <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full w-fit border border-rose-500 bg-rose-500/20 font-black text-[10px] uppercase tracking-widest text-rose-400">
              <ClipboardList size={12}/> Customer Request
            </div>
            <h2 className="text-3xl font-black text-white">{isEditing ? 'Update Request' : 'New Customer Inquiry'}</h2>
          </div>
          <ClipboardList className="absolute -right-10 -bottom-10 text-white/5" size={240} />
        </div>

        <div className="p-8 space-y-8 flex-1">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Customer Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 px-1">Customer Name</label>
                <input type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-sm outline-none focus:border-rose-500 transition-all text-white" placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 px-1">Contact Number</label>
                <input type="text" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-sm outline-none focus:border-rose-500 transition-all text-white" placeholder="07000..." />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Requested Item</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-1">Product Description</label>
              <input type="text" list="req-name-suggestions" value={formData.itemName} onChange={e => {
                setFormData({...formData, itemName: e.target.value});
                const match = onSuggestProduct(e.target.value)[0];
                if (match && match.name === e.target.value) {
                  setFormData((prev) => ({...prev, barcode: match.barcode, productCode: match.productCode, priceToPay: match.price || 0 }));
                }
              }} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-sm outline-none focus:border-rose-500 transition-all text-white" placeholder="What are they looking for?" />
              <datalist id="req-name-suggestions">
                {uniqueNames?.map((name: string) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">Barcode / PIP</label>
                  <input type="text" value={formData.barcode || formData.productCode || ''} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs outline-none focus:border-rose-500 transition-all text-white" placeholder="Reference code..." />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">Supplier (Optional)</label>
                  <input type="text" value={formData.supplier || ''} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-xs outline-none focus:border-rose-500 transition-all text-white" placeholder="Supplier..." />
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Transaction & Status</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">Deposit / Price (£)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={localPrice} 
                    onFocus={(e) => e.target.select()}
                    onChange={e => {
                      setLocalPrice(e.target.value);
                      setFormData({...formData, priceToPay: parseFloat(e.target.value) || 0});
                    }}
                    onBlur={() => {
                      const val = parseFloat(localPrice) || 0;
                      setLocalPrice(val.toFixed(2));
                    }}
                    className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-black text-xl outline-none text-emerald-500 focus:border-rose-500 transition-all focus:ring-1 focus:ring-rose-500/20" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">Order Quantity</label>
                  <input 
                    type="number" 
                    value={formData.quantity} 
                    onFocus={(e) => e.target.select()}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} 
                    className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-black text-xl outline-none text-white focus:border-rose-500 transition-all focus:ring-1 focus:ring-rose-500/20" 
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setFormData({...formData, isPaid: !formData.isPaid})} className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${formData.isPaid ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                  <span className="text-[10px] font-black uppercase">Payment Status</span>
                  <span className="font-bold text-xs">{formData.isPaid ? 'PAID' : 'DUE'}</span>
               </button>
               <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800">
                  {['low', 'medium', 'high'].map(u => (
                    <button key={u} onClick={() => setFormData({...formData, urgency: u as any})} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase transition-all ${formData.urgency === u ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}>{u}</button>
                  ))}
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-1">Current Status</label>
               <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-black text-xs uppercase tracking-widest outline-none text-white focus:border-rose-500 transition-all">
                  <option value="pending">Pending Review</option>
                  <option value="ordered">Item Ordered</option>
                  <option value="ready">Ready for Collection</option>
                  <option value="completed">Transaction Completed</option>
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-1">Internal Notes</label>
               <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-xs outline-none focus:border-rose-500 transition-all min-h-[100px] text-white" placeholder="Specific requests or ordering details..." />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md sticky bottom-0 z-50">
           <button onClick={onSave} className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]">
              {isEditing ? 'Save Request' : 'Create Request'}
           </button>
        </div>
      </div>
    </div>
  );
};

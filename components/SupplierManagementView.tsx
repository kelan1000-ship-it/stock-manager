import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, Building2, Link, Save, X, Phone, Mail, BookOpen, Package } from 'lucide-react';
import { Supplier, Product, BranchData, BranchKey } from '../types';

interface SupplierManagementViewProps {
  branchData: BranchData;
  currentBranch: BranchKey;
  onUpdateSupplier: (supplier: Supplier) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onDeleteSupplier: (id: string) => void;
}

import { matchesSearchTerms } from '../utils/stringUtils';

export const SupplierManagementView: React.FC<SupplierManagementViewProps> = ({
  branchData,
  currentBranch,
  onUpdateSupplier,
  onAddSupplier,
  onDeleteSupplier
}) => {
  const suppliers = branchData.suppliers || [];
  const inventory = branchData[currentBranch] || [];
  
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(suppliers.length > 0 ? suppliers[0].id : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  
  const activeSupplier = useMemo(() => suppliers.find(s => s.id === activeSupplierId), [suppliers, activeSupplierId]);
  
  // Update form data when active supplier changes
  React.useEffect(() => {
    if (isAdding) {
      setFormData({ name: '', catalogueUrl: '', notes: '', contactName: '', email: '', phone: '' });
    } else if (activeSupplier) {
      setFormData(activeSupplier);
    }
  }, [activeSupplier, isAdding]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => matchesSearchTerms(s.name, searchQuery));
  }, [suppliers, searchQuery]);

  const activeProducts = useMemo(() => {
    if (!activeSupplier && !isAdding) return [];
    const supplierName = isAdding ? formData.name : activeSupplier?.name;
    if (!supplierName) return [];
    return inventory.filter(p => p.supplier?.toLowerCase() === supplierName.toLowerCase());
  }, [inventory, activeSupplier, isAdding, formData.name]);

  const handleSave = () => {
    if (!formData.name) return;
    
    if (isAdding) {
      onAddSupplier(formData as Omit<Supplier, 'id'>);
      setIsAdding(false);
    } else if (activeSupplier) {
      onUpdateSupplier({ ...activeSupplier, ...formData } as Supplier);
    }
  };

  const [pdfSearchTerm, setPdfSearchTerm] = useState('');

  return (
    <div className="flex h-full bg-slate-950 rounded-tl-3xl overflow-hidden border-t border-l border-slate-800">
      {/* Sidebar - Supplier List */}
      <div className="w-80 flex flex-col bg-slate-950 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 space-y-4">
          <div className="flex items-center gap-3 text-orange-500">
            <Truck size={24} />
            <h2 className="text-xl font-black uppercase tracking-widest">Suppliers</h2>
          </div>
          
          <button 
            onClick={() => { setIsAdding(true); setActiveSupplierId(null); }}
            className="w-full py-3 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-500 hover:bg-orange-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Plus size={14} /> New Supplier
          </button>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white placeholder-slate-600 outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
          {filteredSuppliers.map(supplier => (
            <button
              key={supplier.id}
              onClick={() => { setActiveSupplierId(supplier.id); setIsAdding(false); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border text-left group ${
                activeSupplierId === supplier.id && !isAdding
                  ? 'bg-orange-500/10 border-orange-500/50 text-white' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                activeSupplierId === supplier.id && !isAdding
                  ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-400'
              }`}>
                <Building2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase tracking-wider truncate">{supplier.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate mt-0.5">
                  {inventory.filter(p => p.supplier?.toLowerCase() === supplier.name.toLowerCase()).length} Products
                </p>
              </div>
            </button>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="text-center p-8 text-slate-500">
              <p className="text-xs font-bold">No suppliers found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto scrollbar-hide">
        {(activeSupplier || isAdding) ? (
          <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">
                  {isAdding ? 'Create Supplier Profile' : formData.name}
                </h1>
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-500 mt-2">
                  {isAdding ? 'Fill in details below' : 'Supplier Management Profile'}
                </p>
              </div>
              <div className="flex gap-3">
                {!isAdding && activeSupplier && (
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${activeSupplier.name}?`)) {
                        onDeleteSupplier(activeSupplier.id);
                        setActiveSupplierId(null);
                      }
                    }}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                  >
                     <X size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Delete</span>
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>

            {/* Details Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-800 pb-2">Core Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block pl-1">Supplier Name *</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500 transition-all uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block pl-1"><Phone size={10} className="inline mr-1"/> Phone Number</label>
                      <input 
                        type="text" 
                        value={formData.phone || ''} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block pl-1"><Mail size={10} className="inline mr-1"/> Email Address</label>
                      <input 
                        type="email" 
                        value={formData.email || ''} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 flex flex-col">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-800 pb-2">Catalogue & Notes</h3>
                <div className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block pl-1"><Link size={10} className="inline mr-1"/> Digital Catalogue PDF Link</label>
                    <input 
                      type="url" 
                      value={formData.catalogueUrl || ''} 
                      onChange={e => setFormData({...formData, catalogueUrl: e.target.value})}
                      placeholder="https://example.com/catalogue.pdf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500 transition-all font-mono"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block pl-1">Supplier Notes</label>
                    <textarea 
                      value={formData.notes || ''} 
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full flex-1 min-h-[100px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition-all resize-none shadow-inner"
                      placeholder="Account numbers, terms, minimum orders..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded Catalogue & Products Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
              {/* Active Products List */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-orange-500" />
                    <h3 className="text-[11px] font-black uppercase text-white tracking-widest">Active Range</h3>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-950 text-slate-500 border border-slate-800">
                    {activeProducts.length} Items
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 space-y-2">
                  {activeProducts.map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-orange-500/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white uppercase truncate">{p.name}</p>
                        <p className="text-[9px] italic text-slate-500 uppercase tracking-widest truncate">{p.packSize} • {p.barcode}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                         <p className="text-sm font-black text-emerald-400">£{p.price.toFixed(2)}</p>
                         <p className="text-[9px] font-bold text-slate-600">Cost: £{p.costPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {activeProducts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                       <Package size={32} className="mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No products mapped</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Embedded Catalogue PDF Viewer */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col h-[500px]">
                <div className="flex flex-wrap gap-4 items-center justify-between mb-4 border-b border-slate-800 pb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-orange-500" />
                    <h3 className="text-[11px] font-black uppercase text-white tracking-widest">Live Catalogue</h3>
                  </div>
                  
                  {formData.catalogueUrl && (
                    <div className="relative">
                       <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                       <input 
                         type="text" 
                         value={pdfSearchTerm}
                         onChange={(e) => setPdfSearchTerm(e.target.value)}
                         placeholder="PDF Search terms..."
                         className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-7 pr-3 text-[10px] font-bold text-white placeholder-slate-600 outline-none focus:border-orange-500/50 transition-all w-40"
                       />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative">
                   {formData.catalogueUrl ? (
                     <iframe 
                       src={`${formData.catalogueUrl}${pdfSearchTerm ? `#search=${pdfSearchTerm}` : ''}`} 
                       className="w-full h-full border-0"
                       data-tooltip="Supplier Catalogue"
                     />
                   ) : (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-10">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-xl">
                           <Link size={24} className="text-orange-500/50" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">No Catalogue Linked</p>
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-xs">Provide a valid digital PDF URL in the Core Details section above to view the live catalogue here.</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center h-full">
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
               <Truck size={40} className="text-orange-500/30 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">Supplier Network Hub</h3>
            <p className="text-[11px] font-bold text-slate-500 max-w-sm leading-relaxed">Select a supplier from the directory to manage their profile, view mapped products, or search live PDF catalogues.</p>
          </div>
        )}
      </div>
    </div>
  );
};

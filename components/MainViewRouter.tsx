
import React, { RefObject, useMemo } from 'react';
import {
  ArchiveRestore, Recycle, LayoutDashboard, RefreshCw, ShoppingBag, AlertCircle, Printer,
  CalendarClock, Star, ChevronDown, Check, Tag as TagIcon, Search, ScanLine,
  ClipboardList, ArrowRight, Plus, Truck, X, Activity, Clock, MapPin, Archive, ListChecks
} from 'lucide-react';
import { PerformanceView } from './PerformanceView';
import { RequestsView } from './RequestsView';
import { PlanogramView } from './PlanogramView';
import { PricingDeskView } from './PricingDeskView';
import { InventoryTable } from './InventoryTable';
import { SharedStockModule } from './SharedStockModule';
import { SupplierManagementView } from './SupplierManagementView';
import { FilterButton, DepartmentToggle } from './FilterComponents';
import { STATUS_OPTIONS } from '../utils/statusUtils';
import { Product, CustomerRequest, InventorySubFilter, BranchData, BranchKey, ColumnVisibility } from '../types';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { PricingDeskReturn } from '../hooks/usePricingDesk';
import { PlanogramReturn } from '../hooks/usePlanogram';
import { TagStyle } from '../hooks/useInventoryTags';
import { ColumnVisibilityControl } from './ColumnVisibilityControl';
import { DashboardWidgets } from './DashboardWidgets';

interface MainViewRouterProps {
  mainView: 'inventory' | 'requests' | 'performance' | 'archive' | 'bin' | 'planogram' | 'reconciliation' | 'shared-stock' | 'supplier-management';
  logic: StockLogicReturn;
  branchData: BranchData;
  currentBranch: BranchKey;
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>;
  pricingLogic: PricingDeskReturn;
  planogramLogic: PlanogramReturn;
  noteLogic: { isNoteExpanded: (id: string) => boolean; toggleNote: (id: string) => void; };
  sortedItems: Product[];
  effectiveSortConfig: { key: string; direction: 'asc' | 'desc' }[];
  sortedRequests: CustomerRequest[];
  liveOrderTotal: number;
  manualRestockQtys: Record<string, number>;
  updateManualQty: (id: string, qty: number) => void;
  requestSortConfig: { key: string; direction: 'asc' | 'desc' }[];
  setRequestSortConfig: React.Dispatch<React.SetStateAction<{ key: string; direction: 'asc' | 'desc' }[]>>;
  requestTab: 'active' | 'archive' | 'bin';
  setRequestTab: (tab: 'active' | 'archive' | 'bin') => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleAll: (specificIds?: string[]) => void;
  isAllSelected: boolean;
  uniqueSuppliers: string[];
  selectedSuppliers: string[];
  supplierFilterMode: 'show' | 'hide';
  toggleSupplierFilter: (s: string) => void;
  clearSupplierFilters: () => void;
  toggleSupplierFilterMode: () => void;
  uniqueLocations: string[];
  selectedLocations: string[];
  locationFilterMode: 'show' | 'hide';
  toggleLocationFilter: (l: string) => void;
  clearLocationFilters: () => void;
  toggleLocationFilterMode: () => void;
  activeFilters: string[];
  tagFilterMode: 'show' | 'hide';
  toggleFilter: (tag: string) => void;
  toggleTagFilterMode: () => void;
  clearFilters: () => void;
  allUniqueTags: string[];
  tagSettings: Record<string, TagStyle>;
  openProductEdit: (p: Product) => void;
  openTransferForm: (p: Product) => void;
  openHistoryView: (p: Product) => void;
  setPreviewImage: (img: { src: string, title: string } | null) => void;
  theme: 'dark';
  isTagMenuOpen: boolean;
  setIsTagMenuOpen: (o: boolean) => void;
  isSupplierMenuOpen: boolean;
  setIsSupplierMenuOpen: (o: boolean) => void;
  isLocationMenuOpen: boolean;
  setIsLocationMenuOpen: (o: boolean) => void;
  isStatusMenuOpen: boolean;
  setIsStatusMenuOpen: (o: boolean) => void;
  tagMenuRef: React.RefObject<HTMLDivElement | null>;
  supplierMenuRef: React.RefObject<HTMLDivElement | null>;
  locationMenuRef: React.RefObject<HTMLDivElement | null>;
  statusMenuRef: React.RefObject<HTMLDivElement | null>;
  onOpenPriceChecker: () => void;
  columns: ColumnVisibility;
  toggleColumn: (key: keyof ColumnVisibility) => void;
  onOpenReconciliation: () => void;
  onOpenDuplicates: () => void;
}

export const MainViewRouter: React.FC<MainViewRouterProps> = ({
  mainView, logic, branchData, currentBranch, setBranchData, pricingLogic, planogramLogic, noteLogic,
  sortedItems, effectiveSortConfig, sortedRequests, liveOrderTotal, manualRestockQtys, updateManualQty,
  requestSortConfig, setRequestSortConfig, requestTab, setRequestTab,
  selectedIds, toggleSelection, toggleAll, isAllSelected,
  uniqueSuppliers, selectedSuppliers, supplierFilterMode, toggleSupplierFilter, clearSupplierFilters, toggleSupplierFilterMode,
  uniqueLocations, selectedLocations, locationFilterMode, toggleLocationFilter, clearLocationFilters, toggleLocationFilterMode,
  activeFilters, tagFilterMode, toggleFilter, toggleTagFilterMode, clearFilters, allUniqueTags, tagSettings,
  openProductEdit, openTransferForm, openHistoryView, setPreviewImage, theme,
  isTagMenuOpen, setIsTagMenuOpen, isSupplierMenuOpen, setIsSupplierMenuOpen, isLocationMenuOpen, setIsLocationMenuOpen, isStatusMenuOpen, setIsStatusMenuOpen,
  tagMenuRef, supplierMenuRef, locationMenuRef, statusMenuRef, onOpenPriceChecker,
  columns, toggleColumn,
  onOpenReconciliation, onOpenDuplicates
}) => {  
  if (mainView === 'performance') {
    return <PerformanceView items={branchData[currentBranch] || []} />;
  }

  if (mainView === 'supplier-management') {
    return (
      <SupplierManagementView 
        branchData={branchData}
        currentBranch={currentBranch}
        onUpdateSupplier={logic.updateSupplier || (() => {})}
        onAddSupplier={logic.addSupplier || (() => {})}
        onDeleteSupplier={logic.deleteSupplier || (() => {})}
      />
    );
  }

  if (mainView === 'shared-stock') {
    return (
      <SharedStockModule 
        branchData={branchData}
        currentBranch={currentBranch}
        logic={logic}
        theme={theme}
        tagSettings={tagSettings}
        onOpenEdit={openProductEdit}
        onOpenHistory={openHistoryView}
        onPreviewImage={(src, title) => setPreviewImage({ src, title })}
      />
    );
  }

  if (mainView === 'requests') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <div className="p-1.5 rounded-2xl border bg-slate-950 border-slate-800 flex">
              <button onClick={() => setRequestTab('active')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${requestTab === 'active' ? 'bg-rose-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><ClipboardList size={14} /> Active</button>
              <button onClick={() => setRequestTab('archive')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${requestTab === 'archive' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Archive size={14} /> Archive</button>
              <button onClick={() => setRequestTab('bin')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${requestTab === 'bin' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Recycle size={14} /> Bin</button>
           </div>
           
           <button 
             onClick={() => { logic.resetRequestForm(); logic.setIsAddingRequest(true); }} 
             className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-rose-600 text-white flex items-center gap-2 hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/40 border border-rose-500"
           >
             <Plus size={16} /> <span>New Request</span>
           </button>
        </div>
        <RequestsView 
          requests={sortedRequests} 
          onEdit={(r) => { 
            logic.setRequestFormData({
              ...r,
              barcode: r.barcode || '',
              productCode: r.productCode || '',
              supplier: r.supplier || '',
              notes: r.notes || ''
            }); 
            logic.setEditingRequestId(r.id); 
            logic.setIsAddingRequest(true); 
          }} 
          onDelete={logic.handleDeleteRequest}
          onUpdate={logic.updateRequestItem}
          onRestore={logic.handleRestoreRequest}
          sortConfig={requestSortConfig}
          onSort={(k, multi) => setRequestSortConfig((prev) => {
            const existing = prev.findIndex(c => c.key === k);
            if (multi) {
              if (existing !== -1) {
                if (prev[existing].direction === 'asc') return prev.map((c, i) => i === existing ? { ...c, direction: 'desc' as const } : c);
                return prev.filter((_, i) => i !== existing);
              }
              return [...prev, { key: k, direction: 'asc' as const }];
            }
            if (existing !== -1 && prev.length === 1) return [{ key: k, direction: prev[existing].direction === 'asc' ? 'desc' as const : 'asc' as const }];
            return [{ key: k, direction: 'asc' as const }];
          })}
          requestTab={requestTab}
        />
      </div>
    );
  }

  if (mainView === 'planogram') {
    return (
      <PlanogramView
        activePlanogram={planogramLogic.activePlanogram}
        activeFloorPlan={planogramLogic.activeFloorPlan}
        inventory={branchData[currentBranch] || []}
        onUpdateSlot={planogramLogic.updateSlot}
        onUpdateSlotPurpose={planogramLogic.updateSlotPurpose}
        onSwapSlots={planogramLogic.swapSlots}
        onAddPlanogram={planogramLogic.addPlanogram}
        onUpdatePlanogramDetails={planogramLogic.updatePlanogramDetails}
        onUpdateImage={planogramLogic.updatePlanogramImage}
        onSaveAiVisualisation={planogramLogic.updateAiVisualisation}
        planograms={planogramLogic.planograms}
        onSelectPlanogram={planogramLogic.setActivePlanogramId}
        currentBranch={currentBranch}
        addShelfToFloor={planogramLogic.addShelfToFloor}
        updateFloorItem={planogramLogic.updateFloorItem}
        removeFloorItem={planogramLogic.removeFloorItem}
        onUpdateProduct={logic.updateProductItem}
        onAddFace={planogramLogic.addFaceToPlanogram}
        onRemoveFace={planogramLogic.removeFace}
        onDeletePlanogram={planogramLogic.deletePlanogram}
        onSaveConfiguration={planogramLogic.saveConfiguration}
        onLoadConfiguration={planogramLogic.loadConfiguration}
        onDeleteConfiguration={planogramLogic.deleteConfiguration}
        onRenameConfiguration={planogramLogic.renameConfiguration}
        onOpenProductEdit={openProductEdit}
      />    );
  }

  // Derived state for Active Main Inventory stats (excluding Archive/Bin)
  const activeMainInventory = useMemo(() => {
    return (branchData[currentBranch] || []).filter((p: Product) => !p.isArchived && !p.deletedAt);
  }, [branchData, currentBranch]);

  const activeOrdersCount = useMemo(() => {
    const activeOrderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const orders = branchData[activeOrderKey] || [];
    const activeIds = new Set(activeMainInventory.map((p: Product) => p.id));
    const orderedItems = orders.filter((o: { productId: string; status?: string }) =>
      activeIds.has(o.productId) &&
      o.status === 'ordered'
    );
    return new Set(orderedItems.map((o: { productId: string }) => o.productId)).size;
  }, [branchData, currentBranch, activeMainInventory]);

  if (mainView === 'inventory' || mainView === 'archive' || mainView === 'bin') {
    return (
      <div className="space-y-8">
        {mainView === 'archive' && (
          <div className="rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 p-8 flex flex-col sm:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 relative overflow-hidden group">
             <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors duration-500" />
             <div className="w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 shrink-0 relative z-10">
                <ArchiveRestore size={32} className="text-white" />
             </div>
             <div className="text-center sm:text-left relative z-10">
                <h2 className="text-2xl font-black text-white">Archived Inventory</h2>
                <p className="font-bold text-slate-400 text-sm mt-1 max-w-xl">You are viewing inactive or seasonal products. Restore items to bring them back to live inventory.</p>
             </div>
             <div className="sm:ml-auto flex gap-3 relative z-10">
                <button onClick={() => logic.setMainView('bin')} className="px-6 py-3.5 rounded-xl bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600 hover:text-white hover:border-rose-500 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center gap-2">
                   <Recycle size={14} /> VIEW BIN
                </button>
                <button onClick={() => logic.setMainView('inventory')} className="px-8 py-3.5 rounded-xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95">
                   RETURN TO LIVE
                </button>
             </div>
             <ArchiveRestore className="absolute -right-6 -bottom-6 text-amber-500/5 rotate-12" size={200} />
          </div>
        )}
        
        {mainView === 'bin' && (
          <div className="rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 p-8 flex flex-col sm:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 relative overflow-hidden group">
             <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-amber-500/10 transition-colors duration-500" />
             <div className="w-16 h-16 rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/40 shrink-0 relative z-10">
                <Recycle size={32} className="text-white" />
             </div>
             <div className="text-center sm:text-left relative z-10">
                <h2 className="text-2xl font-black text-white">Recycle Bin</h2>
                <p className="font-bold text-slate-400 text-sm mt-1 max-w-xl">Items deleted recently appear here. Restore them if needed or they will be permanently removed.</p>
             </div>
             <div className="sm:ml-auto flex gap-3 relative z-10">
                <button onClick={() => logic.setMainView('archive')} className="px-6 py-3.5 rounded-xl bg-amber-600/10 text-amber-500 border border-amber-500/20 hover:bg-amber-600 hover:text-white hover:border-amber-500 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center gap-2">
                   <ArchiveRestore size={14} /> VIEW ARCHIVE
                </button>
                <button onClick={() => logic.setMainView('inventory')} className="px-8 py-3.5 rounded-xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95">
                   RETURN TO LIVE
                </button>
             </div>
             <Recycle className="absolute -right-6 -bottom-6 text-rose-500/5 rotate-12" size={200} />
          </div>
        )}

        {/* Dashboard Widgets Section */}
        <DashboardWidgets
          activeMainInventory={activeMainInventory}
          activeOrdersCount={activeOrdersCount}
          logic={logic}
          pricingAlertCount={pricingLogic.alerts.length}
          onOpenReconciliation={onOpenReconciliation}
          onOpenDuplicates={onOpenDuplicates}
          currentBranch={currentBranch}
        />

        {/* Updated Filter Section */}
        <div className="rounded-[3rem] bg-slate-950 border border-slate-800 shadow-2xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-center">
             <DepartmentToggle activeFilter={logic.stockTypeFilter} onChange={logic.setStockTypeFilter} />
           </div>
           
           {/* Grid Layout for Filter Tabs - Spreads evenly */}
           <div className={`grid gap-3 w-full ${mainView === 'inventory' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-9' : 'grid-cols-1'}`}>
              <FilterButton label="All Items" value="all" icon={LayoutDashboard} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} className="w-full justify-center px-2" />
              {mainView === 'inventory' && (
                <>
                  <FilterButton label="Restock" value="restock" icon={RefreshCw} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} className="w-full justify-center px-2" />
                  <FilterButton label="Ordered" value="ordered" icon={ShoppingBag} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} className="w-full justify-center px-2" />
                  <FilterButton label="Price Alerts" value="alerts" icon={AlertCircle} count={pricingLogic.alerts.length} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} activeColorClass="bg-blue-600 shadow-blue-900/40" className="w-full justify-center px-2" />
                  <FilterButton label="Labels" value="labels" icon={Printer} count={pricingLogic.labelQueue.length} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} activeColorClass="bg-blue-600 shadow-blue-900/40" className="w-full justify-center px-2" />
                  <FilterButton label="Stock Check" value="stock-check" icon={ListChecks} count={branchData[currentBranch]?.filter(p => p.needsStockCheck).length} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} activeColorClass="bg-red-600 shadow-red-900/40" className="w-full justify-center px-2" />
                  <FilterButton label="Clearance" value="clearance" icon={Star} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} activeColorClass="bg-amber-600 shadow-amber-900/40" className="w-full justify-center px-2" />
                  <FilterButton label="Expiring" value="expiring" icon={CalendarClock} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} activeColorClass="bg-rose-600 shadow-rose-900/40" className="w-full justify-center px-2" />
                  <FilterButton label="Recently Added" value="recently-added" icon={Clock} count={logic.recentlyAddedCount} activeValue={logic.subFilter as InventorySubFilter} onClick={logic.setSubFilter} activeColorClass="bg-violet-600 shadow-violet-900/40" className="w-full justify-center px-2" />
                </>
              )}
           </div>

            {/* Unified Filter Bar */}
            <div className="flex flex-col xl:flex-row items-center w-full bg-slate-950 border border-slate-800 rounded-2xl p-1 shadow-sm">
                
                {/* Supplier */}
                <div className="relative w-full xl:w-auto h-full" ref={supplierMenuRef}>
                    <button 
                      onClick={() => setIsSupplierMenuOpen(!isSupplierMenuOpen)}
                      className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isSupplierMenuOpen ? 'bg-slate-900' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck size={16} className={selectedSuppliers.length > 0 ? (supplierFilterMode === 'show' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500'} />
                        <span className={selectedSuppliers.length > 0 ? 'text-white' : 'text-slate-400'}>
                          Suppliers
                          {selectedSuppliers.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({selectedSuppliers.length})</span>}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSupplierMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSupplierMenuOpen && (
                      <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
                        <div className="p-3 border-b flex items-center justify-between border-slate-800">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
                          <button 
                            onClick={toggleSupplierFilterMode}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                              supplierFilterMode === 'show' 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            {supplierFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
                          </button>
                        </div>
                        <div className="p-3 border-b flex items-center justify-between border-slate-800">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">wholesalers</span>
                          {selectedSuppliers.length > 0 && (
                            <button onClick={clearSupplierFilters} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto p-1 space-y-1 mt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          {uniqueSuppliers.length === 0 ? (
                            <p className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No suppliers found</p>
                          ) : uniqueSuppliers.map((supplier) => {
                            const isActive = selectedSuppliers.includes(supplier);
                            return (
                              <button 
                                key={supplier}
                                onClick={() => toggleSupplierFilter(supplier)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-emerald-600/10' : 'hover:bg-slate-800'}`}
                              >
                                <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>{supplier}</span>
                                {isActive && <Check size={14} className="text-emerald-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

                {/* Tags */}
                <div className="relative w-full xl:w-auto h-full" ref={tagMenuRef}>
                    <button 
                      onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                      className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isTagMenuOpen ? 'bg-slate-900' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <TagIcon size={16} className={activeFilters.length > 0 ? (tagFilterMode === 'show' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500'} />
                        <span className={activeFilters.length > 0 ? 'text-white' : 'text-slate-400'}>
                          Tags
                          {activeFilters.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({activeFilters.length})</span>}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isTagMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isTagMenuOpen && (
                      <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
                         <div className="p-3 border-b flex items-center justify-between border-slate-800">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
                            <button 
                                onClick={toggleTagFilterMode}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                                tagFilterMode === 'show' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}
                            >
                                {tagFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
                            </button>
                         </div>
                         <div className="p-3 border-b flex items-center justify-between border-slate-800">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Labels</span>
                            {activeFilters.length > 0 && (
                              <button onClick={clearFilters} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
                            )}
                         </div>
                         <div className="max-h-96 overflow-y-auto p-1 space-y-1 mt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {allUniqueTags.length === 0 ? (
                              <p className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No tags found</p>
                            ) : allUniqueTags.map(tag => {
                              const settings = tagSettings[tag];
                              const isActive = activeFilters.includes(tag);
                              return (
                                <button 
                                  key={tag}
                                  onClick={() => toggleFilter(tag)}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-emerald-600/10' : 'hover:bg-slate-800'}`}
                                >
                                  <div className="flex items-center gap-3">
                                     <div 
                                       style={settings?.color ? { backgroundColor: settings.color } : {}}
                                       className={`w-3 h-3 rounded-full border border-slate-700 ${settings?.isFlashing ? 'animate-tag-flash' : ''}`}
                                     />
                                     <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>#{tag}</span>
                                  </div>
                                  {isActive && <Check size={14} className="text-emerald-500" />}
                                </button>
                              );
                            })}
                         </div>
                      </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

                {/* Status Filter */}
                <div className="relative w-full xl:w-auto h-full" ref={statusMenuRef}>
                    <button 
                      onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                      className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isStatusMenuOpen ? 'bg-slate-900' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={logic.selectedStatuses.length > 0 ? (logic.statusFilterMode === 'show' ? 'text-blue-500' : 'text-rose-500') : 'text-slate-500'} />
                        <span className={logic.selectedStatuses.length > 0 ? 'text-white' : 'text-slate-400'}>
                          Statuses
                          {logic.selectedStatuses.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({logic.selectedStatuses.length})</span>}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isStatusMenuOpen && (
                      <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
                        <div className="p-3 border-b flex items-center justify-between border-slate-800">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
                          <button 
                            onClick={logic.toggleStatusFilterMode}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                              logic.statusFilterMode === 'show' 
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            {logic.statusFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
                          </button>
                        </div>
                        <div className="p-3 border-b flex items-center justify-between border-slate-800">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Levels</span>
                          {logic.selectedStatuses.length > 0 && (
                            <button onClick={logic.clearStatusFilters} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto p-1 space-y-1 mt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          {(logic.subFilter === 'expiring' ? ['Short Expiry', 'Critical Expiry', 'Expired'] : STATUS_OPTIONS).map((status) => {
                            const isActive = logic.selectedStatuses.includes(status);
                            return (
                              <button 
                                key={status}
                                onClick={() => logic.toggleStatusFilter(status)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-blue-600/10' : 'hover:bg-slate-800'}`}
                              >
                                <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{status}</span>
                                {isActive && <Check size={14} className="text-blue-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

                {/* Location Filter */}
                <div className="relative w-full xl:w-auto h-full" ref={locationMenuRef}>
                    <button 
                      onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                      className={`h-[52px] w-full xl:w-auto px-4 rounded-xl hover:bg-slate-900 transition-all text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 ${isLocationMenuOpen ? 'bg-slate-900' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className={selectedLocations.length > 0 ? (locationFilterMode === 'show' ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500'} />
                        <span className={selectedLocations.length > 0 ? 'text-white' : 'text-slate-400'}>
                          Locations
                          {selectedLocations.length > 0 && <span className="ml-1 text-[9px] text-slate-500">({selectedLocations.length})</span>}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${isLocationMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLocationMenuOpen && (
                      <div className="absolute top-full left-0 mt-3 w-64 rounded-3xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-2 z-[60] animate-in fade-in zoom-in duration-200 ring-1 ring-white/5 bg-slate-950 border-slate-800">
                        <div className="p-3 border-b flex items-center justify-between border-slate-800">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Filter Mode</span>
                          <button 
                            onClick={toggleLocationFilterMode}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black uppercase tracking-tighter ${
                              locationFilterMode === 'show' 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            {locationFilterMode === 'show' ? 'Show Selected' : 'Hide Selected'}
                          </button>
                        </div>
                        <div className="p-3 border-b flex items-center justify-between border-slate-800">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aisles & Shelves</span>
                          {selectedLocations.length > 0 && (
                            <button onClick={clearLocationFilters} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Clear</button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto p-1 space-y-1 mt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          {uniqueLocations.length === 0 ? (
                            <p className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No locations found</p>
                          ) : uniqueLocations.map((location) => {
                            const isActive = selectedLocations.includes(location);
                            return (
                              <button 
                                key={location}
                                onClick={() => toggleLocationFilter(location)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${isActive ? 'bg-emerald-600/10' : 'hover:bg-slate-800'}`}
                              >
                                <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>{location}</span>
                                {isActive && <Check size={14} className="text-emerald-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

                {/* Search */}
                <div className="flex-1 w-full flex items-center gap-3 px-4 h-[52px]">
                    <Search size={18} className="text-slate-500" />
                    <input 
                        type="text" 
                        value={logic.searchQuery}
                        onChange={(e) => logic.setSearchQuery(e.target.value)}
                        placeholder="Search inventory..."
                        className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder-slate-600 h-full"
                    />
                    {logic.searchQuery && (
                        <button 
                            onClick={() => logic.setSearchQuery('')}
                            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {(logic.searchQuery || selectedSuppliers.length > 0 || selectedLocations.length > 0 || activeFilters.length > 0 || logic.selectedStatuses.length > 0) ? (
                        <button
                            onClick={() => {
                                logic.setSearchQuery('');
                                clearSupplierFilters();
                                clearLocationFilters();
                                clearFilters();
                                logic.clearStatusFilters();
                            }}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors ml-1"
                        >
                            Clear All
                        </button>
                    ) : null}
                    <div className="w-px h-6 bg-slate-800 mx-1" />
                    <div className="flex items-center gap-1">
                        <button onClick={onOpenPriceChecker} className="p-2 rounded-lg text-[#FFD700] hover:bg-slate-900 hover:text-[#FFC700] transition-all"><span className="font-black text-lg leading-none">£</span></button>
                        <button onClick={() => logic.setIsVisionScanning(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-900 hover:text-emerald-400 transition-all"><ScanLine size={18} /></button>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px xl:w-px xl:h-8 bg-slate-800 my-1 xl:my-0 mx-0 xl:mx-1" />

                {/* Columns */}
                <div className="w-full xl:w-auto flex justify-center xl:justify-start">
                    <ColumnVisibilityControl columns={columns} onToggle={toggleColumn} variant="ghost" />
                </div>
           </div>
        </div>

        {logic.subFilter === 'alerts' || logic.subFilter === 'labels' ? (
          <PricingDeskView branchData={branchData} setBranchData={setBranchData} theme={theme} currentBranch={currentBranch} subFilter={logic.subFilter as InventorySubFilter} onTabChange={(tab) => logic.setSubFilter(tab)} />
        ) : (
          <div className="space-y-6">
            {logic.subFilter === 'ordered' && (
              <div className="flex justify-center">
                <div className="p-1 rounded-2xl border bg-slate-950 border-slate-800 flex shadow-inner">
                  <button 
                    onClick={() => logic.setOrderTab('active')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${logic.orderTab === 'active' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <ShoppingBag size={14} /> Active Order
                  </button>
                  <button 
                    onClick={() => logic.setOrderTab('backorder')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${logic.orderTab === 'backorder' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <Clock size={14} /> Backorder
                  </button>
                </div>
              </div>
            )}
            
            <InventoryTable 
              items={sortedItems}
              sortConfig={effectiveSortConfig}
              onSort={(k: string, multi: boolean) => logic.handleSort(k, multi)}
              selectedIds={selectedIds}
              onToggleSelection={(id) => toggleSelection(id)}
              onToggleAll={toggleAll}
              isAllSelected={isAllSelected}
              manualRestockQtys={manualRestockQtys}
              onManualQtyChange={updateManualQty}
              onPreviewImage={(src, title) => setPreviewImage({ src, title })}
              noteLogic={noteLogic}
              logic={logic}
              pricingLogic={pricingLogic}
              tagSettings={tagSettings}
              onOpenEdit={openProductEdit}
              onOpenTransfer={openTransferView}
              onOpenHistory={openHistoryView}
              onConfirmStockCheck={logic.confirmStockCheck}
              columns={columns}
              isSortingDisabled={logic.subFilter === 'recently-added'}
              />
          </div>
        )}
      </div>
    );
  }

  return null;
};

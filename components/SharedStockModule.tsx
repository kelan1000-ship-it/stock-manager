import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Handshake, Package, History, Download } from 'lucide-react';
import { BranchData, BranchKey, Product } from '../types';
import { useSharedStock } from '../hooks/useSharedStock';
import { SharedStockFilters } from './SharedStockFilters';
import { SharedInventoryTable } from './SharedInventoryTable';
import { JointOrderPanel } from './JointOrderPanel';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { TagStyle } from '../hooks/useInventoryTags';
import { useProductNotes } from '../hooks/useProductNotes';

interface SharedStockModuleProps {
  branchData: BranchData;
  currentBranch: BranchKey;
  logic: StockLogicReturn;
  theme: 'dark';
  tagSettings?: Record<string, TagStyle>;
  onOpenEdit?: (product: Product) => void;
  onOpenHistory?: (product: Product) => void;
  onPreviewImage?: (src: string, title: string) => void;
}

export const SharedStockModule: React.FC<SharedStockModuleProps> = ({
  branchData,
  currentBranch,
  logic,
  theme,
  tagSettings = {} as Record<string, TagStyle>,
  onOpenEdit,
  onOpenHistory,
  onPreviewImage
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All Suppliers');
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);

  const noteLogic = useProductNotes();

  const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';
  const localItems = branchData[currentBranch] || [];
  const otherItems = branchData[otherBranch] || [];
  const jointOrders = branchData.jointOrders || [];

  const {
    orderDrafts,
    orderConfirmations,
    allocationDrafts,
    liveOrderTotal,
    handleOrderDraftChange,
    toggleConfirmation,
    handlePlaceJointOrder,
    updateSharedValues,
    handleUpdateTarget,
    handleUpdateStock,
    handleAllocationChange,
    confirmAllocation
  } = useSharedStock(branchData, currentBranch, logic, localItems);

  // Filter for shared items only
  const sharedInventory = useMemo(() => {
    return localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived)
      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))
      .filter(p => selectedTags.length === 0 || selectedTags.every(tag => p.tags && p.tags.includes(tag)))
      .filter(p => selectedSupplier === 'All Suppliers' || p.supplier === selectedSupplier);
  }, [localItems, searchQuery, selectedTags, selectedSupplier]);

  const sharedTags = useMemo(() => {
    const tags = new Set<string>();
    localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived).forEach(p => {
      p.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [localItems]);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived).forEach(p => {
      if (p.supplier) suppliers.add(p.supplier);
    });
    return ['All Suppliers', ...Array.from(suppliers).sort()];
  }, [localItems]);

  const activeJointOrders = useMemo(() => {
    return jointOrders
      .filter(o => o.status === 'pending_allocation')
      .filter(o => {
        const matchesSearch = !searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.barcode.includes(searchQuery);
        if (!matchesSearch) return false;

        const originalProduct = localItems.find(p => p.barcode === o.barcode);
        if (!originalProduct) return true;

        const matchesSupplier = selectedSupplier === 'All Suppliers' || originalProduct.supplier === selectedSupplier;
        const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => originalProduct.tags && originalProduct.tags.includes(tag));

        return matchesSupplier && matchesTags;
      });
  }, [jointOrders, searchQuery, selectedSupplier, selectedTags, localItems]);

  // Calculate Ordered Total for the History tab
  const orderedTotal = useMemo(() => {
    return activeJointOrders.reduce((acc, order) => {
      const product = localItems.find(p => p.id === order.productId) || localItems.find(p => p.barcode === order.barcode);
      return acc + ((product?.costPrice || 0) * order.totalQuantity);
    }, 0);
  }, [activeJointOrders, localItems]);

  const stats = useMemo(() => {
    const totalValue = sharedInventory.reduce((acc, p) => acc + (p.price * p.stockInHand), 0);
    const lowStockCount = sharedInventory.filter(p => p.stockInHand <= (p.stockToKeep * 0.25)).length;
    return { totalValue, lowStockCount };
  }, [sharedInventory]);

  const handleExportOrders = () => {
    if (activeJointOrders.length === 0) {
      alert("No active orders to export.");
      return;
    }

    const data = activeJointOrders.map(order => {
      const product = localItems.find(p => p.id === order.productId) || localItems.find(p => p.barcode === order.barcode);
      const draft = allocationDrafts[order.id] || { bywood: order.allocationBywood, broom: order.allocationBroom };
      const total = draft.bywood + draft.broom;

      return {
        'Product Name': order.name,
        'Product Barcode': order.barcode,
        'PIP Code': product?.productCode || 'N/A',
        'Bywood Qty': draft.bywood,
        'Broom Qty': draft.broom,
        'Total Quantity Ordered': total
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Joint Orders");
    XLSX.writeFile(wb, `Joint_Order_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Module Header */}
      <div className="rounded-[3rem] bg-indigo-900/20 border border-indigo-500/20 p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-900/50">
              <Handshake size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Shared Stock Hub</h2>
              <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs mt-1">Joint Venture Inventory Management</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             <div className="p-4 rounded-3xl bg-emerald-900/20 border border-emerald-500/30 flex flex-col items-center min-w-[140px] shadow-lg shadow-emerald-900/10 transition-all duration-300">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-0.5">
                  {activeTab === 'inventory' ? 'Live Order Total' : 'Ordered Total'}
                </span>
                <span className="text-xl font-black text-white">
                  £{(activeTab === 'inventory' ? liveOrderTotal : orderedTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
             </div>
          </div>
        </div>
        
        <Handshake className="absolute -right-10 -bottom-10 text-indigo-500/5 rotate-12" size={300} />
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <SharedStockFilters 
            isSupplierMenuOpen={isSupplierMenuOpen}
            setIsSupplierMenuOpen={setIsSupplierMenuOpen}
            isTagMenuOpen={isTagMenuOpen}
            setIsTagMenuOpen={setIsTagMenuOpen}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            uniqueSuppliers={uniqueSuppliers}
            sharedTags={sharedTags}
            tagSettings={tagSettings}
         />

         {/* Right Side: Tab Switcher & Actions */}
         <div className="flex items-center gap-3 shrink-0">
            {activeTab === 'orders' && (
              <button 
                onClick={handleExportOrders}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-500 hover:text-white hover:bg-emerald-600 transition-all shadow-lg"
                title="Export Joint Order to Excel"
              >
                <Download size={20} />
              </button>
            )}
            
            <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 shadow-lg">
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Package size={14} /> Joint Inventory
                </button>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <History size={14} /> Order History ({activeJointOrders.length})
                </button>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-[2.5rem] bg-slate-900/50 border border-slate-800 overflow-hidden shadow-xl min-h-[500px]">
         {activeTab === 'inventory' ? (
           <SharedInventoryTable 
              inventory={sharedInventory}
              otherItems={otherItems}
              currentBranch={currentBranch}
              otherBranch={otherBranch}
              orderDrafts={orderDrafts}
              orderConfirmations={orderConfirmations}
              onUpdateSharedValues={updateSharedValues}
              onUpdateTarget={handleUpdateTarget}
              onUpdateStock={handleUpdateStock}
              onOrderDraftChange={handleOrderDraftChange}
              onToggleConfirmation={toggleConfirmation}
              onPlaceJointOrder={handlePlaceJointOrder}
              onOpenEdit={onOpenEdit}
              onOpenHistory={onOpenHistory}
              onPreviewImage={onPreviewImage}
              tagSettings={tagSettings}
              noteLogic={noteLogic}
           />
         ) : (
           <JointOrderPanel 
              orders={activeJointOrders}
              allocationDrafts={allocationDrafts}
              onAllocationChange={handleAllocationChange}
              onConfirmAllocation={confirmAllocation}
              onUpdateOrder={logic.updateJointOrder}
           />
         )}
      </div>
    </div>
  );
};
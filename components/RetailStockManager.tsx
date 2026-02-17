
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Plus, LayoutDashboard, Database, ChevronDown, MessageSquare,
  BarChart3, ClipboardList, Layers, Handshake,
  ArrowRightLeft, Volume2, VolumeX, LogOut, Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BranchSelector } from './BranchSelector';
import { AdminPanel } from './AdminPanel';
import { useStockLogic } from '../hooks/useStockLogic';
import { usePricingDesk } from '../hooks/usePricingDesk';
import { usePlanogram } from '../hooks/usePlanogram';
import { useSupplierFilter } from '../hooks/useSupplierFilter';
import { useSelection } from '../hooks/useSelection';
import { useInventoryTags } from '../hooks/useInventoryTags';
import { useProductNotes } from '../hooks/useProductNotes';
import { useInventorySync } from '../hooks/useInventorySync';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { useSlowMoverInsights } from '../hooks/useSlowMoverInsights';
import { ManageDataDropdown, BulkActionToolbar } from './ManagerComponents';
import { MainViewRouter } from './MainViewRouter';
import { ModalManager } from './ModalManager';
import { InventoryManagement } from './InventoryManagement';
import { LocalDuplicatesModal } from './LocalDuplicatesModal';
import { PriceCheckerModal } from './PriceCheckerModal';
import { HeaderGlobalSearch } from './HeaderGlobalSearch';
import { HeaderNotificationBar } from './HeaderNotificationBar';
import { parseInventoryFile, compareInventory, generateTemplate, InventoryComparisonResult } from '../utils/inventoryParser';
import Logo from '../Logo';
import { verifyPriceSyncReset } from '../utils/verifyPriceSyncReset';
import { BranchKey, Product, CustomerRequest, OrderItem, InventorySubFilter } from '../types';

export default function RetailStockManager() {
  const { isAdmin, signOut } = useAuth();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const logic = useStockLogic();
  const pricingLogic = usePricingDesk(logic.branchData, logic.setBranchData, logic.currentBranch);
  const planogramLogic = usePlanogram(logic.branchData, logic.setBranchData, logic.currentBranch);
  const noteLogic = useProductNotes();
  const { syncImportedData } = useInventorySync(logic.branchData, logic.setBranchData, logic.currentBranch);
  const { columns, toggleColumn } = useColumnVisibility();
  
  const { 
    currentBranch, mainView, branchData, setBranchData, searchQuery, subFilter, stockTypeFilter, 
    isManageDataOpen, isBulkOpen, isMasterCatalogueOpen, 
    isTransferInboxOpen, setIsTransferInboxOpen, isChatOpen, setIsChatOpen,
    isMuted, setIsMuted
  } = logic;
  
  const theme = 'dark';
  const [selectedTransferProduct, setSelectedTransferProduct] = useState<Product | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string, title: string } | null>(null);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  
  const [isTransferFormOpen, setIsTransferFormOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);
  const [manualRestockQtys, setManualRestockQtys] = useState<Record<string, number>>({});
  const [requestSortConfig, setRequestSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: 'timestamp', direction: 'desc' });
  const [isRequestBinView, setIsRequestBinView] = useState(false);

  // Inventory Management Console States
  const [importResults, setImportResults] = useState<InventoryComparisonResult[]>([]);
  const [pendingImportData, setPendingImportData] = useState<Partial<Product>[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  
  // Local Duplicate Management
  const [isLocalDuplicatesOpen, setIsLocalDuplicatesOpen] = useState(false);

  // Price Checker State
  const [scanMode, setScanMode] = useState<'default' | 'priceCheck'>('default');
  const [priceCheckProduct, setPriceCheckProduct] = useState<Product | null>(null);
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  
  // System Restore Input Ref
  const restoreFileRef = useRef<HTMLInputElement>(null);

  // Slow Movers Data Logic
  const rawBranchItems = branchData[currentBranch] || [];
  const { buckets } = useSlowMoverInsights(rawBranchItems);
  const slowMoverIds = useMemo(() => {
    const allSlow = [
      ...buckets.threeMonths, 
      ...buckets.sixMonths, 
      ...buckets.nineMonths, 
      ...buckets.deadStock
    ];
    return new Set(allSlow.map(x => x.product.id));
  }, [buckets]);

  // Notification Audio Logic
  const prevMsgCount = useRef(branchData.messages.length);
  const prevTrfCount = useRef(branchData.transfers.length);

  const playNotification = (type: 'message' | 'transfer') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'message') {
        // High pitched "Ding"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // Double tone "Da-ding" for transfer
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    // 1. New Messages
    if (branchData.messages.length > prevMsgCount.current) {
        const diff = branchData.messages.length - prevMsgCount.current;
        let played = false;
        // Check the last 'diff' messages
        for (let i = 0; i < diff; i++) {
            const msg = branchData.messages[branchData.messages.length - 1 - i];
            if (msg.sender !== currentBranch && !isMuted) {
                if (!played) {
                  playNotification('message');
                  played = true;
                }
            }
        }
        prevMsgCount.current = branchData.messages.length;
    } else if (branchData.messages.length < prevMsgCount.current) {
        // Handle data reset/import
        prevMsgCount.current = branchData.messages.length;
    }

    // 2. New Transfers (only count unresolved ones)
    const unresolvedTransfers = branchData.transfers.filter(t => !t.resolvedAt);
    if (unresolvedTransfers.length > prevTrfCount.current) {
        const diff = unresolvedTransfers.length - prevTrfCount.current;
        let played = false;
        for (let i = 0; i < diff; i++) {
            const trf = unresolvedTransfers[unresolvedTransfers.length - 1 - i];
            // If I am the target
            if (trf.targetBranch === currentBranch && !isMuted) {
                if (!played) {
                  playNotification('transfer');
                  played = true;
                }
            }
        }
        prevTrfCount.current = unresolvedTransfers.length;
    } else if (unresolvedTransfers.length < prevTrfCount.current) {
        prevTrfCount.current = unresolvedTransfers.length;
    }
  }, [branchData.messages, branchData.transfers, currentBranch, isMuted]);

  const tagMenuRef = useRef<HTMLDivElement>(null);
  const supplierMenuRef = useRef<HTMLDivElement>(null);

  const updateManualQty = (id: string, qty: number) => {
    setManualRestockQtys(prev => ({ ...prev, [id]: qty }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tagMenuRef.current && !tagMenuRef.current.contains(target)) setIsTagMenuOpen(false);
      if (supplierMenuRef.current && !supplierMenuRef.current.contains(target)) setIsSupplierMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dev mode: expose price sync reset verification on window
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__verifyPriceSyncReset = () => verifyPriceSyncReset(branchData, currentBranch);
    }
    return () => { if (import.meta.env.DEV) delete (window as any).__verifyPriceSyncReset; };
  }, [branchData, currentBranch]);

  const baseItems = useMemo(() => {
    const items = rawBranchItems;
    const now = new Date();
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const activeOrders = branchData[orderKey] || [];

    return items.filter(i => {
      if (mainView === 'inventory' || mainView === 'performance' || mainView === 'planogram' || mainView === 'shared-stock') { if (i.isArchived || i.deletedAt) return false; }
      else if (mainView === 'archive') { if (!i.isArchived || i.deletedAt) return false; }
      else if (mainView === 'bin') { if (!i.deletedAt) return false; }

      if (mainView === 'inventory' || mainView === 'archive') {
        if (subFilter === 'restock') {
          const isBelowThreshold = i.stockInHand <= (i.stockToKeep * 0.25);
          const hasSmartAlert = !!i.enableThresholdAlert;
          if (i.isDiscontinued) return false;
          const isOnOrder = activeOrders.some(o => o.productId === i.id && (o.status === 'pending' || o.status === 'ordered' || o.status === 'backorder'));
          if (isOnOrder) return false;
          if (!(hasSmartAlert && isBelowThreshold)) return false;
        } else if (subFilter === 'ordered') {
          const hasOrder = activeOrders.some(o => o.productId === i.id && (o.status === 'pending' || o.status === 'ordered' || o.status === 'backorder'));
          if (!hasOrder) return false;
        } else if (subFilter === 'expiring') {
          if (!i.expiryDate) return false;
          const exp = new Date(i.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
          if (diffDays > 90 || diffDays <= 0) return false;
        } else if (subFilter === 'clearance') {
          if (!i.isReducedToClear) return false;
        } else if (subFilter === 'alerts') {
          if (!pricingLogic.alerts.some(a => a.barcode === i.barcode)) return false;
        } else if (subFilter === 'labels') {
          if (!i.labelNeedsUpdate) return false;
        } else if (subFilter === 'slow-movers') {
          if (!slowMoverIds.has(i.id)) return false;
        }
      }

      if (stockTypeFilter !== 'all' && (i.stockType || 'retail') !== stockTypeFilter) return false;
      return true;
    });
  }, [branchData, currentBranch, mainView, subFilter, stockTypeFilter, pricingLogic.alerts, slowMoverIds]);

  const { uniqueSuppliers, selectedSupplier, setSelectedSupplier, filteredData: supplierFilteredItems } = useSupplierFilter(baseItems);
  const { activeFilters, toggleFilter, clearFilters, allUniqueTags, filteredData: tagFilteredItems, tagSettings, updateTagSettings } = useInventoryTags(supplierFilteredItems, logic.updateProductItem);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tagFilteredItems.filter(i => {
      const matchSearch = !q || 
        i.name.toLowerCase().includes(q) || 
        (i.barcode && i.barcode.includes(q)) || 
        (i.productCode && i.productCode.includes(q)) ||
        (i.location && i.location.toLowerCase().includes(q));
      return matchSearch;
    });
  }, [tagFilteredItems, searchQuery]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    const { key, direction } = logic.sortConfig;
    if (key) {
      sorted.sort((a: any, b: any) => {
        let valA, valB;
        if (key === 'margin') {
          valA = a.price > 0 ? (a.price - a.costPrice) / a.price : 0;
          valB = b.price > 0 ? (b.price - b.costPrice) / b.price : 0;
        } else if (key === 'restockQty') {
          valA = Math.max(0, a.stockToKeep - a.stockInHand);
          valB = Math.max(0, b.stockToKeep - b.stockInHand);
        } else if (key === 'status') {
          const getStatusWeight = (i: Product) => {
            if (i.isDiscontinued) return 0;
            if (i.stockInHand <= (i.stockToKeep * 0.1)) return 1;
            if (i.stockInHand <= (i.stockToKeep * 0.25)) return 2;
            return 3;
          };
          valA = getStatusWeight(a);
          valB = getStatusWeight(b);
        } else {
          valA = a[key];
          valB = b[key];
        }
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredItems, logic.sortConfig]);

  const liveOrderTotal = useMemo(() => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const activeOrders = branchData[orderKey] || [];

    return sortedItems.reduce((acc, item) => {
      let qty = 0;
      const existingOrder = activeOrders.find(o => o.productId === item.id && ['pending', 'ordered', 'backorder'].includes(o.status));
      
      if (existingOrder) {
        qty = existingOrder.quantity;
      } else if (subFilter === 'restock') {
        if (manualRestockQtys[item.id] !== undefined) {
            qty = manualRestockQtys[item.id];
        } else {
            qty = Math.max(0, item.stockToKeep - item.stockInHand);
        }
      }
      
      return acc + (item.costPrice * qty);
    }, 0);
  }, [sortedItems, branchData, currentBranch, subFilter, manualRestockQtys]);

  const { selectedIds, toggleSelection, toggleAll, clearSelection, isAllSelected, selectionCount } = useSelection(sortedItems);
  
  const sortedRequests = useMemo(() => {
    const key = currentBranch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
    const list = branchData[key] || [];
    const filtered = list.filter(r => isRequestBinView ? !!r.deletedAt : !r.deletedAt);
    if (!requestSortConfig.key) return filtered;
    return [...filtered].sort((a: any, b: any) => {
      const valA = a[requestSortConfig.key!];
      const valB = b[requestSortConfig.key!];
      if (valA < valB) return requestSortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return requestSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [branchData, currentBranch, isRequestBinView, requestSortConfig]);

  const openProductEdit = (item: Product) => {
    logic.setFormData({ 
      ...logic.formData,
      ...item, 
      price: item.price.toFixed(2), 
      costPrice: item.costPrice.toFixed(2), 
      stockToKeep: item.stockToKeep.toString(), 
      stockInHand: item.stockInHand.toString(),
      partPacks: item.partPacks?.toString() || '',
      productCode: item.productCode || '',
      notes: item.notes || '',
      expiryDate: item.expiryDate || '',
      sourceUrls: item.sourceUrls || [],
      isDiscontinued: item.isDiscontinued || false,
      isUnavailable: item.isUnavailable || false,
      isReducedToClear: item.isReducedToClear || false,
      isShared: item.isShared || false,
      isPriceSynced: item.isPriceSynced || false,
      enableThresholdAlert: item.enableThresholdAlert || false,
      tags: item.tags || []
    }); 
    logic.setEditingId(item.id); 
    logic.setIsAdding(true); 
  };

  const openTransferForm = (item: Product) => {
    setSelectedTransferProduct(item);
    setIsTransferFormOpen(true);
  };

  const openHistoryView = (item: Product) => {
    setSelectedHistoryProduct(item);
    setIsHistoryOpen(true);
  };

  const handleDetected = (code: string) => {
    if (scanMode === 'priceCheck') {
        const product = branchData[currentBranch].find(p => p.barcode === code && !p.deletedAt);
        setPriceCheckProduct(product || null);
        setIsPriceCheckerOpen(true);
        setScanMode('default');
    } else if (logic.bulkScanningRowId) {
       logic.updateBulkItem(logic.bulkScanningRowId, { barcode: code });
       logic.setBulkScanningRowId(null);
    } else if (logic.isAdding) {
       logic.setFormData({ ...logic.formData, barcode: code });
    } else {
       logic.setSearchQuery(code);
    }
    logic.setIsVisionScanning(false);
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const spreadsheetItems = await parseInventoryFile(file);
      const results = compareInventory(spreadsheetItems, branchData[currentBranch] || []);
      setPendingImportData(spreadsheetItems);
      setImportResults(results);
      setIsInventoryModalOpen(true);
    } catch (err) {
      console.error("Verification logic failed", err);
      alert("Format error: Ensure your spreadsheet matches the official Greenchem template.");
    }
    e.target.value = '';
  };

  const handleConfirmBulkSync = (ignoredIndices: Set<number>) => {
    const dataToSync = pendingImportData.filter((_, idx) => !ignoredIndices.has(idx));
    syncImportedData(dataToSync);
    setIsInventoryModalOpen(false);
    setPendingImportData([]);
    setImportResults([]);
  };

  const handleOpenInventoryManagement = () => {
    setImportResults([]); // Clear results so we show the landing dashboard
    setIsInventoryModalOpen(true);
  };

  const onOpenPriceChecker = () => {
    setScanMode('priceCheck');
    logic.setIsVisionScanning(true);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-950 text-slate-100 pb-20 font-sans">
      <header className="border-b sticky top-0 z-40 shadow-sm bg-slate-900 border-slate-800">
        <div className="w-full max-w-[99%] mx-auto px-2 sm:px-4 h-20 flex items-center justify-between gap-4">
          {/* Left: Branding & Branch Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Logo className="h-8 sm:h-14 w-auto" />
            <div className="hidden sm:flex flex-col -ml-1 lg:-ml-2">
              <span className="text-white font-bold text-[9px] lg:text-[10px] uppercase tracking-[0.3em] leading-none">Stock</span>
              <span className="text-emerald-500 font-bold text-[9px] lg:text-[10px] uppercase tracking-[0.3em] leading-none mt-0.5">Manager</span>
            </div>
            
            <BranchSelector />
          </div>

          {/* Center: New Global Search & Notifications */}
          <div className="flex-1 flex items-center justify-center gap-4 max-w-2xl px-4">
              <HeaderGlobalSearch 
                searchQuery={logic.searchQuery}
                onSearchChange={logic.setSearchQuery}
                onOpenPriceChecker={onOpenPriceChecker}
                products={branchData[currentBranch] || []}
                onProductSelect={(product) => openProductEdit(product)}
                onNavigate={(view) => {
                  if (view === 'master-inventory') {
                      logic.setIsMasterCatalogueOpen(true);
                  } else if (view === 'reconciliation') {
                      setIsReconciliationOpen(true);
                  } else {
                      logic.setMainView(view);
                      if (view === 'inventory') logic.setSubFilter('all');
                  }
                }}
              />

              <HeaderNotificationBar
                branchData={branchData}
                currentBranch={currentBranch}
                syncStatus={logic.syncStatus}
              />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button 
              onClick={() => setIsTransferInboxOpen(true)} 
              className="relative p-1.5 sm:p-2.5 rounded-xl border transition-colors border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 shadow-lg shadow-amber-900/20"
            >
              <ArrowRightLeft size={18} />
              {branchData.transfers.filter(t => 
                !t.resolvedAt && (
                  (t.targetBranch === currentBranch && t.status === 'pending') || 
                  (t.sourceBranch === currentBranch && t.status === 'confirmed' && t.type === 'request')
                )
              ).length > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-900" />}
            </button>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="relative p-1.5 sm:p-2.5 rounded-xl border transition-colors border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 shadow-lg shadow-indigo-900/20"
            >
              <MessageSquare size={18} />
              {branchData.messages.filter(m => m.sender !== currentBranch && !m.isRead).length > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-900" />}
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-1.5 sm:p-2.5 rounded-xl border transition-all ${
                isMuted 
                  ? 'border-slate-800 bg-slate-900 text-slate-500 hover:bg-slate-800' 
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-900/20'
              }`}
              title={isMuted ? "Enable Audio Notifications" : "Mute Notifications"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="p-1.5 sm:p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors shadow-lg shadow-amber-900/20"
                title="Manage Users"
              >
                <Users size={18} />
              </button>
            )}
            <button
              onClick={signOut}
              className="p-1.5 sm:p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[99%] mx-auto p-2 sm:p-4 md:p-6 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
           <div className="flex p-1 rounded-2xl transition-colors bg-slate-900 overflow-x-auto max-w-full">
             <button onClick={() => { logic.setMainView('inventory'); logic.setSubFilter('all'); }} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'inventory' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><LayoutDashboard size={14} /> Inventory</button>
             <button onClick={() => logic.setMainView('shared-stock')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'shared-stock' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><Handshake size={14} /> Shared Stock</button>
             <button onClick={() => logic.setMainView('requests')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'requests' ? 'bg-rose-700 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><ClipboardList size={14} /> Requests</button>
             <button onClick={() => logic.setMainView('planogram')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'planogram' ? 'bg-violet-700 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><Layers size={14} /> Planogram</button>
             <button onClick={() => logic.setMainView('performance')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${mainView === 'performance' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><BarChart3 size={14} /> Performance</button>
           </div>
           
           {(mainView === 'inventory' || mainView === 'archive' || mainView === 'bin') && (
             <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-300">
               {mainView === 'inventory' && (
                 <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 mr-2 shadow-sm">
                    <button 
                      onClick={() => logic.setIsBulkOpen(true)} 
                      className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white hover:bg-blue-600 group"
                    >
                      <Layers size={16} className="text-blue-500 group-hover:text-white transition-colors" /> 
                      <span>Bulk Add</span>
                    </button>
                    <div className="hidden sm:block w-px bg-slate-800 my-2" />
                    <button 
                      onClick={() => { logic.resetForm(); logic.setIsAdding(true); }} 
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white hover:bg-emerald-600 group"
                    >
                      <Plus size={16} className="text-emerald-500 group-hover:text-white transition-colors" /> 
                      <span>Add Item</span>
                    </button>
                 </div>
               )}

               <div className="relative">
                  <button onClick={() => logic.setIsManageDataOpen(!isManageDataOpen)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 transition-all border ${isManageDataOpen ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-black text-white border-black hover:bg-slate-950'}`}><Database size={16} /> Inventory Management <ChevronDown size={14} className={`transition-transform duration-300 ${isManageDataOpen ? 'rotate-180' : ''}`} /></button>
                  <ManageDataDropdown 
                    isOpen={isManageDataOpen} 
                    onClose={() => logic.setIsManageDataOpen(false)} 
                    theme={theme} 
                    onExportExcel={logic.exportToExcel} 
                    onImportExcel={() => importFileRef.current?.click()} 
                    onDownloadTemplate={generateTemplate} 
                    onViewArchive={() => logic.setMainView('archive')} 
                    onViewBin={() => logic.setMainView('bin')} 
                    onSystemBackup={logic.exportToJson} 
                    onSystemRestore={() => restoreFileRef.current?.click()} 
                    onClearData={logic.clearAllData} 
                    onViewMaster={() => logic.setIsMasterCatalogueOpen(true)} 
                    onViewReconciliation={() => setIsReconciliationOpen(true)} 
                    onOpenManagement={handleOpenInventoryManagement}
                    onFindDuplicates={() => setIsLocalDuplicatesOpen(true)} 
                  />
               </div>
             </div>
           )}
        </div>

        <MainViewRouter 
          mainView={mainView}
          logic={logic}
          branchData={branchData}
          currentBranch={currentBranch}
          setBranchData={setBranchData}
          pricingLogic={pricingLogic}
          planogramLogic={planogramLogic}
          noteLogic={noteLogic}
          sortedItems={sortedItems}
          sortedRequests={sortedRequests}
          liveOrderTotal={liveOrderTotal}
          manualRestockQtys={manualRestockQtys}
          updateManualQty={updateManualQty}
          requestSortConfig={requestSortConfig}
          setRequestSortConfig={setRequestSortConfig}
          isRequestBinView={isRequestBinView}
          setIsRequestBinView={setIsRequestBinView}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          toggleAll={toggleAll}
          isAllSelected={isAllSelected}
          uniqueSuppliers={uniqueSuppliers}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
          clearFilters={clearFilters}
          allUniqueTags={allUniqueTags}
          tagSettings={tagSettings}
          openProductEdit={openProductEdit}
          openTransferForm={openTransferForm}
          openHistoryView={openHistoryView}
          setPreviewImage={(img) => setPreviewImage(img)}
          theme={theme}
          isTagMenuOpen={isTagMenuOpen}
          setIsTagMenuOpen={setIsTagMenuOpen}
          isSupplierMenuOpen={isSupplierMenuOpen}
          setIsSupplierMenuOpen={setIsSupplierMenuOpen}
          tagMenuRef={tagMenuRef}
          supplierMenuRef={supplierMenuRef}
          onOpenPriceChecker={onOpenPriceChecker}
          columns={columns}
          toggleColumn={toggleColumn}
          onOpenReconciliation={() => setIsReconciliationOpen(true)}
          onOpenDuplicates={() => setIsLocalDuplicatesOpen(true)}
        />
      </main>

      <BulkActionToolbar 
        count={selectionCount} 
        onClear={clearSelection}
        onAdjustPrice={(adjustment) => { logic.bulkAdjustPrices(selectedIds, adjustment); clearSelection(); }}
        onReceive={() => { logic.bulkReceiveStock(selectedIds); clearSelection(); }}
        onUpdateIntelligence={(updates) => { logic.bulkUpdateSmartToggles(selectedIds, updates); clearSelection(); }}
        onArchive={() => { 
          if (mainView === 'bin') {
            logic.bulkRestoreProducts(selectedIds);
          } else {
            logic.bulkArchiveProducts(selectedIds);
          }
          clearSelection(); 
        }}
        onDelete={() => { logic.bulkDeleteProducts(selectedIds, mainView === 'bin'); clearSelection(); }}
        isArchiveView={mainView === 'archive'}
        isBinView={mainView === 'bin'}
      />

      <ModalManager
        logic={logic}
        branchData={branchData}
        setBranchData={setBranchData}
        currentBranch={currentBranch}
        theme={theme}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isTransferInboxOpen={isTransferInboxOpen}
        setIsTransferInboxOpen={setIsTransferInboxOpen}
        isTransferFormOpen={isTransferFormOpen}
        setIsTransferFormOpen={setIsTransferFormOpen}
        selectedTransferProduct={selectedTransferProduct}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        selectedHistoryProduct={selectedHistoryProduct}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        isReconciliationOpen={isReconciliationOpen}
        setIsReconciliationOpen={setIsReconciliationOpen}
        tagSettings={tagSettings}
        updateTagSettings={updateTagSettings}
        allUniqueTags={allUniqueTags}
        onScanDetected={handleDetected}
      />

      <InventoryManagement 
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        onConfirm={handleConfirmBulkSync}
        results={importResults}
        onExportExcel={logic.exportToExcel}
        onDownloadTemplate={generateTemplate}
        onTriggerImport={() => importFileRef.current?.click()}
      />

      <LocalDuplicatesModal
        isOpen={isLocalDuplicatesOpen}
        onClose={() => setIsLocalDuplicatesOpen(false)}
        inventory={branchData[currentBranch] || []}
        onDelete={(id) => logic.handleDeleteProduct(id, false)}
        theme={theme}
      />

      <PriceCheckerModal 
        isOpen={isPriceCheckerOpen}
        onClose={() => setIsPriceCheckerOpen(false)}
        product={priceCheckProduct}
      />

      <input 
        type="file" 
        ref={importFileRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={handleImportFileSelect}
      />
      
      <input 
        type="file" 
        ref={restoreFileRef}
        className="hidden"
        accept=".json"
        onChange={logic.importData}
      />

      <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
    </div>
  );
}
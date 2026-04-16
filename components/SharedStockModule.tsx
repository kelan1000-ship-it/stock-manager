import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import * as XLSX from 'xlsx';
import { Handshake, Package, ShoppingCart, RefreshCw, Download, ChevronLeft, ChevronRight, FileSpreadsheet, Send, X, Barcode, Hash, RotateCcw, Pencil, Copy, Check, CheckSquare, Square } from 'lucide-react';
import { ProductThumbnail } from './ImageComponents';
import { LiveVisionScanner } from './BarcodeScanner';
import { BranchData, BranchKey, Product, JointOrder, OrderItem } from '../types';
import { useSharedStock } from '../hooks/useSharedStock';
import { SharedStockFilters } from './SharedStockFilters';
import { SharedInventoryTable } from './SharedInventoryTable';
import { JointOrderPanel } from './JointOrderPanel';
import { BulkActionToolbar } from './BulkActionToolbar';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { TagStyle } from '../hooks/useInventoryTags';
import { useProductNotes } from '../hooks/useProductNotes';
import { useSelection } from '../hooks/useSelection';
import { matchesAnySearchField } from '../utils/stringUtils';
import { CopyableText, SortHeader } from './SharedUI';
import { findMatchByKey, getProductMatchKey } from '../utils/productMatching';
import { TooltipIconButton } from './ManagerComponents';

const InlinePriceEditor: React.FC<{
  product: Product;
  onUpdateSharedValues: (barcode: string, field: 'price' | 'costPrice', value: number, productCode?: string) => void;
}> = ({ product, onUpdateSharedValues }) => {
  const [rrp, setRrp] = useState(product.price.toFixed(2));
  const [cost, setCost] = useState(product.costPrice.toFixed(2));
  useEffect(() => { setRrp(product.price.toFixed(2)); }, [product.price]);
  useEffect(() => { setCost(product.costPrice.toFixed(2)); }, [product.costPrice]);

  const handleRrpBlur = () => {
    const val = parseFloat(rrp);
    if (!isNaN(val) && Math.abs(val - product.price) > 0.001)
      onUpdateSharedValues(product.barcode, 'price', val, product.productCode);
    else setRrp(product.price.toFixed(2));
  };
  const handleCostBlur = () => {
    const val = parseFloat(cost);
    if (!isNaN(val) && Math.abs(val - product.costPrice) > 0.001)
      onUpdateSharedValues(product.barcode, 'costPrice', val, product.productCode);
    else setCost(product.costPrice.toFixed(2));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-transparent hover:bg-slate-800/30 focus-within:bg-slate-900 focus-within:border-emerald-500/30 transition-all">
        <span className="text-sm font-black text-emerald-600">£</span>
        <input type="number" step="0.01" value={rrp}
          onChange={(e) => setRrp(e.target.value)}
          onBlur={handleRrpBlur}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-20 bg-transparent text-xl font-black text-emerald-500 text-center outline-none" />
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl border border-transparent hover:bg-slate-800/30 focus-within:bg-slate-900 focus-within:border-indigo-500/30 transition-all">
        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Cost</span>
        <span className="text-[10px] text-slate-600">£</span>
        <input type="number" step="0.01" value={cost}
          onChange={(e) => setCost(e.target.value)}
          onBlur={handleCostBlur}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-16 bg-transparent text-xs font-bold text-slate-500 text-center outline-none" />
      </div>
    </div>
  );
};

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
  const [activeTab, setActiveTab] = useState<'inventory' | 'restock' | 'orders'>('inventory');
  const [restockDrafts, setRestockDrafts] = useState<Record<string, { bywood: number; broom: number }>>({});
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'show' | 'hide'>('show');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [supplierFilterMode, setSupplierFilterMode] = useState<'show' | 'hide'>('show');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationFilterMode, setLocationFilterMode] = useState<'show' | 'hide'>('show');
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([{ key: 'name', direction: 'asc' }]);
  const [restockSortConfig, setRestockSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([{ key: 'name', direction: 'asc' }]);
  const [orderedSortConfig, setOrderedSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([{ key: 'name', direction: 'asc' }]);
  const [showSuggestedOrder, setShowSuggestedOrder] = useState(false);
  const [showReadyForOrder, setShowReadyForOrder] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const toggleSupplierFilter = (supplier: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplier) ? prev.filter(s => s !== supplier) : [...prev, supplier]
    );
  };

  const clearSupplierFilters = () => setSelectedSuppliers([]);

  const toggleSupplierFilterMode = () => {
    setSupplierFilterMode(prev => prev === 'show' ? 'hide' : 'show');
  };

  const toggleLocationFilter = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
    );
  };

  const clearLocationFilters = () => setSelectedLocations([]);

  const toggleLocationFilterMode = () => {
    setLocationFilterMode(prev => prev === 'show' ? 'hide' : 'show');
  };

  const toggleTagFilterMode = () => {
    setTagFilterMode(prev => prev === 'show' ? 'hide' : 'show');
  };

  const noteLogic = useProductNotes();

  // Reset to first page when filters, tabs, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, tagFilterMode, selectedSuppliers, supplierFilterMode, selectedLocations, locationFilterMode, activeTab, sortConfig, showSuggestedOrder, showReadyForOrder]);

  const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

  const handleSort = (key: string, multi: boolean) => {
    setSortConfig(prev => {
      const existing = prev.findIndex(c => c.key === key);
      if (multi) {
        if (existing !== -1) {
          if (prev[existing].direction === 'asc') {
            return prev.map((c, i) => i === existing ? { ...c, direction: 'desc' as const } : c);
          } else {
            return prev.filter((_, i) => i !== existing);
          }
        }
        return [...prev, { key, direction: 'asc' as const }];
      }
      if (existing !== -1 && prev.length === 1) {
        return [{ key, direction: prev[existing].direction === 'asc' ? 'desc' as const : 'asc' as const }];
      }
      return [{ key, direction: 'asc' as const }];
    });
  };

  const handleRestockSort = (key: string, multi: boolean) => {
    setRestockSortConfig(prev => {
      const existing = prev.findIndex(c => c.key === key);
      if (multi) {
        if (existing !== -1) {
          if (prev[existing].direction === 'asc') {
            return prev.map((c, i) => i === existing ? { ...c, direction: 'desc' as const } : c);
          } else {
            return prev.filter((_, i) => i !== existing);
          }
        }
        return [...prev, { key, direction: 'asc' as const }];
      }
      if (existing !== -1 && prev.length === 1) {
        return [{ key, direction: prev[existing].direction === 'asc' ? 'desc' as const : 'asc' as const }];
      }
      return [{ key, direction: 'asc' as const }];
    });
  };

  const handleOrderedSort = (key: string, multi: boolean) => {
    setOrderedSortConfig(prev => {
      const existing = prev.findIndex(c => c.key === key);
      if (multi) {
        if (existing !== -1) {
          if (prev[existing].direction === 'asc') {
            return prev.map((c, i) => i === existing ? { ...c, direction: 'desc' as const } : c);
          } else {
            return prev.filter((_, i) => i !== existing);
          }
        }
        return [...prev, { key, direction: 'asc' as const }];
      }
      if (existing !== -1 && prev.length === 1) {
        return [{ key, direction: prev[existing].direction === 'asc' ? 'desc' as const : 'asc' as const }];
      }
      return [{ key, direction: 'asc' as const }];
    });
  };

  const localItems = useSelector((state: any) => 
    (currentBranch === 'bywood' ? state.stock.bywood : state.stock.broom) || []
  );
  const otherItems: Product[] = branchData[otherBranch] || [];
  const jointOrders: JointOrder[] = branchData.jointOrders || [];
  const branchOrders: OrderItem[] = (branchData as any)[`${currentBranch}Orders`] || [];

  const {
    orderDrafts,
    orderConfirmations,
    allocationDrafts,
    liveOrderTotal,
    handleOrderDraftChange,
    saveDraftOnBlur,
    toggleConfirmation,
    handlePlaceJointOrder,
    updateSharedValues,
    handleUpdateTarget,
    handleUpdateLooseTarget,
    handleUpdateStock,
    handleAllocationChange,
    confirmAllocation,
    clearAllDrafts
  } = useSharedStock(branchData, currentBranch, logic, localItems);

  // Filter for shared items only
  const sharedInventory = useMemo(() => {
    let result = localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived)
      .filter(p => matchesAnySearchField([p.name, p.subheader, p.barcode, p.packSize, p.productCode, p.location, ...(p.keywords || [])], searchQuery));
    
    if (selectedTags.length > 0) {
      if (tagFilterMode === 'show') {
        result = result.filter(p => selectedTags.every(tag => p.tags && p.tags.includes(tag)));
      } else {
        result = result.filter(p => !selectedTags.some(tag => p.tags && p.tags.includes(tag)));
      }
    }
    
    if (selectedSuppliers.length > 0) {
      if (supplierFilterMode === 'show') {
        result = result.filter(p => selectedSuppliers.some(sel => sel.toLowerCase() === (p.supplier || 'no set supplier').toLowerCase()));
      } else {
        result = result.filter(p => !selectedSuppliers.some(sel => sel.toLowerCase() === (p.supplier || 'no set supplier').toLowerCase()));
      }
    }

    if (selectedLocations.length > 0) {
      if (locationFilterMode === 'show') {
        result = result.filter(p => selectedLocations.includes(p.location || ''));
      } else {
        result = result.filter(p => !selectedLocations.includes(p.location || ''));
      }
    }

    if (showSuggestedOrder) {
      const branchAllocKey = currentBranch === 'bywood' ? 'allocationBywood' : 'allocationBroom';
      result = result.filter(p => {
        const isOnOrder = branchOrders.some(o => o.productId === p.id && (o.status === 'ordered' || o.status === 'backorder'));
        if (isOnOrder || p.isExcessStock) return false;
        const target = p.stockToKeep || 0;
        const stock = p.stockInHand || 0;
        const deficit = Math.max(0, target - stock);
        const itemKey = getProductMatchKey(p);
        const pending = itemKey ? jointOrders
          .filter(o => (o.status === 'restock' || o.status === 'pending_allocation') && getProductMatchKey(o) === itemKey)
          .reduce((sum: number, o: any) => sum + (o[branchAllocKey] || 0), 0) : 0;
        return Math.max(0, deficit - pending) > 0;
      });
    }

    if (showReadyForOrder) {
      result = result.filter(p => {
        const draft = orderDrafts[p.id];
        return draft && (draft.bywood > 0 || draft.broom > 0);
      });
    }

    // Apply Sorting
    if (sortConfig.length > 0) {
      result.sort((a: any, b: any) => {
        for (const { key, direction } of sortConfig) {
          let valA, valB;

          if (key === 'localStock') {
            valA = a.stockInHand;
            valB = b.stockInHand;
          } else if (key === 'partnerStock') {
            const matchA = findMatchByKey(otherItems, a);
            const matchB = findMatchByKey(otherItems, b);
            valA = matchA?.stockInHand || 0;
            valB = matchB?.stockInHand || 0;
          } else if (key === 'networkHealth') {
            const matchA = findMatchByKey(otherItems, a);
            const matchB = findMatchByKey(otherItems, b);
            valA = a.stockInHand + (matchA?.stockInHand || 0);
            valB = b.stockInHand + (matchB?.stockInHand || 0);
          } else if (key === 'suggestedOrder') {
            const branchAllocKey = currentBranch === 'bywood' ? 'allocationBywood' : 'allocationBroom';
            const isOnOrderA = branchOrders.some(o => o.productId === a.id && (o.status === 'ordered' || o.status === 'backorder'));
            const isOnOrderB = branchOrders.some(o => o.productId === b.id && (o.status === 'ordered' || o.status === 'backorder'));
            if (isOnOrderA || a.isExcessStock) { valA = 0; } else {
              const keyA = getProductMatchKey(a);
              const pendingA = keyA ? jointOrders
                .filter(o => (o.status === 'restock' || o.status === 'pending_allocation') && getProductMatchKey(o) === keyA)
                .reduce((sum: number, o: any) => sum + (o[branchAllocKey] || 0), 0) : 0;
              valA = Math.max(0, Math.max(0, (a.stockToKeep || 0) - (a.stockInHand || 0)) - pendingA);
            }
            if (isOnOrderB || b.isExcessStock) { valB = 0; } else {
              const keyB = getProductMatchKey(b);
              const pendingB = keyB ? jointOrders
                .filter(o => (o.status === 'restock' || o.status === 'pending_allocation') && getProductMatchKey(o) === keyB)
                .reduce((sum: number, o: any) => sum + (o[branchAllocKey] || 0), 0) : 0;
              valB = Math.max(0, Math.max(0, (b.stockToKeep || 0) - (b.stockInHand || 0)) - pendingB);
            }
          } else {
            valA = a[key] || '';
            valB = b[key] || '';
          }

          if (typeof valA === 'string' && typeof valB === 'string') {
            const comp = valA.localeCompare(valB);
            if (comp !== 0) return direction === 'asc' ? comp : -comp;
            continue;
          }

          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [localItems, otherItems, searchQuery, selectedTags, tagFilterMode, selectedSuppliers, supplierFilterMode, selectedLocations, locationFilterMode, sortConfig, jointOrders, currentBranch, showSuggestedOrder, showReadyForOrder, branchOrders, orderDrafts]);

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
      suppliers.add(p.supplier || 'no set supplier');
    });
    return Array.from(suppliers).sort();
  }, [localItems]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived && p.location).forEach(p => {
      locations.add(p.location as string);
    });
    return Array.from(locations).sort();
  }, [localItems]);

  const restockItems = useMemo(() => {
    const filtered = jointOrders
      .filter(o => o.status === 'restock')
      .filter(o => {
        const sharedMatch = findMatchByKey(localItems.filter(p => !p.isArchived && p.isShared), o);
        const anyMatch = findMatchByKey(localItems.filter(p => !p.isArchived), o);
        const originalProduct = sharedMatch || anyMatch;
        const matchesSearch = matchesAnySearchField([o.name, o.barcode, o.packSize, originalProduct?.productCode || o.productCode || ''], searchQuery);
        if (!matchesSearch) return false;
        if (!originalProduct) return true;
        let matchesSupplier = true;
        if (selectedSuppliers.length > 0) {
          const s = (originalProduct.supplier || 'no set supplier').toLowerCase();
          matchesSupplier = supplierFilterMode === 'show'
            ? selectedSuppliers.some(sel => sel.toLowerCase() === s)
            : !selectedSuppliers.some(sel => sel.toLowerCase() === s);
        }
        let matchesTags = true;
        if (selectedTags.length > 0) {
          matchesTags = tagFilterMode === 'show'
            ? selectedTags.every(tag => originalProduct.tags && originalProduct.tags.includes(tag))
            : !selectedTags.some(tag => originalProduct.tags && originalProduct.tags.includes(tag));
        }
        return matchesSupplier && matchesTags;
      });

    if (restockSortConfig.length > 0) {
      filtered.sort((a: any, b: any) => {
        for (const { key, direction } of restockSortConfig) {
          let aVal: any, bVal: any;
          if (key === 'name') {
            aVal = (a.name || '').toLowerCase();
            bVal = (b.name || '').toLowerCase();
          } else if (key === 'price') {
            const aProduct = findMatchByKey(localItems, a, { skipDeleted: false });
            const bProduct = findMatchByKey(localItems, b, { skipDeleted: false });
            aVal = aProduct?.price || 0;
            bVal = bProduct?.price || 0;
          } else if (key === 'date') {
            aVal = a.timestamp || '';
            bVal = b.timestamp || '';
          } else if (key === 'requestedBy') {
            aVal = (a.restockRequestedBy || []).join(',');
            bVal = (b.restockRequestedBy || []).join(',');
          } else {
            aVal = a[key] || '';
            bVal = b[key] || '';
          }
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [jointOrders, searchQuery, selectedSuppliers, supplierFilterMode, selectedTags, tagFilterMode, localItems, restockSortConfig]);

  const activeJointOrders = useMemo(() => {
    const filtered = jointOrders
      .filter(o => o.status === 'pending_allocation')
      .filter(o => {
        const sharedMatch = findMatchByKey(localItems.filter(p => !p.isArchived && p.isShared), o);
        const anyMatch = findMatchByKey(localItems.filter(p => !p.isArchived), o);
        const originalProduct = sharedMatch || anyMatch;
        const matchesSearch = matchesAnySearchField([o.name, o.barcode, o.packSize, originalProduct?.productCode || o.productCode || ''], searchQuery);
        if (!matchesSearch) return false;
        if (!originalProduct) return true;

        let matchesSupplier = true;
        if (selectedSuppliers.length > 0) {
          const s = (originalProduct.supplier || 'no set supplier').toLowerCase();
          if (supplierFilterMode === 'show') {
            matchesSupplier = selectedSuppliers.some(sel => sel.toLowerCase() === s);
          } else {
            matchesSupplier = !selectedSuppliers.some(sel => sel.toLowerCase() === s);
          }
        }

        let matchesTags = true;
        if (selectedTags.length > 0) {
          if (tagFilterMode === 'show') {
            matchesTags = selectedTags.every(tag => originalProduct.tags && originalProduct.tags.includes(tag));
          } else {
            matchesTags = !selectedTags.some(tag => originalProduct.tags && originalProduct.tags.includes(tag));
          }
        }

        return matchesSupplier && matchesTags;
      });

    if (orderedSortConfig.length > 0) {
      filtered.sort((a: any, b: any) => {
        for (const { key, direction } of orderedSortConfig) {
          let aVal: any, bVal: any;
          if (key === 'name') {
            aVal = (a.name || '').toLowerCase();
            bVal = (b.name || '').toLowerCase();
          } else if (key === 'price') {
            const aProduct = findMatchByKey(localItems, a, { skipDeleted: false });
            const bProduct = findMatchByKey(localItems, b, { skipDeleted: false });
            aVal = aProduct?.price || 0;
            bVal = bProduct?.price || 0;
          } else if (key === 'date') {
            aVal = a.timestamp || '';
            bVal = b.timestamp || '';
          } else {
            aVal = a[key] || '';
            bVal = b[key] || '';
          }
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [jointOrders, searchQuery, selectedSuppliers, supplierFilterMode, selectedTags, tagFilterMode, localItems, orderedSortConfig]);

  // Calculate Ordered Total for the History tab
  const orderedTotal = useMemo(() => {
    return activeJointOrders.reduce((acc, order) => {
      const product = localItems.find(p => p.id === order.productId) || findMatchByKey(localItems, order, { skipDeleted: false });
      return acc + ((product?.costPrice || 0) * order.totalQuantity);
    }, 0);
  }, [activeJointOrders, localItems]);

  const restockTotal = useMemo(() => {
    return restockItems.reduce((acc, order) => {
      const product = localItems.find(p => p.id === order.productId) || findMatchByKey(localItems, order, { skipDeleted: false });
      const draft = restockDrafts[order.id] || { bywood: order.allocationBywood || 0, broom: order.allocationBroom || 0 };
      const qty = draft.bywood + draft.broom;
      return acc + ((product?.costPrice || 0) * qty);
    }, 0);
  }, [restockItems, localItems, restockDrafts]);

  const suggestedOrderTotal = useMemo(() => {
    if (activeTab !== 'inventory') return 0;
    const branchAllocKey = currentBranch === 'bywood' ? 'allocationBywood' : 'allocationBroom';
    return sharedInventory.reduce((acc, p) => {
      const isOnOrder = branchOrders.some(o => o.productId === p.id && (o.status === 'ordered' || o.status === 'backorder'));
      if (isOnOrder || p.isExcessStock) return acc;
      
      const key = getProductMatchKey(p);
      const pending = key ? jointOrders
        .filter(o => (o.status === 'restock' || o.status === 'pending_allocation') && getProductMatchKey(o) === key)
        .reduce((sum: number, o: any) => sum + (o[branchAllocKey] || 0), 0) : 0;
      
      const suggestedQty = Math.max(0, Math.max(0, (p.stockToKeep || 0) - (p.stockInHand || 0)) - pending);
      return acc + (suggestedQty * (p.costPrice || 0));
    }, 0);
  }, [sharedInventory, activeTab, branchOrders, jointOrders, currentBranch]);

  const readyForOrderCount = useMemo(() => {
    return localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived).filter(p => {
      const draft = orderDrafts[p.id];
      return draft && (draft.bywood > 0 || draft.broom > 0);
    }).length;
  }, [localItems, orderDrafts]);

  const suggestedOrderCount = useMemo(() => {
    const branchAllocKey = currentBranch === 'bywood' ? 'allocationBywood' : 'allocationBroom';
    return localItems.filter(p => p.isShared && !p.deletedAt && !p.isArchived).filter(p => {
      const isOnOrder = branchOrders.some(o => o.productId === p.id && (o.status === 'ordered' || o.status === 'backorder'));
      if (isOnOrder || p.isExcessStock) return false;
      const target = p.stockToKeep || 0;
      const stock = p.stockInHand || 0;
      const deficit = Math.max(0, target - stock);
      const itemKey = getProductMatchKey(p);
      const pending = itemKey ? jointOrders
        .filter(o => (o.status === 'restock' || o.status === 'pending_allocation') && getProductMatchKey(o) === itemKey)
        .reduce((sum: number, o: any) => sum + (o[branchAllocKey] || 0), 0) : 0;
      return Math.max(0, deficit - pending) > 0;
    }).length;
  }, [localItems, branchOrders, jointOrders, currentBranch]);

  const stats = useMemo(() => {
    const totalValue = sharedInventory.reduce((acc, p) => acc + (p.price * p.stockInHand), 0);
    const lowStockCount = sharedInventory.filter(p => p.stockInHand < (p.stockToKeep * 0.50)).length;
    return { totalValue, lowStockCount };
  }, [sharedInventory]);

  const currentList = activeTab === 'inventory' ? sharedInventory : activeTab === 'restock' ? restockItems : activeJointOrders;
  const totalPages = Math.ceil(currentList.length / pageSize);
  const paginatedItems = useMemo(() => {
    return currentList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [currentList, currentPage, pageSize]);

  const { selectedIds, toggleSelection, toggleAll, clearSelection, isAllSelected, selectionCount } = useSelection(currentList);

  // Clear selection when active tab changes
  useEffect(() => {
    clearSelection();
  }, [activeTab, clearSelection]);

  const handleExportSharedInventory = () => {
    const itemsToExport = selectionCount > 0 
        ? sharedInventory.filter(p => selectedIds.has(p.id))
        : sharedInventory;

    if (itemsToExport.length === 0) {
      alert("No shared inventory to export.");
      return;
    }

    const data = itemsToExport.map(product => {
      const otherMatch = findMatchByKey(otherItems, product);
      const localStock = product.stockInHand || 0;
      const partnerStock = otherMatch?.stockInHand || 0;

      return {
        'Product Name': product.name || '',
        'Subheader': product.subheader || '',
        'Barcode': product.barcode || '',
        'PIP': product.productCode || '',
        'Pack Size': product.packSize || '',
        'Supplier': product.supplier || '',
        'Location': product.location || '',
        'Price (£)': product.price || 0,
        'Cost (£)': product.costPrice || 0,
        [`${currentBranch === 'bywood' ? 'Bywood' : 'Broom'} Stock`]: localStock,
        [`${otherBranch === 'bywood' ? 'Bywood' : 'Broom'} Stock`]: partnerStock,
        'Network Total': localStock + partnerStock,
        'Stock to Keep': product.stockToKeep || 0,
        'Loose Units': product.partPacks || 0,
        'Expiry Date': product.expiryDate || '',
        'Notes': product.notes || '',
        'Tags': product.tags?.join(', ') || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shared Stock');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Shared_Stock_Export_${date}.xlsx`);
  };

  const handleExportOrders = () => {
    if (activeJointOrders.length === 0) {
      alert("No active orders to export.");
      return;
    }

    const data = activeJointOrders.map(order => {
      const product = localItems.find(p => p.id === order.productId) || findMatchByKey(localItems, order, { skipDeleted: false });
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

  const handleExportRestock = () => {
    if (restockItems.length === 0) {
      alert("No restock items to export.");
      return;
    }

    const data = restockItems.map(order => {
      const product = findMatchByKey(localItems, order, { skipDeleted: false });
      const otherMatch = findMatchByKey(otherItems, order);
      const draft = restockDrafts[order.id] || { bywood: order.allocationBywood || 0, broom: order.allocationBroom || 0 };

      return {
        'Product Name': order.name || '',
        'Barcode': order.barcode || '',
        'PIP Code': product?.productCode || order.productCode || '',
        'Pack Size': order.packSize || '',
        'Supplier': product?.supplier || '',
        'Price (£)': product?.price || 0,
        'Cost (£)': product?.costPrice || 0,
        'Bywood Stock': currentBranch === 'bywood' ? (product?.stockInHand || 0) : (otherMatch?.stockInHand || 0),
        'Bywood Target': currentBranch === 'bywood' ? (product?.stockToKeep || 0) : (otherMatch?.stockToKeep || 0),
        'Broom Stock': currentBranch === 'broom' ? (product?.stockInHand || 0) : (otherMatch?.stockInHand || 0),
        'Broom Target': currentBranch === 'broom' ? (product?.stockToKeep || 0) : (otherMatch?.stockToKeep || 0),
        'Bywood Order Qty': draft.bywood,
        'Broom Order Qty': draft.broom,
        'Total Order Qty': draft.bywood + draft.broom,
        'Requested By': (order.restockRequestedBy || []).map((b: string) => b === 'bywood' ? 'Bywood' : 'Broom').join(', '),
        'Date': order.timestamp?.split('T')[0] || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Restock');
    XLSX.writeFile(wb, `Restock_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
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
             {activeTab === 'inventory' && (
                <div className="p-4 rounded-3xl bg-amber-900/20 border border-amber-500/30 flex flex-col items-center min-w-[140px] shadow-lg shadow-amber-900/10 transition-all duration-300">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-0.5">Suggested Order Total</span>
                    <span className="text-xl font-black text-white">
                        {`£${suggestedOrderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                </div>
             )}
             
             <div className="p-4 rounded-3xl bg-emerald-900/20 border border-emerald-500/30 flex flex-col items-center min-w-[140px] shadow-lg shadow-emerald-900/10 transition-all duration-300">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-0.5">
                  {activeTab === 'inventory' ? 'Live Order Total' : activeTab === 'restock' ? 'Live Restock Total' : 'Ordered Total'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">
                    {`£${(activeTab === 'inventory' ? liveOrderTotal : activeTab === 'restock' ? restockTotal : orderedTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  {activeTab === 'inventory' && liveOrderTotal > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('Clear all order drafts? This will reset the Live Order Total to £0.00.')) {
                          clearAllDrafts();
                        }
                      }}
                      className="p-1.5 rounded-lg text-emerald-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      data-tooltip="Reset all order drafts"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
             </div>
          </div>
        </div>
        
        <Handshake className="absolute -right-10 -bottom-10 text-indigo-500/5 rotate-12" size={300} />
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col p-2 rounded-[2.5rem] bg-slate-950 border border-slate-800 shadow-2xl gap-2">
         {/* Row 1: Search & Main Filters */}
         <div className="w-full">
           <SharedStockFilters
             isSupplierMenuOpen={isSupplierMenuOpen}
             setIsSupplierMenuOpen={setIsSupplierMenuOpen}
             isTagMenuOpen={isTagMenuOpen}
             setIsTagMenuOpen={setIsTagMenuOpen}
             isLocationMenuOpen={isLocationMenuOpen}
             setIsLocationMenuOpen={setIsLocationMenuOpen}
             selectedSuppliers={selectedSuppliers}
             supplierFilterMode={supplierFilterMode}
             toggleSupplierFilter={toggleSupplierFilter}
             clearSupplierFilters={clearSupplierFilters}
             toggleSupplierFilterMode={toggleSupplierFilterMode}
             selectedLocations={selectedLocations}
             locationFilterMode={locationFilterMode}
             toggleLocationFilter={toggleLocationFilter}
             clearLocationFilters={clearLocationFilters}
             toggleLocationFilterMode={toggleLocationFilterMode}
             selectedTags={selectedTags}
             setSelectedTags={setSelectedTags}
             tagFilterMode={tagFilterMode}
             toggleTagFilterMode={toggleTagFilterMode}
             searchQuery={searchQuery}
             setSearchQuery={setSearchQuery}
             uniqueSuppliers={uniqueSuppliers}
             uniqueLocations={uniqueLocations}
             sharedTags={sharedTags}
             tagSettings={tagSettings}
             onOpenScanner={() => setIsScanning(true)}
           />
         </div>

         {/* Horizontal Divider */}
         <div className="h-px w-full bg-slate-800/40 mx-auto" />

         {/* Row 2: Contextual Controls (Suggested Order, Tab Slider, Export) */}
         <div className="flex items-center justify-between w-full px-2 pb-1">
            <div className="min-w-[150px] flex justify-start">
               {activeTab === 'inventory' && (
                 <>
                   <button
                     onClick={() => {
                       const nextValue = !showSuggestedOrder;
                       setShowSuggestedOrder(nextValue);
                       if (nextValue) setShowReadyForOrder(false);
                     }}
                     className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg ${
                       showSuggestedOrder
                         ? 'bg-amber-600 text-white border-amber-500 shadow-amber-900/30'
                         : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-400 hover:border-amber-500/30'
                     }`}
                     data-tooltip="Show only products with suggested order quantities"
                   >
                     <ShoppingCart size={14} />
                     Suggested Order
                     {suggestedOrderCount > 0 && (
                       <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
                         showSuggestedOrder ? 'bg-amber-500/30 text-white' : 'bg-amber-500/20 text-amber-400'
                       }`}>
                         {suggestedOrderCount}
                       </span>
                     )}
                   </button>
                   <button
                     onClick={() => {
                       const nextValue = !showReadyForOrder;
                       setShowReadyForOrder(nextValue);
                       if (nextValue) setShowSuggestedOrder(false);
                     }}
                     className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg ml-2 ${
                       showReadyForOrder
                         ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30'
                         : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-emerald-400 hover:border-emerald-500/30'
                     }`}
                     data-tooltip="Show products ready for order"
                   >
                     <CheckSquare size={14} />
                     Ready for Order
                     {readyForOrderCount > 0 && (
                       <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
                         showReadyForOrder ? 'bg-emerald-500/30 text-white' : 'bg-emerald-500/20 text-emerald-400'
                       }`}>
                         {readyForOrderCount}
                       </span>
                     )}
                   </button>
                 </>
               )}
            </div>

            <div className="flex-1 flex justify-center">
                <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 shadow-lg">
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <Package size={14} /> Joint Inventory
                    </button>
                    <button
                      onClick={() => setActiveTab('restock')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'restock' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <RefreshCw size={14} /> Restock {restockItems.length > 0 && `(${restockItems.length})`}
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <ShoppingCart size={14} /> Ordered {activeJointOrders.length > 0 && `(${activeJointOrders.length})`}
                    </button>
                </div>
            </div>

            <div className="min-w-[150px] flex justify-end">
               {activeTab === 'inventory' && (
                 <button
                   onClick={handleExportSharedInventory}
                   className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-violet-400 hover:text-white hover:bg-violet-600 transition-all shadow-lg"
                   data-tooltip="Export Shared Inventory to Excel"
                 >
                   <FileSpreadsheet size={20} />
                 </button>
               )}
               {activeTab === 'restock' && restockItems.length > 0 && (
                 <button
                   onClick={handleExportRestock}
                   className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-amber-500 hover:text-white hover:bg-amber-600 transition-all shadow-lg"
                   data-tooltip="Export Restock Items to Excel"
                 >
                   <Download size={20} />
                 </button>
               )}
               {activeTab === 'orders' && (
                 <button
                   onClick={handleExportOrders}
                   className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-500 hover:text-white hover:bg-emerald-600 transition-all shadow-lg"
                   data-tooltip="Export Joint Order to Excel"
                 >
                   <Download size={20} />
                 </button>
               )}
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-6">
        <div className="rounded-[2.5rem] bg-slate-950 border border-slate-800 overflow-hidden shadow-xl min-h-[500px]">
           {activeTab === 'inventory' ? (
                        <SharedInventoryTable
                           inventory={paginatedItems as Product[]}
                           otherItems={otherItems}
                           currentBranch={currentBranch}
                           otherBranch={otherBranch}
                           orderDrafts={orderDrafts}
                           orderConfirmations={orderConfirmations}
                           onUpdateSharedValues={updateSharedValues}
                           onUpdateTarget={handleUpdateTarget}
                           onUpdateLooseTarget={handleUpdateLooseTarget}
                           onUpdateStock={handleUpdateStock}
                           onOrderDraftChange={handleOrderDraftChange}
                           onSaveDraftOnBlur={saveDraftOnBlur}
                           onToggleConfirmation={toggleConfirmation}
                           onPlaceJointOrder={(item: Product) => handlePlaceJointOrder(item)}
                           jointOrders={jointOrders}
                           branchOrders={branchOrders}
                           onOpenEdit={onOpenEdit}
                           onOpenHistory={onOpenHistory}
                           onPreviewImage={onPreviewImage}
                           tagSettings={tagSettings}
                           noteLogic={noteLogic}
                           sortConfig={sortConfig}
                           onSort={handleSort}
                           selectedIds={selectedIds}
                           onToggleSelection={toggleSelection}
                           onToggleAll={toggleAll}
                           isAllSelected={isAllSelected}
                        />
           ) : activeTab === 'restock' ? (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-950 border-b border-slate-800">
                   <tr>
                     <th className="p-4 w-12 border-b border-slate-800">
                       <button onClick={() => toggleAll()} className="text-slate-500 hover:text-emerald-500 transition-colors">
                         {isAllSelected && currentList.length > 0 ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                       </button>
                     </th>
                     <SortHeader label="Product" sortKey="name" config={restockSortConfig} onSort={handleRestockSort} />
                     <SortHeader label="Requested By" sortKey="requestedBy" config={restockSortConfig} onSort={handleRestockSort} align="center" />
                     <SortHeader label="Economics" sortKey="price" config={restockSortConfig} onSort={handleRestockSort} align="center" />
                     <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Order Qty</th>
                     <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(paginatedItems as any[]).length === 0 ? (
                     <tr>
                       <td colSpan={5} className="py-20 text-center opacity-40">
                         <RefreshCw size={48} className="mx-auto mb-4 text-slate-600" />
                         <p className="text-sm font-black uppercase tracking-widest text-slate-500">No items flagged for restock</p>
                         <p className="text-xs text-slate-600 mt-2">Flag items from Joint Inventory to add them here</p>
                       </td>
                     </tr>
                   ) : (paginatedItems as any[]).map((order: any) => {
                     const product = findMatchByKey(localItems, order, { skipDeleted: false });
                     const draft = restockDrafts[order.id] || { bywood: order.allocationBywood || 0, broom: order.allocationBroom || 0 };
                     const total = draft.bywood + draft.broom;

                     return (
                       <tr key={order.id} className={`group hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-0 ${selectedIds.has(order.id) ? 'bg-slate-800/50' : ''}`}>
                         <td className="p-4 align-middle">
                           <button onClick={() => toggleSelection(order.id)} className={`transition-colors ${selectedIds.has(order.id) ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
                             {selectedIds.has(order.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                           </button>
                         </td>
                         <td className="py-4 px-4 align-middle">
                           <div className="flex items-center gap-4">
                             <ProductThumbnail
                               src={product?.productImage || null}
                               alt={order.name}
                               onClick={() => product?.productImage && onPreviewImage && onPreviewImage(product.productImage, order.name)}
                             />
                             <div className="min-w-0">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <h4 className="text-sm font-black text-white capitalize truncate tracking-tight">{order.name}</h4>
                                 <button
                                   onClick={e => { 
                                     e.stopPropagation(); 
                                     navigator.clipboard.writeText(order.name); 
                                     setCopiedId(order.id); 
                                     setTimeout(() => setCopiedId(null), 2000); 
                                   }}
                                   className="shrink-0 opacity-50 hover:opacity-100 hover:text-emerald-400 transition-all cursor-pointer"
                                   data-tooltip="Copy name"
                                 >
                                   {copiedId === order.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
                                 </button>
                               </div>
                               <p className="text-[10px] italic text-slate-500 uppercase tracking-widest mt-0.5">{order.packSize}</p>
                               <div className="flex items-center gap-2 mt-1.5">
                                 {order.barcode && <CopyableText text={order.barcode} label="BAR" icon={<Barcode size={13} />} />}
                                 {product?.productCode && <CopyableText text={product.productCode} label="PIP" icon={<Hash size={13} />} />}
                               </div>
                             </div>
                           </div>
                         </td>
                         <td className="py-4 px-4 align-middle text-center">
                           <div className="flex flex-col items-center gap-1">
                             <div className="flex items-center gap-1.5">
                               {(order.restockRequestedBy || []).map((branch: string) => (
                                 <span key={branch} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-widest border border-amber-500/30">
                                   {branch === 'bywood' ? 'Bywood' : 'Broom'}
                                 </span>
                               ))}
                             </div>
                             <span className="text-[10px] font-mono text-slate-500">{order.timestamp?.split('T')[0]}</span>
                           </div>
                         </td>
                         <td className="py-4 px-4 align-middle text-center">
                           {product && (
                             <InlinePriceEditor product={product} onUpdateSharedValues={updateSharedValues} />
                           )}
                         </td>
                         <td className="py-4 px-4 align-middle">
                           <div className="flex items-center justify-center gap-4">
                             <div className="flex gap-3">
                               <div className="flex flex-col items-center gap-1">
                                 <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Bywood</span>
                                 <input
                                   type="number"
                                   min="0"
                                   value={draft.bywood || ''}
                                   onChange={(e) => setRestockDrafts(prev => ({
                                     ...prev,
                                     [order.id]: { ...draft, bywood: parseInt(e.target.value) || 0 }
                                   }))}
                                   onFocus={(e) => e.target.select()}
                                   className="w-14 h-10 text-center bg-slate-900 border border-slate-700 rounded-lg text-base font-black text-white outline-none focus:border-amber-500 transition-all"
                                   placeholder="0"
                                 />
                               </div>
                               <div className="flex flex-col items-center gap-1">
                                 <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Broom</span>
                                 <input
                                   type="number"
                                   min="0"
                                   value={draft.broom || ''}
                                   onChange={(e) => setRestockDrafts(prev => ({
                                     ...prev,
                                     [order.id]: { ...draft, broom: parseInt(e.target.value) || 0 }
                                   }))}
                                   onFocus={(e) => e.target.select()}
                                   className="w-14 h-10 text-center bg-slate-900 border border-slate-700 rounded-lg text-base font-black text-white outline-none focus:border-amber-500 transition-all"
                                   placeholder="0"
                                 />
                               </div>
                             </div>
                             <div className="flex flex-col items-center">
                               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Total</span>
                               <div className={`w-14 h-10 flex items-center justify-center rounded-xl border-2 text-xl font-black transition-all ${total > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                                 {total}
                               </div>
                             </div>
                           </div>
                         </td>
                         <td className="py-4 px-4 align-middle text-right">
                           <div className="flex items-center justify-end gap-2">
                             <TooltipIconButton
                               onClick={() => {
                                 if (total > 0) {
                                   logic.moveRestockToOrdered(order.id, draft.bywood, draft.broom);
                                   setRestockDrafts(prev => {
                                     const next = { ...prev };
                                     delete next[order.id];
                                     return next;
                                   });
                                 }
                               }}
                               disabled={total <= 0}
                               tooltip="Send to Ordered List"
                               icon={Send}
                               className={`p-1.5 rounded-lg transition-all shadow-md ${
                                 total > 0
                                 ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
                                 : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                               }`}
                             />
                             
                             {dismissingId === order.id ? (
                               <div className="flex flex-col items-center gap-1.5 animate-in zoom-in duration-200 p-1.5 rounded-xl border border-rose-500/30 bg-rose-900/10 min-w-[120px]">
                                 <span className="text-[8px] font-black text-rose-400 uppercase tracking-tight whitespace-nowrap">Remove from restock?</span>
                                 <div className="flex gap-1.5">
                                   <button 
                                     onClick={() => { logic.dismissRestock(order.id); setDismissingId(null); }}
                                     className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-rose-500 shadow-md"
                                   >
                                     Yes
                                   </button>
                                   <button 
                                     onClick={() => setDismissingId(null)}
                                     className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-wider hover:bg-slate-600 shadow-md"
                                   >
                                     No
                                   </button>
                                 </div>
                               </div>
                             ) : (
                               <TooltipIconButton
                                 onClick={() => setDismissingId(order.id)}
                                 tooltip="Dismiss Restock"
                                 icon={X}
                                 className="p-1.5 rounded-lg bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-md"
                               />
                             )}
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           ) : (
             <JointOrderPanel
                orders={paginatedItems as any[]}
                allocationDrafts={allocationDrafts}
                onAllocationChange={handleAllocationChange}
                onConfirmAllocation={confirmAllocation}
                onUpdateOrder={logic.updateJointOrder}
                onCancelOrder={logic.dismissRestock}
                localItems={localItems}
                onUpdateSharedValues={updateSharedValues}
                onPreviewImage={onPreviewImage}
                sortConfig={orderedSortConfig}
                onSort={handleOrderedSort}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleAll={toggleAll}
                isAllSelected={isAllSelected}
             />
           )}
        </div>

        {/* Pagination Footer */}
        {currentList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-[2rem] bg-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rows per page:</span>
                <select 
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, currentList.length)} of {currentList.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                  Page {currentPage} <span className="text-slate-500 mx-1">of</span> {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectionCount > 0 && (
        <BulkActionToolbar
          count={selectionCount}
          onClear={clearSelection}
          isSharedStockView={true}
          onAdjustPrice={activeTab === 'inventory' ? (adjustment) => {
            if (window.confirm("WARNING: Adjusting prices here will automatically update these products across all synced sites. Do you want to proceed?")) {
              logic.bulkAdjustPrices(selectedIds, adjustment);
              clearSelection();
            }
          } : undefined}
          onUpdateIntelligence={activeTab === 'inventory' ? (updates) => {
            if (window.confirm("WARNING: Changing intelligence settings here will automatically apply to these products across all synced sites. Do you want to proceed?")) {
              logic.bulkUpdateSmartToggles(selectedIds, updates);
              clearSelection();
            }
          } : undefined}
          onExportExcel={
            activeTab === 'inventory' ? handleExportSharedInventory :
            activeTab === 'restock' ? handleExportRestock :
            handleExportOrders
          }
          onSendToOrder={activeTab === 'restock' ? () => {
            const selectedRestockItems = restockItems.filter(o => selectedIds.has(o.id));
            selectedRestockItems.forEach(order => {
              const draft = restockDrafts[order.id] || { bywood: order.allocationBywood || 0, broom: order.allocationBroom || 0 };
              const total = draft.bywood + draft.broom;
              if (total > 0) {
                logic.moveRestockToOrdered(order.id, draft.bywood, draft.broom);
              }
            });
            // Update restockDrafts to remove the processed ones
            setRestockDrafts(prev => {
              const next = { ...prev };
              selectedRestockItems.forEach(o => delete next[o.id]);
              return next;
            });
            clearSelection();
          } : undefined}
          onDistribute={activeTab === 'orders' ? () => {
            const selectedActiveOrders = activeJointOrders.filter(o => selectedIds.has(o.id));
            let invalidAllocations = false;
            selectedActiveOrders.forEach(order => {
              const draft = allocationDrafts[order.id] || { bywood: order.allocationBywood || 0, broom: order.allocationBroom || 0 };
              const allocated = draft.bywood + draft.broom;
              if (allocated === order.totalQuantity) {
                logic.distributeJointOrder(order.id, draft.bywood, draft.broom);
              } else {
                invalidAllocations = true;
              }
            });
            
            if (invalidAllocations) {
              alert("Some items could not be distributed because their allocated total did not match the order target.");
            }
            clearSelection();
          } : undefined}
        />
      )}

      {isScanning && (
        <LiveVisionScanner 
          theme={theme} 
          onDetected={(code) => {
            setSearchQuery(code);
            setIsScanning(false);
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
};
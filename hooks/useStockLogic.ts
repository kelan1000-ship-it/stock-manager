import { useCallback, useMemo } from 'react';
import { Product, TriState } from '../types';
import { extractProductInfoFromImage, researchProductDetails } from '../services/geminiService';
import { useStockState, initialFormData, initialRequestFormData } from './useStockState';
import { useProductOperations } from './useProductOperations';
import { useRequestManagement } from './useRequestManagement';
import { useBulkOperations } from './useBulkOperations';
import { useDataExchange } from './useDataExchange';
import { useMessageTransfer } from './useMessageTransfer';
import { useMasterInventory } from './useMasterInventory';
import { useOrderManagement } from './useOrderManagement';

export function useStockLogic() {
  const state = useStockState();
  const {
    currentBranch, setCurrentBranch,
    branchData, setBranchData,
    mainView, setMainView,
    searchQuery, setSearchQuery,
    subFilter, setSubFilter,
    stockTypeFilter, setStockTypeFilter,
    isManageDataOpen, setIsManageDataOpen,
    isBulkOpen, setIsBulkOpen,
    isMasterCatalogueOpen, setIsMasterCatalogueOpen,
    isTransferInboxOpen, setIsTransferInboxOpen,
    isChatOpen, setIsChatOpen,
    isMuted, setIsMuted,
    sortConfig, setSortConfig,
    isVisionScanning, setIsVisionScanning,
    isAILoading, setIsAILoading,
    
    // Forms
    isAdding, setIsAdding,
    editingId, setEditingId,
    formData, setFormData,
    copyToBothBranches, setCopyToBothBranches,

    // Requests
    isAddingRequest, setIsAddingRequest,
    editingRequestId, setEditingRequestId,
    requestFormData, setRequestFormData,

    // Bulk View Specifics
    bulkItems, setBulkItems,
    bulkScanningRowId, setBulkScanningRowId,
    isBulkCameraOpen, setIsBulkCameraOpen,

    // Duplicates
    pendingDuplicate, setPendingDuplicate,
  } = state;

  const {
    resetForm,
    handleSaveProduct,
    updateProductItem,
    updateProductPrice,
    updateProductStockInHand,
    updateProductStockToKeep,
    updateProductPartPacks,
    toggleArchive,
    restoreProduct,
    handleDeleteProduct
  } = useProductOperations(
    currentBranch,
    setBranchData,
    formData,
    setFormData,
    editingId,
    setEditingId,
    setIsAdding,
    copyToBothBranches,
    setCopyToBothBranches,
    initialFormData
  );

  const {
    resetRequestForm,
    handleSaveRequest,
    handleDeleteRequest,
    handleRestoreRequest
  } = useRequestManagement(
    currentBranch,
    setBranchData,
    requestFormData,
    setRequestFormData,
    editingRequestId,
    setEditingRequestId,
    setIsAddingRequest,
    initialRequestFormData
  );

  const {
    addBulkRow,
    updateBulkItem,
    removeBulkItem,
    processBulkImages,
    toggleBulkItemStatus,
    markAllBulkItemsReady,
    commitReadyBulkItems,
    commitBulkItems
  } = useBulkOperations(
    currentBranch,
    setBranchData,
    bulkItems,
    setBulkItems,
    setIsBulkOpen,
    setIsAILoading
  );

  const {
    exportToExcel,
    exportToJson,
    importData,
    clearAllData,
    exportMasterToExcel
  } = useDataExchange(
    currentBranch,
    branchData,
    setBranchData
  );

  const {
    markRead,
    toggleMessageReadStatus,
    sendMessage,
    handleTransfer,
    processTransfer
  } = useMessageTransfer(
    currentBranch,
    setBranchData
  );

  const {
    findMasterRecord,
    suggestFromMaster,
    updateMasterProduct,
    addMasterProduct,
    addBulkMasterProducts,
    deleteMasterProduct,
    deleteBulkMasterProducts
  } = useMasterInventory(
    branchData,
    setBranchData
  );

  const {
    removeOrder,
    receiveOrder,
    sendToOrder,
    createJointOrder,
    updateJointOrder,
    distributeJointOrder
  } = useOrderManagement(
    currentBranch,
    setBranchData
  );

  // Bulk Operations (Selection based)
  const bulkAdjustPrices = useCallback((ids: Set<string>, adjustment: { type: 'percent' | 'fixed', value: number }) => {
    const now = new Date().toISOString();
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        let newPrice = p.price;
        if (adjustment.type === 'fixed') newPrice += adjustment.value;
        else newPrice += newPrice * (adjustment.value / 100);
        
        newPrice = Math.max(0, newPrice);

        // Check if price actually changed
        if (Math.abs(p.price - newPrice) < 0.001) return p;

        const newHistory = [
            ...(p.priceHistory || []),
            {
                date: now,
                rrp: newPrice,
                costPrice: p.costPrice,
                margin: newPrice > 0 ? ((newPrice - p.costPrice) / newPrice * 100) : 0
            }
        ];

        return { ...p, price: newPrice, lastUpdated: now, priceHistory: newHistory };
      })
    }));
  }, [currentBranch, setBranchData]);

  const bulkReceiveStock = useCallback((ids: Set<string>) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        return { ...p, stockInHand: p.stockToKeep, lastUpdated: new Date().toISOString() };
      })
    }));
  }, [currentBranch, setBranchData]);

  const bulkUpdateSmartToggles = useCallback((ids: Set<string>, updates: { isShared: TriState, isPriceSynced: TriState, enableThresholdAlert: TriState }) => {
    const now = new Date().toISOString();
    setBranchData(prev => ({
        ...prev,
        [currentBranch]: prev[currentBranch].map(p => {
            if (!ids.has(p.id)) return p;
            
            const next = { ...p, lastUpdated: now };
            
            // Apply updates
            if (updates.isShared !== 'keep') next.isShared = updates.isShared === 'on';
            
            // Logic: If Shared is being turned ON, default Price Sync to ON, unless manually set otherwise
            if (updates.isShared === 'on' && updates.isPriceSynced === 'keep') {
                next.isPriceSynced = true;
            }

            if (updates.isPriceSynced !== 'keep') next.isPriceSynced = updates.isPriceSynced === 'on';
            if (updates.enableThresholdAlert !== 'keep') next.enableThresholdAlert = updates.enableThresholdAlert === 'on';

            return next;
        })
    }));
  }, [currentBranch, setBranchData]);

  const bulkArchiveProducts = useCallback((ids: Set<string>) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        return { ...p, isArchived: !p.isArchived, lastUpdated: new Date().toISOString() };
      })
    }));
  }, [currentBranch, setBranchData]);

  const bulkRestoreProducts = useCallback((ids: Set<string>) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        return { ...p, deletedAt: undefined, isArchived: false, lastUpdated: new Date().toISOString() };
      })
    }));
  }, [currentBranch, setBranchData]);

  const bulkDeleteProducts = useCallback((ids: Set<string>, permanent: boolean = false) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        if (permanent) return null;
        return { ...p, deletedAt: new Date().toISOString(), lastUpdated: new Date().toISOString() };
      }).filter(Boolean) as Product[]
    }));
  }, [currentBranch, setBranchData]);

  // AI Form Scan (Image)
  const handleFullAIScan = useCallback(async (base64: string, mimeType: string) => {
    setIsAILoading(true);
    try {
        const result = await extractProductInfoFromImage(base64, mimeType);
        setFormData((prev) => ({
            ...prev,
            name: result.name || prev.name,
            barcode: result.barcode || prev.barcode,
            packSize: result.packSize || prev.packSize,
            price: result.price ? parseFloat(result.price.replace(/[^\d.]/g, '')).toFixed(2) : prev.price,
            productImage: result.imageUrl || prev.productImage
        }));
    } catch (e) {
        console.error("AI Scan failed", e);
    } finally {
        setIsAILoading(false);
    }
  }, [setIsAILoading, setFormData]);

  // AI Name Lookup
  const handleAIProductLookup = useCallback(async (name: string) => {
    if (!name) return;
    setIsAILoading(true);
    try {
        const result = await researchProductDetails(name);
        setFormData((prev) => ({
            ...prev,
            barcode: result.barcode || prev.barcode,
            productCode: result.productCode || prev.productCode,
            packSize: result.packSize || prev.packSize,
            supplier: result.supplier || prev.supplier,
        }));
    } catch (e) {
        console.error("AI Lookup failed", e);
    } finally {
        setIsAILoading(false);
    }
  }, [setIsAILoading, setFormData]);

  const acceptDuplicateAndSync = useCallback(() => {
    if (!pendingDuplicate) return;
    setBranchData(prev => {
        const newProduct = { ...pendingDuplicate, id: `imp_dup_${Date.now()}`, isPriceSynced: true };
        return {
            ...prev,
            [currentBranch]: [newProduct, ...prev[currentBranch]]
        };
    });
    setPendingDuplicate(null);
  }, [pendingDuplicate, currentBranch, setBranchData, setPendingDuplicate]);

  const uniqueProductNames = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.name))), [branchData, currentBranch]);
  const uniqueLocations = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.location))).filter(Boolean), [branchData, currentBranch]);
  const uniqueSuppliers = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.supplier))).filter(Boolean), [branchData, currentBranch]);
  const uniquePackSizes = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.packSize))).filter(Boolean), [branchData, currentBranch]);
  const uniqueParentGroups = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.parentGroup))).filter(Boolean) as string[], [branchData, currentBranch]);

  return {
    ...state,
    
    // Forms
    resetForm,
    handleSaveProduct,

    // Requests
    resetRequestForm,
    handleSaveRequest,
    handleDeleteRequest,
    handleRestoreRequest,

    // Actions
    updateProductItem,
    updateProductPrice,
    updateProductStockInHand,
    updateProductStockToKeep,
    updateProductPartPacks,
    removeOrder,
    receiveOrder,
    sendToOrder,
    toggleArchive,
    restoreProduct,
    handleDeleteProduct,
    
    // Bulk Ops
    bulkAdjustPrices,
    bulkReceiveStock,
    bulkUpdateSmartToggles,
    bulkArchiveProducts,
    bulkRestoreProducts,
    bulkDeleteProducts,
    
    // Data Mgmt
    exportToExcel,
    exportToJson,
    importData,
    clearAllData,
    exportMasterToExcel,
    
    // Chat & Transfer
    markRead,
    toggleMessageReadStatus,
    sendMessage,
    handleTransfer,
    processTransfer,
    
    // Master
    findMasterRecord,
    suggestFromMaster,
    updateMasterProduct,
    addMasterProduct,
    addBulkMasterProducts,
    deleteMasterProduct,
    deleteBulkMasterProducts,
    handleFullAIScan,
    handleAIProductLookup,

    // Bulk View Specifics
    addBulkRow,
    updateBulkItem,
    removeBulkItem,
    processBulkImages,
    commitBulkItems,
    commitReadyBulkItems,
    toggleBulkItemStatus,
    markAllBulkItemsReady,

    // Duplicates
    acceptDuplicateAndSync,
    otherBranchName: currentBranch === 'bywood' ? 'Broom Road' : 'Bywood Ave',

    // Joint Orders
    createJointOrder,
    updateJointOrder,
    distributeJointOrder,

    // Lists
    uniqueProductNames,
    uniqueLocations,
    uniqueSuppliers,
    uniquePackSizes,
    uniqueParentGroups
  };
}

export type StockLogicReturn = ReturnType<typeof useStockLogic>;

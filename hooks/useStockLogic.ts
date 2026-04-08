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
import { useTaskManager } from './useTaskManager';
import { usePlanogram, PlanogramReturn } from './usePlanogram';
import { saveSupplier, deleteSupplierFromDb } from '../services/firestoreService';
import { Supplier } from '../types';

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
    isMissingAttributesOpen, setIsMissingAttributesOpen,
    
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
    updateProductLooseStockToKeep,
    updateProductPartPacks,
    toggleArchive,
    restoreProduct,
    handleDeleteProduct,
    bulkUpdateProducts,
    confirmStockCheck
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
    handleRestoreRequest,
    updateRequestItem
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
    setIsAILoading,
    branchData.masterInventory
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
    updateMessageReadStatus,
    toggleMessageReadStatus,
    sendMessage,
    deleteMessage,
    clearAllMessages,
    toggleReaction,
    handleTransfer,
    processTransfer,
    sendNudge,
    clearHistoricTransfers
  } = useMessageTransfer(
    currentBranch,
    setBranchData
  );

  const {
    addTask,
    updateTask,
    deleteTask
  } = useTaskManager(
    currentBranch,
    setBranchData
  );

  const {
    activePlanogram,
    activeFloorPlan,
    planograms,
    setActivePlanogramId,
    updateSlot,
    swapSlots,
    addPlanogram,
    addFaceToPlanogram,
    removeFace,
    updatePlanogramDetails,
    updatePlanogramImage,
    updateAiVisualisation,
    addShelfToFloor,
    updateFloorItem,
    removeFloorItem,
    deletePlanogram
  } = usePlanogram(
    branchData,
    setBranchData,
    currentBranch
  );

  const {
    findMasterRecord,
    suggestFromMaster,
    updateMasterProduct,
    addMasterProduct,
    addBulkMasterProducts,
    upsertBulkMasterProducts,
    deleteMasterProduct,
    deleteBulkMasterProducts
  } = useMasterInventory(
    branchData,
    setBranchData
  );

  const {
    removeOrder,
    markAsBackorder,
    markAsActiveOrder,
    receiveOrder,
    confirmOrder,
    sendToOrder,
    updateOrderQuantity,
    createJointOrder,
    updateJointOrder,
    distributeJointOrder,
    sendToRestock,
    sendToRestockWithQuantity,
    moveRestockToOrdered,
    dismissRestock
  } = useOrderManagement(
    currentBranch,
    setBranchData
  );

  // Bulk Operations (Selection based)
  const bulkAdjustPrices = useCallback((ids: Set<string>, adjustment: { type: 'percent' | 'fixed', value: number }) => {
    const now = new Date().toISOString();
    setBranchData(prev => {
      const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

      // 1. Update Local
      const updatedLocal = prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        
        // Ensure price is treated as a number to prevent string concatenation bugs
        const currentPrice = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
        let newPrice = currentPrice;
        
        if (adjustment.type === 'fixed') {
            newPrice = adjustment.value;
        } else {
            // Percent adjustment
            newPrice += currentPrice * (adjustment.value / 100);
        }
        
        newPrice = Math.max(0, newPrice);

        // Check if price actually changed
        if (Math.abs(currentPrice - newPrice) < 0.001) return p;

        const newHistory = [
            ...(p.priceHistory || []),
            {
                date: now,
                rrp: newPrice,
                costPrice: p.costPrice,
                margin: newPrice > 0 ? ((newPrice - p.costPrice) / newPrice * 100) : 0
            }
        ];

        return {
            ...p,
            price: newPrice,
            lastUpdated: now,
            priceHistory: newHistory,
            ignoredPriceAlertUntil: undefined,
            labelNeedsUpdate: true
        };
      });

      // 2. Propagate to Partner
      let updatedPartner = [...prev[otherBranch]];
      const syncedItems = updatedLocal.filter(p => ids.has(p.id) && p.isPriceSynced && p.barcode);
      
      syncedItems.forEach(localItem => {
          const partnerIndex = updatedPartner.findIndex(op => op.barcode === localItem.barcode && !op.deletedAt);
          if (partnerIndex !== -1) {
              const partnerItem = updatedPartner[partnerIndex];
              const partnerCurrentPrice = typeof partnerItem.price === 'string' ? parseFloat(partnerItem.price) : partnerItem.price;
              const newPrice = localItem.price;
               
              if (Math.abs(partnerCurrentPrice - newPrice) > 0.001) {
                  updatedPartner[partnerIndex] = {
                      ...partnerItem,
                      price: newPrice,
                      pendingPriceUpdate: true,
                      priceChangeOrigin: currentBranch,
                      ignoredPriceAlertUntil: undefined,
                      lastUpdated: now,
                      priceHistory: [
                          ...(partnerItem.priceHistory || []),
                          {
                              date: now,
                              rrp: newPrice,
                              costPrice: partnerItem.costPrice,
                              margin: newPrice > 0 ? ((newPrice - partnerItem.costPrice) / newPrice * 100) : 0
                          }
                      ]
                  };
              }
          }
      });

      return {
          ...prev,
          [currentBranch]: updatedLocal,
          [otherBranch]: updatedPartner
      };
    });
  }, [currentBranch, setBranchData]);

  const bulkAdjustCostPrices = useCallback((ids: Set<string>, adjustment: { type: 'percent' | 'fixed', value: number }) => {
    const now = new Date().toISOString();
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;
        const currentCost = typeof p.costPrice === 'string' ? parseFloat(p.costPrice) : (p.costPrice || 0);
        let newCost = currentCost;
        if (adjustment.type === 'fixed') {
          newCost = adjustment.value;
        } else {
          newCost += currentCost * (adjustment.value / 100);
        }
        newCost = Math.max(0, newCost);
        if (Math.abs(currentCost - newCost) < 0.001) return p;
        return { ...p, costPrice: newCost, lastUpdated: now };
      })
    }));
  }, [currentBranch, setBranchData]);

  const bulkReceiveStock = useCallback((ids: Set<string>) => {
    const now = new Date().toISOString();
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';

    setBranchData(prev => {
      let updatedOrders = [...(prev[orderKey] || [])];
      
      const updatedProducts = prev[currentBranch].map(p => {
        if (!ids.has(p.id)) return p;

        const activeOrders = updatedOrders.filter(o => 
          o.productId === p.id && o.status !== 'completed' && o.status !== 'cancelled'
        );

        if (activeOrders.length > 0) {
          let currentStock = p.stockInHand;
          let newOrderHistory = [...(p.orderHistory || [])];
          let newStockHistory = [...(p.stockHistory || [])];

          activeOrders.forEach(activeOrder => {
            currentStock += activeOrder.quantity;
            newOrderHistory.push({ date: now, quantity: activeOrder.quantity });
            newStockHistory.push({ 
              date: now, 
              type: 'order', 
              change: activeOrder.quantity, 
              newBalance: currentStock, 
              note: 'Order Received (Bulk)' 
            });

            // Update order status
            updatedOrders = updatedOrders.map(o => 
              o.id === activeOrder.id ? { ...o, status: 'completed' } : o
            );
          });

          return {
            ...p,
            stockInHand: currentStock,
            lastOrderedDate: now,
            lastUpdated: now,
            orderHistory: newOrderHistory,
            stockHistory: newStockHistory
          };
        }

        // Fallback for items with no active orders
        return { ...p, stockInHand: p.stockToKeep, lastUpdated: now };
      });

      return {
        ...prev,
        [currentBranch]: updatedProducts,
        [orderKey]: updatedOrders
      };
    });
  }, [currentBranch, setBranchData]);

  const bulkUpdateSmartToggles = useCallback((ids: Set<string>, updates: { 
    isShared: TriState, 
    isPriceSynced: TriState, 
    enableThresholdAlert: TriState,
    isExcessStock: TriState 
  }) => {
    const now = new Date().toISOString();
    setBranchData(prev => {
        const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

        // 1. Update Local Branch
        const updatedLocal = prev[currentBranch].map(p => {
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
            if (updates.isExcessStock !== 'keep') next.isExcessStock = updates.isExcessStock === 'on';

            return next;
        });

        // 2. Propagate to Partner Branch
        let updatedPartner = [...prev[otherBranch]];
        
        // Find all local items that were updated
        const changedLocalItems = updatedLocal.filter(p => ids.has(p.id));

        changedLocalItems.forEach(localItem => {
            if (!localItem.barcode) return;

            const partnerIndex = updatedPartner.findIndex(op => op.barcode === localItem.barcode && !op.deletedAt);
            if (partnerIndex !== -1) {
                const partnerItem = updatedPartner[partnerIndex];
                let partnerUpdates: Partial<typeof partnerItem> = { lastUpdated: now };
                let hasChanges = false;

                // Sync 'isShared'
                if (updates.isShared !== 'keep') {
                    const newShared = updates.isShared === 'on';
                    if (partnerItem.isShared !== newShared) {
                        partnerUpdates.isShared = newShared;
                        hasChanges = true;
                    }
                }

                // Sync 'isPriceSynced' logic (mirroring local logic)
                let newPriceSynced = partnerItem.isPriceSynced;
                if (updates.isShared === 'on' && updates.isPriceSynced === 'keep') {
                     newPriceSynced = true;
                }
                if (updates.isPriceSynced !== 'keep') {
                    newPriceSynced = updates.isPriceSynced === 'on';
                }
                
                if (partnerItem.isPriceSynced !== newPriceSynced) {
                    partnerUpdates.isPriceSynced = newPriceSynced;
                    hasChanges = true;
                }

                // If Price Sync is active, synchronize prices if different
                if (partnerUpdates.isPriceSynced ?? partnerItem.isPriceSynced) {
                     const localPrice = localItem.price;
                     const partnerPrice = partnerItem.price;

                     if (Math.abs(localPrice - partnerPrice) > 0.001) {
                         partnerUpdates.price = localPrice;
                         partnerUpdates.pendingPriceUpdate = true;
                         partnerUpdates.priceChangeOrigin = currentBranch;
                         partnerUpdates.ignoredPriceAlertUntil = undefined;
                         partnerUpdates.priceHistory = [
                              ...(partnerItem.priceHistory || []),
                              {
                                  date: now,
                                  rrp: localPrice,
                                  costPrice: partnerItem.costPrice,
                                  margin: localPrice > 0 ? ((localPrice - partnerItem.costPrice) / localPrice * 100) : 0
                              }
                         ];
                         hasChanges = true;
                     }
                }

                if (hasChanges) {
                    updatedPartner[partnerIndex] = { ...partnerItem, ...partnerUpdates };
                }
            }
        });

        return {
            ...prev,
            [currentBranch]: updatedLocal,
            [otherBranch]: updatedPartner
        };
    });
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
    console.log(`[handleFullAIScan] Starting AI scan. Base64 length: ${base64.length}`);
    setIsAILoading(true);
    try {
        const result = await extractProductInfoFromImage(base64, mimeType);
        console.log(`[handleFullAIScan] Result received:`, result);
        setFormData((prev) => ({
            ...prev,
            // Only fill fields that are currently empty; protect any pre-existing values
            name:         prev.name         || result.name         || prev.name,
            barcode:      prev.barcode      || result.barcode      || prev.barcode,
            packSize:     prev.packSize     || result.packSize     || prev.packSize,
            price:        (prev.price && prev.price !== '0.00')
                            ? prev.price
                            : (result.price ? parseFloat(result.price.replace(/[^\d.]/g, '')).toFixed(2) : prev.price),
            productImage: prev.productImage || result.imageUrl     || prev.productImage,
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
        // Pass existing known values as context to narrow AI search
        const context = {
            barcode:     formData.barcode     || undefined,
            productCode: formData.productCode || undefined,
            packSize:    formData.packSize     || undefined,
        };
        const result = await researchProductDetails(name, context);
        setFormData((prev) => ({
            ...prev,
            // Only fill fields that are currently empty; protect any pre-existing values
            barcode:     prev.barcode     || (Array.isArray(result.barcode) ? result.barcode[0] : result.barcode)         || prev.barcode,
            productCode: prev.productCode || (Array.isArray(result.productCode) ? result.productCode[0] : result.productCode) || prev.productCode,
            packSize:    prev.packSize    || (Array.isArray(result.packSize) ? result.packSize[0] : result.packSize)       || prev.packSize,
            price:       (prev.price && prev.price !== '0.00')
                           ? prev.price
                           : (result.price ? parseFloat(String(Array.isArray(result.price) ? result.price[0] : result.price)).toFixed(2) : prev.price),
        }));
    } catch (e) {
        console.error("AI Lookup failed", e);
    } finally {
        setIsAILoading(false);
    }
  }, [setIsAILoading, setFormData, formData]);

  const acceptDuplicateAndSync = useCallback(() => {
    if (!pendingDuplicate) return;
    setBranchData(prev => {
        const newProduct = { ...pendingDuplicate, id: `imp_dup_${Date.now()}`, isPriceSynced: true, createdAt: new Date().toISOString() };
        return {
            ...prev,
            [currentBranch]: [newProduct, ...prev[currentBranch]]
        };
    });
    setPendingDuplicate(null);
  }, [pendingDuplicate, currentBranch, setBranchData, setPendingDuplicate]);

  const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      lastUpdated: new Date().toISOString()
    };
    try {
      await saveSupplier(newSupplier);
    } catch (e) {
      console.error('Failed to add supplier:', e);
    }
  }, []);

  const updateSupplier = useCallback(async (supplier: Supplier) => {
    try {
      await saveSupplier({ ...supplier, lastUpdated: new Date().toISOString() });
    } catch (e) {
      console.error('Failed to update supplier:', e);
    }
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      await deleteSupplierFromDb(id);
    } catch (e) {
      console.error('Failed to delete supplier:', e);
    }
  }, []);

  const uniqueProductNames = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.name))), [branchData, currentBranch]);
  const uniqueLocations = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.location))).filter(Boolean), [branchData, currentBranch]);
  const uniqueSuppliers = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.supplier))).filter(Boolean), [branchData, currentBranch]);
  const uniquePackSizes = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.packSize))).filter(Boolean), [branchData, currentBranch]);
  const uniqueParentGroups = useMemo(() => Array.from(new Set(branchData[currentBranch].map(p => p.parentGroup))).filter(Boolean) as string[], [branchData, currentBranch]);

  const recentlyAddedCount = useMemo(() => {
    const items = branchData[currentBranch] || [];
    const now = new Date();
    return items.filter(i => {
      if (i.isArchived || i.deletedAt || !i.createdAt) return false;
      const diffHours = (now.getTime() - new Date(i.createdAt).getTime()) / (1000 * 3600);
      return diffHours <= 48 && diffHours >= 0;
    }).length;
  }, [branchData, currentBranch]);

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
    updateRequestItem,

    // Actions
    updateProductItem,
    updateProductPrice,
    updateProductStockInHand,
    updateProductStockToKeep,
    updateProductLooseStockToKeep,
    updateProductPartPacks,
    removeOrder,
    markAsBackorder,
    markAsActiveOrder,
    receiveOrder,
    confirmOrder,
    sendToOrder,
    updateOrderQuantity,
    toggleArchive,
    restoreProduct,
    confirmStockCheck,
    handleDeleteProduct,
    bulkUpdateProducts,
    
    // Sort handler
    handleSort: (key: string, multi: boolean) => {
      setSortConfig((prev: { key: string; direction: 'asc' | 'desc' }[]) => {
        const existing = prev.findIndex(c => c.key === key);
        if (multi) {
          if (existing !== -1) {
            if (prev[existing].direction === 'asc') {
              return prev.map((c, i) => i === existing ? { ...c, direction: 'desc' as const } : c);
            }
            return prev.filter((_, i) => i !== existing);
          }
          return [...prev, { key, direction: 'asc' as const }];
        }
        if (existing !== -1 && prev.length === 1) {
          return [{ key, direction: prev[existing].direction === 'asc' ? 'desc' as const : 'asc' as const }];
        }
        return [{ key, direction: 'asc' as const }];
      });
    },

    // Bulk Ops
    bulkAdjustPrices,
    bulkAdjustCostPrices,
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
    updateMessageReadStatus,
    toggleMessageReadStatus,
    sendMessage,
    deleteMessage,
    clearAllMessages,
    toggleReaction,
    handleTransfer,
    processTransfer,
    sendNudge,
    clearHistoricTransfers,

    // Tasks
    addTask,
    updateTask,
    deleteTask,
    
    // Planogram Management
    activePlanogram,
    activeFloorPlan,
    planograms,
    setActivePlanogramId,
    updateSlot,
    swapSlots,
    addPlanogram,
    addFaceToPlanogram,
    removeFace,
    updatePlanogramDetails,
    updatePlanogramImage,
    updateAiVisualisation,
    addShelfToFloor,
    updateFloorItem,
    removeFloorItem,
    deletePlanogram,

    // Master
    findMasterRecord,
    suggestFromMaster,
    updateMasterProduct,
    addMasterProduct,
    addBulkMasterProducts,
    upsertBulkMasterProducts,
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
    sendToRestock,
    sendToRestockWithQuantity,
    moveRestockToOrdered,
    dismissRestock,

    // Suppliers
    addSupplier,
    updateSupplier,
    deleteSupplier,

    // Lists
    uniqueProductNames,
    uniqueLocations,
    uniqueSuppliers,
    uniquePackSizes,
    uniqueParentGroups,
    recentlyAddedCount
  };
}

export type StockLogicReturn = ReturnType<typeof useStockLogic>;

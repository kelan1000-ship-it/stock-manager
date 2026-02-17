
import React, { useCallback } from 'react';
import { BranchData, BranchKey, Product, ProductFormData } from '../types';

export function useProductOperations(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>,
  formData: ProductFormData,
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>,
  editingId: string | null,
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>,
  setIsAdding: React.Dispatch<React.SetStateAction<boolean>>,
  copyToBothBranches: boolean,
  setCopyToBothBranches: React.Dispatch<React.SetStateAction<boolean>>,
  initialFormData: ProductFormData
) {

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsAdding(false);
    setCopyToBothBranches(false);
  }, [setFormData, setEditingId, setIsAdding, setCopyToBothBranches, initialFormData]);

  const handleSaveProduct = useCallback(() => {
    if (!formData.name) return;
    const now = new Date().toISOString();
    const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';
    
    setBranchData(prev => {
      let updated = { ...prev };
      let priceValue = parseFloat(formData.price) || 0;
      const groupName = formData.parentGroup?.trim();
      const isJoiningGroup = !!groupName && groupName !== '';

      // Determine if this is a member joining an existing group
      // or an existing member updating the whole group.
      if (isJoiningGroup) {
        const existingItem = prev[currentBranch].find(p => p.id === editingId);
        const wasInThisGroup = existingItem?.parentGroup?.trim() === groupName;
        
        const otherGroupMember = prev[currentBranch].find(p => 
          p.parentGroup?.trim() === groupName && 
          p.id !== editingId && 
          !p.deletedAt
        );

        if (!wasInThisGroup && otherGroupMember) {
          // RULE: Conform to existing group price if newly joining
          priceValue = otherGroupMember.price;
        }
      }

      // Helper to create product object
      const createProduct = (id: string): Product => ({
        id,
        name: formData.name,
        barcode: formData.barcode,
        productCode: formData.productCode,
        packSize: formData.packSize,
        price: priceValue,
        costPrice: parseFloat(formData.costPrice) || 0,
        stockToKeep: parseInt(formData.stockToKeep) || 0,
        stockInHand: parseInt(formData.stockInHand) || 0,
        partPacks: parseInt(formData.partPacks) || 0,
        isOrdered: false,
        supplier: formData.supplier,
        location: formData.location,
        parentGroup: formData.parentGroup,
        productImage: formData.productImage,
        sourceUrls: formData.sourceUrls,
        priceHistory: [{ 
          date: now, 
          rrp: priceValue, 
          costPrice: parseFloat(formData.costPrice) || 0, 
          margin: priceValue > 0 ? ((priceValue - (parseFloat(formData.costPrice) || 0)) / priceValue * 100) : 0 
        }],
        orderHistory: [],
        stockHistory: [{ date: now, type: 'manual', change: parseInt(formData.stockInHand) || 0, newBalance: parseInt(formData.stockInHand) || 0, note: 'Initial creation' }],
        lastOrderedDate: null,
        lastUpdated: now,
        pendingPriceUpdate: false,
        isShared: formData.isShared,
        enableThresholdAlert: formData.enableThresholdAlert,
        isDiscontinued: formData.isDiscontinued,
        isPriceSynced: formData.isPriceSynced,
        isReducedToClear: formData.isReducedToClear,
        expiryDate: formData.expiryDate,
        stockType: formData.stockType,
        notes: formData.notes,
        tags: formData.tags
      });

      if (editingId) {
        // Update existing
        updated[currentBranch] = prev[currentBranch].map(p => {
          if (p.id === editingId) {
            const newCost = parseFloat(formData.costPrice) || 0;
            const hasPriceChanged = Math.abs(p.price - priceValue) > 0.001 || Math.abs(p.costPrice - newCost) > 0.001;
            
            const newHistory = hasPriceChanged ? [
                ...(p.priceHistory || []),
                {
                    date: now,
                    rrp: priceValue,
                    costPrice: newCost,
                    margin: priceValue > 0 ? ((priceValue - newCost) / priceValue * 100) : 0
                }
            ] : (p.priceHistory || []);

            return {
              ...p,
              ...formData,
              price: priceValue,
              costPrice: newCost,
              stockToKeep: parseInt(formData.stockToKeep) || 0,
              stockInHand: parseInt(formData.stockInHand) || 0,
              partPacks: parseInt(formData.partPacks) || 0,
              lastUpdated: now,
              priceHistory: newHistory,
              ignoredPriceAlertUntil: hasPriceChanged ? undefined : p.ignoredPriceAlertUntil,
              labelNeedsUpdate: (hasPriceChanged && formData.isPriceSynced) ? true : p.labelNeedsUpdate
            };
          }
          return p;
        });

        // ENFORCE PARENT GROUP PRICE SYNC: Update all others to match the current item's (potentially conformed) price
        if (isJoiningGroup) {
           updated[currentBranch] = updated[currentBranch].map(p => {
              if (p.parentGroup?.trim() === groupName && p.id !== editingId && !p.deletedAt) {
                 const hasChanged = Math.abs(p.price - priceValue) > 0.001;
                 if (!hasChanged) return p;

                 const groupHistory = [
                    ...(p.priceHistory || []),
                    {
                        date: now,
                        rrp: priceValue,
                        costPrice: p.costPrice,
                        margin: priceValue > 0 ? ((priceValue - p.costPrice) / priceValue * 100) : 0
                    }
                 ];

                 return { ...p, price: priceValue, lastUpdated: now, priceHistory: groupHistory, ignoredPriceAlertUntil: undefined };
              }
              return p;
           });
        }

        // Propagate Shared Stock & Price Sync to Partner Branch
        if (formData.barcode) {
          const partnerItems = [...(prev[otherBranch] || [])];
          const matchIndex = partnerItems.findIndex(p => p.barcode === formData.barcode && !p.deletedAt);

          if (matchIndex !== -1) {
            const partnerItem = partnerItems[matchIndex];
            
            const partnerUpdates: Partial<Product> = {
              isShared: formData.isShared, 
              isPriceSynced: formData.isPriceSynced,
              parentGroup: formData.parentGroup,
              lastUpdated: now
            };

            if (formData.isPriceSynced) {
              if (Math.abs(partnerItem.price - priceValue) > 0.001) {
                partnerUpdates.price = priceValue;
                partnerUpdates.pendingPriceUpdate = true;
                partnerUpdates.priceChangeOrigin = currentBranch;
                partnerUpdates.ignoredPriceAlertUntil = undefined;
                partnerUpdates.priceHistory = [
                  ...(partnerItem.priceHistory || []), 
                  { 
                    date: now, 
                    rrp: priceValue, 
                    costPrice: partnerItem.costPrice, 
                    margin: priceValue > 0 ? (priceValue - partnerItem.costPrice) / priceValue * 100 : 0 
                  }
                ];
              }
            }

            partnerItems[matchIndex] = { ...partnerItem, ...partnerUpdates };
            updated[otherBranch] = partnerItems;
          }
        }

      } else {
        // Create new
        const newProduct = createProduct(`prod_${Date.now()}`);
        updated[currentBranch] = [newProduct, ...prev[currentBranch]];

        if (copyToBothBranches) {
          const otherProduct = createProduct(`prod_${Date.now()}_2`);
          updated[otherBranch] = [otherProduct, ...prev[otherBranch]];
        }
      }
      return updated;
    });
    
    resetForm();
  }, [formData, editingId, currentBranch, copyToBothBranches, resetForm, setBranchData]);

  const updateProductItem = useCallback((id: string, updates: Partial<Product>) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p)
    }));
  }, [currentBranch, setBranchData]);

  const updateProductPrice = useCallback((id: string, newPrice: number) => {
    const now = new Date().toISOString();
    setBranchData(prev => {
        const targetProduct = prev[currentBranch].find(p => p.id === id);
        const targetGroup = targetProduct?.parentGroup?.trim();
        const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

        // 1. Update Local Branch
        const updatedLocal = prev[currentBranch].map(p => {
            if (p.id === id || (targetGroup && p.parentGroup?.trim() === targetGroup && !p.deletedAt)) {
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
                // If synced, force label update on initiator to skip alert
                const shouldLabel = p.isPriceSynced;
                return { 
                    ...p, 
                    price: newPrice, 
                    lastUpdated: now, 
                    priceHistory: newHistory, 
                    ignoredPriceAlertUntil: undefined,
                    labelNeedsUpdate: shouldLabel ? true : p.labelNeedsUpdate
                };
            }
            return p;
        });

        // 2. Propagate to Partner Branch (if synced)
        let updatedPartner = [...prev[otherBranch]];
        
        // Find all local items that were updated AND are synced
        const syncedItemsToPropagate = updatedLocal.filter(p => 
            (p.id === id || (targetGroup && p.parentGroup?.trim() === targetGroup && !p.deletedAt)) &&
            p.isPriceSynced &&
            p.barcode
        );

        syncedItemsToPropagate.forEach(localItem => {
            const partnerIndex = updatedPartner.findIndex(op => op.barcode === localItem.barcode && !op.deletedAt);
            if (partnerIndex !== -1) {
                const partnerItem = updatedPartner[partnerIndex];
                if (Math.abs(partnerItem.price - newPrice) > 0.001) {
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

  const updateProductStockInHand = useCallback((id: string, newStock: number) => {
    updateProductItem(id, { stockInHand: newStock });
  }, [updateProductItem]);

  const updateProductStockToKeep = useCallback((id: string, newTarget: number) => {
    updateProductItem(id, { stockToKeep: newTarget });
  }, [updateProductItem]);

  const updateProductPartPacks = useCallback((id: string, newParts: number) => {
    updateProductItem(id, { partPacks: newParts });
  }, [updateProductItem]);

  const toggleArchive = useCallback((id: string) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => p.id === id ? { ...p, isArchived: !p.isArchived } : p)
    }));
  }, [currentBranch, setBranchData]);

  const restoreProduct = useCallback((id: string) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => p.id === id ? { ...p, deletedAt: undefined } : p)
    }));
  }, [currentBranch, setBranchData]);

  const handleDeleteProduct = useCallback((id: string, permanent: boolean) => {
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (p.id !== id) return p;
        if (permanent) return null;
        return { ...p, deletedAt: new Date().toISOString() };
      }).filter(Boolean) as Product[]
    }));
  }, [currentBranch, setBranchData]);

  return {
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
  };
}

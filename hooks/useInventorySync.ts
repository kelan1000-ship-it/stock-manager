
import React, { useCallback } from 'react';
import { BranchData, BranchKey, Product } from '../types';

/**
 * useInventorySync - Orchestrates the merging of spreadsheet data into the live database.
 */
export function useInventorySync(
  branchData: BranchData, 
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>, 
  currentBranch: BranchKey
) {
  const syncImportedData = useCallback((pendingData: Partial<Product>[]) => {
    const now = new Date().toISOString();
    const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';
    
    setBranchData(prev => {
      // Create a fresh copy of the whole state to ensure reference change triggers re-render
      const updatedData = { ...prev };
      const currentItems = [...(prev[currentBranch] || [])];
      const otherItems = [...(prev[otherBranch] || [])];
      
      pendingData.forEach(excelItem => {
        // Robust Matching: Use string comparison for Barcode OR fallback to Name
        const existingIdx = currentItems.findIndex(p => 
          (excelItem.barcode && String(p.barcode).trim() === String(excelItem.barcode).trim()) || 
          (!excelItem.barcode && excelItem.name && p.name.toLowerCase().trim() === excelItem.name.toLowerCase().trim())
        );

        if (existingIdx > -1) {
          // Overwrite existing record with fresh spreadsheet fields
          const existing = currentItems[existingIdx];
          
          // Determine if critical price or stock changes occurred for logging
          const hasPriceChanged = excelItem.price !== undefined && Math.abs(excelItem.price - existing.price) > 0.001;
          const hasStockChanged = (excelItem.stockInHand !== undefined && excelItem.stockInHand !== existing.stockInHand) ||
                                (excelItem.partPacks !== undefined && excelItem.partPacks !== (existing.partPacks || 0));

          // Check sync status (spreadsheet override or existing)
          const isSynced = excelItem.isPriceSynced !== undefined ? excelItem.isPriceSynced : existing.isPriceSynced;

          const updatedProduct: Product = {
            ...existing,
            ...excelItem, // Apply all spreadsheet fields (name, pip, cost, supplier, location, etc.)
            lastUpdated: now,

            // Handle label printing triggers
            // If synced, skip local alert (pending=false) and go to label (label=true). 
            // If not synced, keep existing behavior (or strictly follow change).
            pendingPriceUpdate: (hasPriceChanged && isSynced) ? false : (hasPriceChanged ? true : existing.pendingPriceUpdate),
            labelNeedsUpdate: (hasPriceChanged && isSynced) ? true : (hasPriceChanged ? true : existing.labelNeedsUpdate),
            ignoredPriceAlertUntil: hasPriceChanged ? undefined : existing.ignoredPriceAlertUntil,
            
            // Append to price history only if value changed
            priceHistory: hasPriceChanged ? [
              ...(existing.priceHistory || []),
              { 
                date: now, 
                rrp: excelItem.price || 0, 
                costPrice: excelItem.costPrice || existing.costPrice, 
                margin: excelItem.price ? ((excelItem.price - (excelItem.costPrice || existing.costPrice)) / excelItem.price) * 100 : 0 
              }
            ] : existing.priceHistory,

            // Log stock movement for the audit trail
            stockHistory: hasStockChanged ? [
              ...(existing.stockHistory || []),
              {
                date: now,
                type: 'manual',
                change: (excelItem.stockInHand || 0) - existing.stockInHand,
                newBalance: excelItem.stockInHand || 0,
                note: 'Verified Bulk Spreadsheet Update'
              }
            ] : existing.stockHistory
          } as Product;

          currentItems[existingIdx] = updatedProduct;

          // Propagate to Partner if Synced
          if (hasPriceChanged && isSynced && updatedProduct.barcode) {
             const partnerIdx = otherItems.findIndex(p => p.barcode === updatedProduct.barcode && !p.deletedAt);
             if (partnerIdx > -1) {
                const partnerItem = otherItems[partnerIdx];
                const newPrice = updatedProduct.price;
                if (Math.abs(partnerItem.price - newPrice) > 0.001) {
                    otherItems[partnerIdx] = {
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
          }

        } else {
          // Create a brand new record for items not found in current inventory
          const newId = `sku_imp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const newProduct: Product = {
            id: newId,
            name: excelItem.name || 'Imported Product',
            barcode: excelItem.barcode || '',
            productCode: excelItem.productCode || '',
            packSize: excelItem.packSize || '1pk',
            price: excelItem.price || 0,
            costPrice: excelItem.costPrice || 0,
            stockInHand: excelItem.stockInHand || 0,
            stockToKeep: excelItem.stockToKeep || 5,
            partPacks: excelItem.partPacks || 0,
            supplier: excelItem.supplier || '',
            location: excelItem.location || '',
            isDiscontinued: excelItem.isDiscontinued || false,
            isShared: excelItem.isShared || false,
            isPriceSynced: excelItem.isPriceSynced || false,
            enableThresholdAlert: excelItem.enableThresholdAlert || false,
            isReducedToClear: excelItem.isReducedToClear || false,
            expiryDate: excelItem.expiryDate || '',
            stockType: excelItem.stockType || 'retail',
            notes: excelItem.notes || '',
            productImage: excelItem.productImage || null,
            isOrdered: false,
            lastUpdated: now,
            priceHistory: [{ 
              date: now, 
              rrp: excelItem.price || 0, 
              costPrice: excelItem.costPrice || 0, 
              margin: excelItem.price ? ((excelItem.price - (excelItem.costPrice || 0)) / excelItem.price) * 100 : 0 
            }],
            stockHistory: [{ 
              date: now, 
              type: 'manual', 
              change: excelItem.stockInHand || 0, 
              newBalance: excelItem.stockInHand || 0, 
              note: 'Initial Spreadsheet Ingest' 
            }],
            orderHistory: []
          } as Product;

          currentItems.unshift(newProduct); // Add new items to the top of the list
          
          // Note: We don't auto-create partner items on import unless logic dictates, 
          // but if we did, we'd add it to 'otherItems' here. 
          // For now, sync only applies to existing links.
        }
      });

      updatedData[currentBranch] = currentItems;
      updatedData[otherBranch] = otherItems; // Commit partner updates
      return updatedData;
    });
  }, [currentBranch, setBranchData]);

  return { syncImportedData };
}

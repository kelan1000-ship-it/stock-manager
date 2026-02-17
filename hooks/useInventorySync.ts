
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
    
    setBranchData(prev => {
      // Create a fresh copy of the whole state to ensure reference change triggers re-render
      const updatedData = { ...prev };
      const currentItems = [...(prev[currentBranch] || [])];
      
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

          const updatedProduct: Product = {
            ...existing,
            ...excelItem, // Apply all spreadsheet fields (name, pip, cost, supplier, location, etc.)
            lastUpdated: now,

            // Handle label printing triggers
            pendingPriceUpdate: hasPriceChanged ? true : existing.pendingPriceUpdate,
            labelNeedsUpdate: hasPriceChanged ? true : existing.labelNeedsUpdate,
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
        }
      });

      updatedData[currentBranch] = currentItems;
      return updatedData;
    });
  }, [currentBranch, setBranchData]);

  return { syncImportedData };
}

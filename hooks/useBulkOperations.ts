// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import { BranchData, BranchKey, Product, BulkItem, MasterProduct } from '../types';
import { extractMultipleProductsFromImage } from '../services/geminiService';
import { compressImage } from '../utils/imageUtils';
import { toTitleCase } from '../utils/stringUtils';

export function useBulkOperations(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>,
  bulkItems: BulkItem[],
  setBulkItems: React.Dispatch<React.SetStateAction<BulkItem[]>>,
  setIsBulkOpen: (isOpen: boolean) => void,
  setIsAILoading: (isLoading: boolean) => void,
  masterInventory: MasterProduct[] = []
) {
  const addBulkRow = useCallback(() => {
    setBulkItems(prev => [...prev, { tempId: `temp_${Date.now()}`, name: '', barcode: '', status: 'draft' }]);
  }, [setBulkItems]);

  const updateBulkItem = useCallback((tempId: string, updates: Partial<BulkItem>) => {
    setBulkItems(prev => {
      const item = prev.find(i => i.tempId === tempId);
      if (!item) return prev;

      const nextItem = { ...item, ...updates };
      
      // Auto-link logic: If barcode or productCode is updated, check for master match
      // Only trigger if we aren't already linked (originalData absent) or if we are explicitly being told to apply a master record
      if ((updates.barcode || updates.productCode) && !item.originalData) {
          const barcode = updates.barcode || nextItem.barcode;
          const pip = updates.productCode || nextItem.productCode;
          
          const match = masterInventory.find(m => 
              (barcode && barcode.length >= 8 && m.barcode === barcode) || 
              (pip && pip.length >= 6 && m.productCode === pip)
          );

          if (match) {
              const originalData = item.originalData || {
                  name: item.name,
                  barcode: item.barcode,
                  productCode: item.productCode,
                  packSize: item.packSize,
                  priceStr: item.priceStr,
                  costPriceStr: item.costPriceStr
              };

              return prev.map(i => i.tempId === tempId ? {
                  ...nextItem,
                  name: match.name,
                  barcode: match.barcode || nextItem.barcode || '',
                  productCode: match.productCode || nextItem.productCode || '',
                  packSize: match.packSize || nextItem.packSize || '',
                  priceStr: match.price ? match.price.toFixed(2) : (nextItem.priceStr || '0.00'),
                  costPriceStr: match.costPrice ? match.costPrice.toFixed(2) : (nextItem.costPriceStr || '0.00'),
                  originalData: originalData
              } : i);
          }
      }

      return prev.map(i => i.tempId === tempId ? nextItem : i);
    });
  }, [setBulkItems, masterInventory]);

  const removeBulkItem = useCallback((tempId: string) => {
    setBulkItems(prev => prev.filter(i => i.tempId !== tempId));
  }, [setBulkItems]);

  const processBulkImages = useCallback(async (files: FileList | File[]) => {
    setIsAILoading(true);
    
    try {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      
      const results = await Promise.all(
        fileArray.map(async (file, fileIndex) => {
          try {
            // 1. Compress Image
            const compressedDataUrl = await compressImage(file);
            const base64Data = compressedDataUrl.split(',')[1];
            
            // 2. Extract Data
            const products = await extractMultipleProductsFromImage(base64Data, 'image/jpeg');
            
            // 3. Map to BulkItem
            return products.map((p, pIdx) => {
              const cleanField = (val?: string) => {
                if (!val) return '';
                const v = val.trim();
                return (v.toUpperCase() === 'NA' || v.toUpperCase() === 'N/A' || v.toLowerCase() === 'unknown') ? '' : v;
              };

              const barcode = cleanField(p.barcode);
              const pip = cleanField(p.productCode);
              const name = cleanField(p.name);
              const packSize = cleanField(p.packSize);
              const priceStr = p.price ? p.price.replace(/[^\d.]/g, '') : '';

              // Auto-link logic for AI results
              const match = masterInventory.find(m => 
                (barcode && barcode.length >= 8 && m.barcode === barcode) || 
                (pip && pip.length >= 6 && m.productCode === pip)
              );

              const baseItem: BulkItem = {
                tempId: `ai_scan_${Date.now()}_${fileIndex}_${pIdx}`,
                name: match ? match.name : name,
                barcode: match ? (match.barcode || barcode) : barcode,
                productCode: match ? (match.productCode || pip) : pip,
                packSize: match ? (match.packSize || packSize) : packSize,
                priceStr: match && match.price ? match.price.toFixed(2) : priceStr,
                costPriceStr: match && match.costPrice ? match.costPrice.toFixed(2) : '',
                status: 'draft',
                productImage: p.imageUrl || (match ? match.image : undefined)
              };

              // Store original AI data for undo
              if (match) {
                (baseItem as any).originalData = {
                  name,
                  barcode,
                  productCode: pip,
                  packSize,
                  priceStr,
                  costPriceStr: ''
                };
              }

              return baseItem;
            });
            
          } catch (err) {
            console.error(`Failed to process file: ${file.name}`, err);
            return [];
          }
        })
      );

      const allNewItems = results.flat();
      if (allNewItems.length > 0) {
        setBulkItems(prev => [...prev, ...allNewItems]);
      }
      
    } catch (criticalErr) {
      console.error("Bulk AI process critical failure", criticalErr);
    } finally {
      setIsAILoading(false);
    }
  }, [setIsAILoading, setBulkItems]);

  const toggleBulkItemStatus = useCallback((tempId: string) => {
    setBulkItems(prev => prev.map(i => {
      if (i.tempId === tempId) {
        if (i.status !== 'ready' && (!i.name || !i.name.trim())) {
          return i;
        }
        return { ...i, status: i.status === 'ready' ? 'draft' : 'ready' };
      }
      return i;
    }));
  }, [setBulkItems]);

  const markAllBulkItemsReady = useCallback(() => {
    setBulkItems(prev => prev.map(i => {
      if (!i.name || !i.name.trim()) return i;
      return { ...i, status: 'ready' };
    }));
  }, [setBulkItems]);

  const commitReadyBulkItems = useCallback(() => {
    const readyItems = bulkItems.filter(i => i.status === 'ready' && i.name && i.name.trim());
    if (readyItems.length === 0) return;

    setBranchData(prev => {
        const newProducts = readyItems.map(item => {
            return {
                id: `bulk_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: item.name || 'Unknown',
                barcode: item.barcode || '',
                productCode: item.productCode || '',
                packSize: item.packSize || '1pk',
                price: parseFloat(item.priceStr || '0') || 0,
                costPrice: parseFloat(item.costPriceStr || '0') || 0,
                stockInHand: parseInt(item.stockInHandStr || '0') || 0,
                stockToKeep: 0,
                stockType: (item.stockType as any) || 'retail',
                location: toTitleCase(item.location || ''),
                supplier: '',
                isDiscontinued: false,
                isShared: false,
                isPriceSynced: false,
                enableThresholdAlert: false,
                isReducedToClear: false,
                isOrdered: false,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                priceHistory: [],
                stockHistory: [{ date: new Date().toISOString(), type: 'manual', change: parseInt(item.stockInHandStr || '0')||0, newBalance: parseInt(item.stockInHandStr || '0')||0, note: 'Bulk Import' }],
                orderHistory: [],
                productImage: item.productImage || null,
                notes: '',
                tags: []
            } as Product;
        });
        return {
            ...prev,
            [currentBranch]: [...newProducts, ...prev[currentBranch]]
        };
    });

    setBulkItems(prev => prev.filter(i => i.status !== 'ready'));
    setIsBulkOpen(false);
  }, [bulkItems, currentBranch, setBranchData, setBulkItems, setIsBulkOpen]);

  const commitBulkItems = useCallback(() => {
      commitReadyBulkItems();
  }, [commitReadyBulkItems]);

  return {
    addBulkRow,
    updateBulkItem,
    removeBulkItem,
    processBulkImages,
    toggleBulkItemStatus,
    markAllBulkItemsReady,
    commitReadyBulkItems,
    commitBulkItems
  };
}
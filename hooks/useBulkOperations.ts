// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import { BranchData, BranchKey, Product, BulkItem } from '../types';
import { extractMultipleProductsFromImage } from '../services/geminiService';

export function useBulkOperations(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>,
  bulkItems: BulkItem[],
  setBulkItems: React.Dispatch<React.SetStateAction<BulkItem[]>>,
  setIsBulkOpen: (isOpen: boolean) => void,
  setIsAILoading: (isLoading: boolean) => void
) {
  const addBulkRow = useCallback(() => {
    setBulkItems(prev => [...prev, { tempId: `temp_${Date.now()}`, name: '', barcode: '', status: 'draft' }]);
  }, [setBulkItems]);

  const updateBulkItem = useCallback((tempId: string, updates: Partial<BulkItem>) => {
    setBulkItems(prev => prev.map(i => i.tempId === tempId ? { ...i, ...updates } : i));
  }, [setBulkItems]);

  const removeBulkItem = useCallback((tempId: string) => {
    setBulkItems(prev => prev.filter(i => i.tempId !== tempId));
  }, [setBulkItems]);

  const processBulkImages = useCallback(async (files: FileList | File[]) => {
    setIsAILoading(true);
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    
    for (const file of fileArray) {
        try {
            const reader = new FileReader();
            await new Promise<void>((resolve) => {
                reader.onload = async (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    const mimeType = file.type;
                    
                    const products = await extractMultipleProductsFromImage(base64, mimeType);
                    
                    if (products.length > 0) {
                        const newItems: BulkItem[] = products.map((p, idx) => ({
                            tempId: `ai_scan_${Date.now()}_${idx}`,
                            name: p.name || '',
                            barcode: p.barcode || '',
                            packSize: p.packSize,
                            priceStr: p.price ? p.price.replace(/[^\d.]/g, '') : '',
                            status: 'draft',
                            productImage: p.imageUrl
                        }));
                        setBulkItems(prev => [...prev, ...newItems]);
                    }
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        } catch (err) {
            console.error("Bulk process error", err);
        }
    }
    setIsAILoading(false);
  }, [setIsAILoading, setBulkItems]);

  const toggleBulkItemStatus = useCallback((tempId: string) => {
    setBulkItems(prev => prev.map(i => i.tempId === tempId ? { ...i, status: i.status === 'ready' ? 'draft' : 'ready' } : i));
  }, [setBulkItems]);

  const markAllBulkItemsReady = useCallback(() => {
    setBulkItems(prev => prev.map(i => ({ ...i, status: 'ready' })));
  }, [setBulkItems]);

  const commitReadyBulkItems = useCallback(() => {
    const readyItems = bulkItems.filter(i => i.status === 'ready');
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
                stockToKeep: 5,
                stockType: (item.stockType as any) || 'retail',
                location: item.location || '',
                supplier: '',
                isDiscontinued: false,
                isShared: false,
                isPriceSynced: false,
                enableThresholdAlert: false,
                isReducedToClear: false,
                isOrdered: false,
                lastUpdated: new Date().toISOString(),
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
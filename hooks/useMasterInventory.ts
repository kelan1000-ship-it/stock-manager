
// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import { BranchData, MasterProduct } from '../types';
import { matchesAnySearchField } from '../utils/stringUtils';

export function useMasterInventory(
  branchData: BranchData,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  // Cascading lookup: Barcode -> PIP -> Name
  const findMasterRecord = useCallback((criteria: { barcode?: string, productCode?: string, name?: string }) => {
    const inventory = branchData.masterInventory || [];
    const barcode = criteria.barcode?.trim();
    const productCode = criteria.productCode?.trim();
    const name = criteria.name?.trim().toLowerCase();

    // 1. Barcode (Strongest)
    if (barcode) {
      const match = inventory.find(p => p.barcode === barcode);
      if (match) return match;
    }

    // 2. PIP / Product Code (Strong)
    if (productCode) {
      const match = inventory.find(p => p.productCode === productCode);
      if (match) return match;
    }

    // 3. Name (Medium - Case Insensitive)
    if (name) {
      const match = inventory.find(p => p.name.toLowerCase().trim() === name);
      if (match) return match;
    }

    return undefined;
  }, [branchData.masterInventory]);

    const suggestFromMaster = useCallback((query: string) => {
      if (!query) return [];
      
      const results = branchData.masterInventory.filter(p =>
          matchesAnySearchField([p.name, p.barcode, p.productCode], query)
      );
      
      if (results.length > 0) {
          return results.slice(0, 5);
      }
  
      return [];
    }, [branchData.masterInventory]);
  const updateMasterProduct = useCallback((id: string, updates: Partial<MasterProduct>) => {
    setBranchData(prev => ({
        ...prev,
        masterInventory: prev.masterInventory.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  }, [setBranchData]);

  const addMasterProduct = useCallback((product: Omit<MasterProduct, 'id'>) => {
    const newP: MasterProduct = { ...product, id: `master_${Date.now()}` };
    setBranchData(prev => ({ ...prev, masterInventory: [...prev.masterInventory, newP] }));
  }, [setBranchData]);

  const addBulkMasterProducts = useCallback((products: MasterProduct[]) => {
    setBranchData(prev => ({ ...prev, masterInventory: [...prev.masterInventory, ...products] }));
  }, [setBranchData]);

  const upsertBulkMasterProducts = useCallback((products: MasterProduct[]) => {
    setBranchData(prev => {
      const existing = prev.masterInventory || [];
      const updated = [...existing];
      const newProducts: MasterProduct[] = [];

      products.forEach(p => {
        if (!p.id) return; // Skip if somehow no ID was generated
        const index = updated.findIndex(existingItem => existingItem.id === p.id);
        if (index !== -1) {
          updated[index] = { ...updated[index], ...p };
        } else {
          newProducts.push(p);
        }
      });

      return {
        ...prev,
        masterInventory: [...updated, ...newProducts]
      };
    });
  }, [setBranchData]);

  const deleteMasterProduct = useCallback((id: string) => {
    setBranchData(prev => ({ ...prev, masterInventory: prev.masterInventory.filter(p => p.id !== id) }));
  }, [setBranchData]);

  const deleteBulkMasterProducts = useCallback((ids: Set<string>) => {
    setBranchData(prev => ({ ...prev, masterInventory: prev.masterInventory.filter(p => !ids.has(p.id)) }));
  }, [setBranchData]);

  return {
    findMasterRecord,
    suggestFromMaster,
    updateMasterProduct,
    addMasterProduct,
    addBulkMasterProducts,
    upsertBulkMasterProducts,
    deleteMasterProduct,
    deleteBulkMasterProducts
  };
}

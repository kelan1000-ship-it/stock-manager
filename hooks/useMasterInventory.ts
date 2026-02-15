
// Fix: Import React to resolve 'Cannot find namespace React' errors
import React, { useCallback } from 'react';
import { BranchData, MasterProduct } from '../types';

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
    const q = query.toLowerCase();
    return branchData.masterInventory.filter(p => 
        (p.barcode && p.barcode.includes(q)) || 
        (p.productCode && p.productCode.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q))
    ).slice(0, 5);
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
    deleteMasterProduct,
    deleteBulkMasterProducts
  };
}

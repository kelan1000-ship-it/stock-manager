
import React, { useCallback, useMemo } from 'react';
import { BranchData, BranchKey, Product, MasterProduct } from '../types';

export interface MismatchDifference {
  field: 'name' | 'packSize' | 'productCode' | 'image';
  localValue: string;
  masterValue: string;
}

export interface MismatchedItem {
  localId: string;
  masterId: string;
  barcode: string;
  productName: string;
  differences: MismatchDifference[];
}

export interface UnlistedItem {
  localId: string;
  barcode: string;
  name: string;
  packSize: string;
  productCode: string;
  image: string;
  price: number;
  costPrice: number;
}

/**
 * useInventoryReconciliation
 * Compares the current branch inventory against the Master Inventory Catalogue.
 * Matches items by Logical Order: Barcode -> PIP Code -> Product Name.
 * Detects discrepancies in Name, Pack Size, Product Code (PIP), and Image URL.
 * RRP and Cost Price are excluded to allow local variance.
 */
export function useInventoryReconciliation(
  branchData: BranchData,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>,
  currentBranch: BranchKey
) {
  
  const { mismatches, unlistedItems } = useMemo(() => {
    const results: MismatchedItem[] = [];
    const unlisted: UnlistedItem[] = [];
    const localItems = branchData[currentBranch] || [];
    const masterItems = branchData.masterInventory || [];

    // 1. Build Index Maps for Master Catalogue
    const masterByBarcode = new Map<string, MasterProduct>();
    const masterByPip = new Map<string, MasterProduct>();
    const masterByName = new Map<string, MasterProduct>();

    masterItems.forEach(m => {
      if (m.barcode) masterByBarcode.set(m.barcode.trim(), m);
      if (m.productCode) masterByPip.set(m.productCode.trim(), m);
      if (m.name) masterByName.set(m.name.trim().toLowerCase(), m);
    });

    localItems.forEach(local => {
      if (local.deletedAt || local.isArchived) return;

      // Matching Logic: 1. Barcode, 2. PIP, 3. Name
      let master: MasterProduct | undefined;

      if (local.barcode) {
        master = masterByBarcode.get(local.barcode.trim());
      }

      if (!master && local.productCode) {
        master = masterByPip.get(local.productCode.trim());
      }

      if (!master && local.name) {
        master = masterByName.get(local.name.trim().toLowerCase());
      }
      
      if (!master) {
        // Item exists locally but not in master
        unlisted.push({
          localId: local.id,
          barcode: local.barcode || 'No Barcode',
          name: local.name,
          packSize: local.packSize || '',
          productCode: local.productCode || '',
          image: local.productImage || '',
          price: local.price,
          costPrice: local.costPrice
        });
        return;
      }

      const diffs: MismatchDifference[] = [];

      // 1. Name Check
      if (local.name.trim() !== master.name.trim()) {
        diffs.push({ 
          field: 'name', 
          localValue: local.name, 
          masterValue: master.name 
        });
      }

      // 2. Pack Size Check
      const localPack = (local.packSize || '').trim();
      const masterPack = (master.packSize || '').trim();
      if (localPack !== masterPack) {
        diffs.push({
          field: 'packSize',
          localValue: localPack || 'N/A',
          masterValue: masterPack || 'N/A'
        });
      }

      // 3. Product Code (PIP) Check
      const localPip = (local.productCode || '').trim();
      const masterPip = (master.productCode || '').trim();
      if (localPip !== masterPip) {
        diffs.push({
          field: 'productCode',
          localValue: localPip || 'N/A',
          masterValue: masterPip || 'N/A'
        });
      }

      // 4. Image Check
      const localImg = (local.productImage || '').trim();
      const masterImg = (master.image || '').trim();
      if (localImg !== masterImg) {
        const formatImg = (val: string) => {
            if (!val) return 'No Image';
            if (val.startsWith('data:')) return 'Embedded Data';
            if (val.length > 25) return val.substring(0, 22) + '...';
            return val;
        };
        diffs.push({
            field: 'image',
            localValue: formatImg(localImg),
            masterValue: formatImg(masterImg)
        });
      }

      if (diffs.length > 0) {
        results.push({
          localId: local.id,
          masterId: master.id,
          barcode: local.barcode,
          productName: local.name,
          differences: diffs
        });
      }
    });

    return { mismatches: results, unlistedItems: unlisted };
  }, [branchData, currentBranch]);

  /**
   * Pushes Master values TO the Local item.
   * "Trust Master"
   */
  const syncToLocal = useCallback((localId: string) => {
    setBranchData(prev => {
      const items = prev[currentBranch] || [];
      
      const localItem = items.find(i => i.id === localId);
      if (!localItem) return prev;

      // Find Master Item again (since we need it for sync)
      // We repeat the lookup logic here to be safe
      const masterItems = prev.masterInventory || [];
      let masterItem: MasterProduct | undefined;

      if (localItem.barcode) masterItem = masterItems.find(m => m.barcode === localItem.barcode);
      if (!masterItem && localItem.productCode) masterItem = masterItems.find(m => m.productCode === localItem.productCode);
      if (!masterItem && localItem.name) masterItem = masterItems.find(m => m.name.toLowerCase() === localItem.name.toLowerCase());

      if (!masterItem) return prev;

      const now = new Date().toISOString();
      let updatedLocal = { ...localItem };
      let hasChanges = false;

      // Update fields
      if (updatedLocal.name !== masterItem.name) {
        updatedLocal.name = masterItem.name;
        hasChanges = true;
      }

      if ((updatedLocal.packSize || '') !== (masterItem.packSize || '')) {
        updatedLocal.packSize = masterItem.packSize || updatedLocal.packSize;
        hasChanges = true;
      }

      if ((updatedLocal.productCode || '') !== (masterItem.productCode || '')) {
        updatedLocal.productCode = masterItem.productCode || updatedLocal.productCode;
        hasChanges = true;
      }

      if ((updatedLocal.productImage || '') !== (masterItem.image || '')) {
        updatedLocal.productImage = masterItem.image || updatedLocal.productImage;
        hasChanges = true;
      }

      if (hasChanges) {
        updatedLocal.lastUpdated = now;
        return {
          ...prev,
          [currentBranch]: items.map(i => i.id === localId ? updatedLocal : i)
        };
      }

      return prev;
    });
  }, [currentBranch, setBranchData]);

  /**
   * Pushes Local values TO the Master item.
   * "Trust Local / Update Master"
   */
  const syncToMaster = useCallback((localId: string) => {
    setBranchData(prev => {
      const items = prev[currentBranch] || [];
      const masterItems = prev.masterInventory || [];

      const localItem = items.find(i => i.id === localId);
      if (!localItem) return prev;

      let masterItem: MasterProduct | undefined;
      if (localItem.barcode) masterItem = masterItems.find(m => m.barcode === localItem.barcode);
      if (!masterItem && localItem.productCode) masterItem = masterItems.find(m => m.productCode === localItem.productCode);
      if (!masterItem && localItem.name) masterItem = masterItems.find(m => m.name.toLowerCase() === localItem.name.toLowerCase());

      if (!masterItem) return prev;

      // Update Master with Local values
      const updatedMaster = {
        ...masterItem,
        name: localItem.name,
        packSize: localItem.packSize,
        productCode: localItem.productCode,
        image: localItem.productImage
      };

      return {
        ...prev,
        masterInventory: masterItems.map(m => m.id === masterItem.id ? updatedMaster : m)
      };
    });
  }, [currentBranch, setBranchData]);

  /**
   * Adds a local unlisted item to the Master Catalogue
   */
  const addToMaster = useCallback((localId: string) => {
    setBranchData(prev => {
        const items = prev[currentBranch] || [];
        const localItem = items.find(i => i.id === localId);
        
        if (!localItem) return prev;
        
        // Safety check: ensure it doesn't already exist (by barcode)
        if (localItem.barcode && prev.masterInventory.some(m => m.barcode === localItem.barcode)) return prev;

        const newMaster: MasterProduct = {
            id: `master_derived_${Date.now()}`,
            name: localItem.name,
            barcode: localItem.barcode,
            productCode: localItem.productCode,
            packSize: localItem.packSize,
            price: localItem.price,
            costPrice: localItem.costPrice,
            image: localItem.productImage
        };

        return {
            ...prev,
            masterInventory: [newMaster, ...prev.masterInventory]
        };
    });
  }, [currentBranch, setBranchData]);

  return {
    mismatches,
    unlistedItems,
    syncToLocal,
    syncToMaster,
    addToMaster
  };
}

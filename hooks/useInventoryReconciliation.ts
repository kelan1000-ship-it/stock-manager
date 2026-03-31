
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { BranchData, BranchKey, Product, MasterProduct, ReconciliationExclusion } from '../types';
import { diceCoefficient, normalizeString, matchesSearchTerms } from '../utils/stringUtils';

export interface MismatchDifference {
  field: 'name' | 'subheader' | 'packSize' | 'productCode' | 'image';
  localValue: string;
  masterValue: string;
}

export interface MismatchedItem {
  localId: string;
  masterId: string;
  barcode: string;
  productName: string;
  confidence: number;
  differences: MismatchDifference[];
}

export interface UnlistedItem {
  localId: string;
  localIds: string[]; // Grouped IDs for duplicates
  barcode: string;
  name: string;
  packSize: string;
  productCode: string;
  supplier: string;
  image: string;
  price: number;
  costPrice: number;
  duplicateCount: number;
}

/**
 * useInventoryReconciliation
 * Compares the current branch inventory against the Master Inventory Catalogue.
 */
export function useInventoryReconciliation(
  branchData: BranchData,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>,
  currentBranch: BranchKey
) {
  const [matchThreshold, setMatchThreshold] = useState(0.85);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<{
    mismatches: MismatchedItem[];
    unlistedItems: UnlistedItem[];
    matchRate: number;
  }>({ mismatches: [], unlistedItems: [], matchRate: 0 });

  const [exclusions, setExclusions] = useState<ReconciliationExclusion[]>(() => {
    const saved = localStorage.getItem('greenchem-reconcile-exclusions');
    return saved ? JSON.parse(saved) : [];
  });

  const refresh = useCallback(() => setRefreshKey(prev => prev + 1), []);

  const addExclusion = useCallback((ex: Omit<ReconciliationExclusion, 'id'>) => {
    const newEx = { ...ex, id: `ex_${Date.now()}` };
    setExclusions(prev => {
      const next = [...prev, newEx];
      localStorage.setItem('greenchem-reconcile-exclusions', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeExclusion = useCallback((id: string) => {
    setExclusions(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem('greenchem-reconcile-exclusions', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const calculate = async () => {
      setIsCalculating(true);
      
      const mismatches: MismatchedItem[] = [];
      const localItems = branchData[currentBranch] || [];
      const masterItems = branchData.masterInventory || [];

      // Helper for fuzzy bigrams
      const getBigrams = (s: string) => {
        if (s.length < 2) return new Set<string>();
        const bigrams = new Set<string>();
        for (let i = 0; i < s.length - 1; i++) {
          bigrams.add(s.substring(i, i + 2));
        }
        return bigrams;
      };

      // 1. Build Index Maps
      const masterByBarcode = new Map<string, MasterProduct>();
      const masterByPip = new Map<string, MasterProduct>();
      const masterByNamePack = new Map<string, MasterProduct>();
      
      // Pre-calculate master data for fast matching
      const masterBigramData = masterItems.map(m => ({
        item: m,
        nameClean: normalizeString(m.name),
        bigrams: getBigrams(normalizeString(m.name))
      }));

      masterItems.forEach(m => {
        const barcode = (m.barcode || '').trim();
        const pip = (m.productCode || '').trim();
        const name = normalizeString(m.name);
        const pack = normalizeString(m.packSize || '');

        if (barcode) masterByBarcode.set(barcode, m);
        if (pip) masterByPip.set(pip, m);
        if (name) masterByNamePack.set(`${name}|${pack}`, m);
      });

      // Filter active items - ONLY RETAIL
      const activeLocalItems = localItems.filter(l => {
        if (l.deletedAt || l.isArchived) return false;
        if (l.stockType !== 'retail') return false; // Filter out dispensary stock
        for (const ex of exclusions) {
          if (ex.type === 'barcode' && l.barcode === ex.value) return false;
          if (ex.type === 'name' && matchesSearchTerms(l.name, ex.value)) return false;
          if (ex.type === 'rule' && ex.ruleConfig) {
            const { field, operator, threshold } = ex.ruleConfig;
            const val = (l as any)[field];
            if (operator === 'lt' && typeof val === 'number' && val < Number(threshold)) return false;
            if (operator === 'gt' && typeof val === 'number' && val > Number(threshold)) return false;
            if (operator === 'eq' && String(val) === String(threshold)) return false;
            if (operator === 'contains' && matchesSearchTerms(String(val), String(threshold))) return false;
          }
        }
        return true;
      });

      let matchCount = 0;
      const matchedLocalIds = new Set<string>();

      // CHUNKED PROCESSING (30 items per frame) to avoid blocking UI
      const chunkSize = 30;
      for (let i = 0; i < activeLocalItems.length; i += chunkSize) {
        if (!isMounted) return;
        
        const chunk = activeLocalItems.slice(i, i + chunkSize);
        
        chunk.forEach(local => {
          let master: MasterProduct | undefined;
          let confidence = 1;

          // Priority 1: Direct Identifiers
          if (local.barcode) master = masterByBarcode.get(local.barcode.trim());
          if (!master && local.productCode) master = masterByPip.get(local.productCode.trim());

          // Priority 2: Exact Name + PackSize (normalized)
          if (!master && local.name) {
            const nameKey = `${normalizeString(local.name)}|${normalizeString(local.packSize || '')}`;
            master = masterByNamePack.get(nameKey);
            if (master) confidence = 0.98;
          }

          // Priority 3: Fuzzy Name match fallback
          if (!master && local.name) {
            const localClean = normalizeString(local.name);
            const localBigrams = getBigrams(localClean);
            let bestScore = 0;
            let bestMatch: MasterProduct | undefined;
            
            for (const mData of masterBigramData) {
              if (localClean === mData.nameClean) {
                bestScore = 1;
                bestMatch = mData.item;
                break;
              }
              let intersect = 0;
              for (const b of localBigrams) {
                if (mData.bigrams.has(b)) intersect++;
              }
              const score = (2 * intersect) / (localBigrams.size + mData.bigrams.size);
              if (score > bestScore) {
                bestScore = score;
                bestMatch = mData.item;
              }
            }
            if (bestScore >= matchThreshold) {
              master = bestMatch;
              confidence = bestScore;
            }
          }

          if (master) {
            matchCount++;
            matchedLocalIds.add(local.id);
            const diffs: MismatchDifference[] = [];
            if (local.name.trim() !== master.name.trim()) diffs.push({ field: 'name', localValue: local.name, masterValue: master.name });
            const localSub = (local.subheader || '').trim();
            const masterSub = (master.subheader || '').trim();
            if (localSub !== masterSub) diffs.push({ field: 'subheader', localValue: localSub || 'N/A', masterValue: masterSub || 'N/A' });
            const localPack = (local.packSize || '').trim();
            const masterPack = (master.packSize || '').trim();
            if (localPack !== masterPack) diffs.push({ field: 'packSize', localValue: localPack || 'N/A', masterValue: masterPack || 'N/A' });
            const localPip = (local.productCode || '').trim();
            const masterPip = (master.productCode || '').trim();
            if (localPip !== masterPip) diffs.push({ field: 'productCode', localValue: localPip || 'N/A', masterValue: masterPip || 'N/A' });
            
            const localImg = (local.productImage || '').trim();
            const masterImg = (master.image || '').trim();
            if (localImg !== masterImg) {
              const formatImg = (val: string) => {
                  if (!val) return 'No Image';
                  if (val.startsWith('data:')) return 'Embedded Data';
                  if (val.length > 25) return val.substring(0, 22) + '...';
                  return val;
              };
              diffs.push({ field: 'image', localValue: formatImg(localImg), masterValue: formatImg(masterImg) });
            }

            if (diffs.length > 0) {
              mismatches.push({ localId: local.id, masterId: master.id, barcode: local.barcode, productName: local.name, confidence, differences: diffs });
            }
          }
        });

        // Yield control back to the browser
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Final unlisted grouping
      const unlistedGrouped = new Map<string, UnlistedItem>();
      activeLocalItems.forEach(local => {
        if (matchedLocalIds.has(local.id)) return;
        const key = local.barcode || `${normalizeString(local.name)}|${normalizeString(local.packSize || '')}`;
        const existing = unlistedGrouped.get(key);
        if (existing) {
          existing.localIds.push(local.id);
          existing.duplicateCount++;
        } else {
          unlistedGrouped.set(key, {
            localId: local.id, localIds: [local.id], barcode: local.barcode || 'No Barcode', name: local.name,
            packSize: local.packSize || '', productCode: local.productCode || '', 
            supplier: local.supplier || '',
            image: local.productImage || '',
            price: local.price, costPrice: local.costPrice, duplicateCount: 1
          });
        }
      });

      if (isMounted) {
        setResults({
          mismatches,
          unlistedItems: Array.from(unlistedGrouped.values()),
          matchRate: activeLocalItems.length > 0 ? (matchCount / activeLocalItems.length) * 100 : 100
        });
        setIsCalculating(false);
      }
    };

    calculate();
    return () => { isMounted = false; };
  }, [branchData, currentBranch, matchThreshold, refreshKey, exclusions]);

  /**
   * Trusts Master values
   */
  const syncToLocal = useCallback((localId: string) => {
    setBranchData(prev => {
      const items = prev[currentBranch] || [];
      const localItem = items.find(i => i.id === localId);
      if (!localItem) return prev;

      const masterItems = prev.masterInventory || [];
      let masterItem: MasterProduct | undefined;

      // Use the same robust lookup
      if (localItem.barcode) masterItem = masterItems.find(m => m.barcode === localItem.barcode);
      if (!masterItem && localItem.productCode) masterItem = masterItems.find(m => m.productCode === localItem.productCode);
      if (!masterItem && localItem.name) {
          let bestScore = 0;
          for (const m of masterItems) {
            const score = diceCoefficient(localItem.name, m.name);
            if (score > bestScore) {
              bestScore = score;
              masterItem = m;
            }
          }
          if (bestScore < matchThreshold) masterItem = undefined;
      }

      if (!masterItem) return prev;

      const now = new Date().toISOString();
      const updatedLocal = {
        ...localItem,
        name: masterItem.name,
        subheader: masterItem.subheader || localItem.subheader,
        packSize: masterItem.packSize || localItem.packSize,
        productCode: masterItem.productCode || localItem.productCode,
        productImage: masterItem.image || localItem.productImage,
        supplier: masterItem.supplier || localItem.supplier,
        lastUpdated: now
      };

      return {
        ...prev,
        [currentBranch]: items.map(i => i.id === localId ? updatedLocal : i)
      };
    });
  }, [currentBranch, setBranchData, matchThreshold]);

  /**
   * Trusts Local values
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
      if (!masterItem && localItem.name) {
          let bestScore = 0;
          for (const m of masterItems) {
            const score = diceCoefficient(localItem.name, m.name);
            if (score > bestScore) {
              bestScore = score;
              masterItem = m;
            }
          }
          if (bestScore < matchThreshold) masterItem = undefined;
      }

      if (!masterItem) return prev;

      const updatedMaster = {
        ...masterItem,
        name: localItem.name,
        subheader: localItem.subheader,
        packSize: localItem.packSize,
        productCode: localItem.productCode,
        image: localItem.productImage,
        supplier: localItem.supplier
      };

      return {
        ...prev,
        masterInventory: masterItems.map(m => m.id === masterItem.id ? updatedMaster : m)
      };
    });
  }, [currentBranch, setBranchData, matchThreshold]);

  /**
   * Adds grouped local unlisted items to the Master Catalogue
   */
  const addToMaster = useCallback((localId: string) => {
    setBranchData(prev => {
        const items = prev[currentBranch] || [];
        const localItem = items.find(i => i.id === localId);
        
        if (!localItem) return prev;
        
        // Idempotency check: ensure it doesn't already exist
        const alreadyExists = prev.masterInventory.some(m => 
            (localItem.barcode && m.barcode === localItem.barcode) ||
            (localItem.productCode && m.productCode === localItem.productCode) ||
            (normalizeString(localItem.name) === normalizeString(m.name))
        );

        if (alreadyExists) return prev;

        const newMaster: MasterProduct = {
            id: `master_derived_${Date.now()}`,
            name: localItem.name,
            subheader: localItem.subheader,
            barcode: localItem.barcode,
            productCode: localItem.productCode,
            packSize: localItem.packSize,
            price: localItem.price,
            costPrice: localItem.costPrice,
            supplier: localItem.supplier,
            image: localItem.productImage
        };

        return {
            ...prev,
            masterInventory: [newMaster, ...prev.masterInventory]
        };
    });
  }, [currentBranch, setBranchData]);

  return {
    mismatches: results.mismatches,
    unlistedItems: results.unlistedItems,
    matchRate: results.matchRate,
    isCalculating,
    matchThreshold,
    setMatchThreshold,
    exclusions,
    refresh,
    addExclusion,
    removeExclusion,
    syncToLocal,
    syncToMaster,
    addToMaster
  };
}


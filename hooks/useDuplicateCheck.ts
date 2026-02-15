
import { useMemo, useCallback } from 'react';
import { BranchData, BranchKey, Product } from '../types';

/**
 * Hook to identify if a product barcode already exists in the other site's inventory.
 */
export function useDuplicateCheck(branchData: BranchData, currentBranch: BranchKey) {
  const otherBranchKey: BranchKey = currentBranch === 'bywood' ? 'broom' : 'bywood';
  const otherInventory = branchData[otherBranchKey] || [];

  const findCrossSiteMatch = useCallback((barcode: string): Product | null => {
    if (!barcode || barcode.trim() === '') return null;
    return otherInventory.find(p => p.barcode === barcode && !p.deletedAt) || null;
  }, [otherInventory]);

  return {
    findCrossSiteMatch,
    otherBranchName: otherBranchKey === 'bywood' ? 'Bywood' : 'Broom Road'
  };
}

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../components/store';
import { BranchKey, Product } from '../types';
import { findProductMatches } from '../utils/productMatching';

export interface BranchStockSummary {
  full: number;
  parts: number;
}

export const selectMessages = (state: RootState) => state.stock.messages;

export const selectTransfers = (state: RootState) => state.stock.transfers;

export const selectBranchInventory = (branch: BranchKey) =>
  (state: RootState): Product[] => state.stock[branch];

/**
 * Factory that returns a memoized selector for a specific branch + product combination.
 * Create the selector instance once per component mount with useMemo:
 *   const sel = useMemo(() => makeSelectBranchStockForProduct(branch, product), [branch, product]);
 *   const stock = useAppSelector(sel);
 */
export const makeSelectBranchStockForProduct = (
  branch: BranchKey,
  product: Product | null
): (state: RootState) => BranchStockSummary =>
  createSelector(
    (state: RootState): Product[] => state.stock[branch],
    (inventory): BranchStockSummary => {
      if (!product) return { full: 0, parts: 0 };
      try {
        const matches = findProductMatches(inventory, product);
        return {
          full: matches.reduce((acc, m) => acc + m.stockInHand, 0),
          parts: matches.reduce((acc, m) => acc + (m.partPacks || 0), 0),
        };
      } catch {
        return { full: 0, parts: 0 };
      }
    }
  );

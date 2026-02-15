
import { useMemo } from 'react';
import { Product } from '../types';

/**
 * useMultiKeyLookup - Modular hook to find products by Name, Barcode, or PIP Code.
 * Matches cross-site inventory based on business identifiers.
 */
export function useMultiKeyLookup(
  criteria: { name?: string; barcode?: string; productCode?: string }, 
  fullInventory: Product[]
) {
  const searchName = criteria.name?.trim().toLowerCase();
  const searchBarcode = criteria.barcode?.trim().toLowerCase();
  const searchPip = criteria.productCode?.trim().toLowerCase();

  return useMemo(() => {
    if (!fullInventory || fullInventory.length === 0) {
      return [];
    }

    return fullInventory.filter(item => {
      // Match by Barcode (Strongest)
      if (searchBarcode && item.barcode && item.barcode.toLowerCase() === searchBarcode) {
        return true;
      }
      
      // Match by Product Code / PIP (Strong)
      if (searchPip && item.productCode && item.productCode.toLowerCase() === searchPip) {
        return true;
      }

      // Match by Exact Name (Medium)
      if (searchName && item.name && item.name.toLowerCase() === searchName) {
        return true;
      }

      return false;
    });
  }, [searchName, searchBarcode, searchPip, fullInventory]);
}

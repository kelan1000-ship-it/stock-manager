import { useState, useMemo, useCallback } from 'react';
import { Product } from '../types';

export type SupplierFilterMode = 'show' | 'hide';

/**
 * Custom hook to filter an array of products by supplier.
 * Extracts unique suppliers from the data and provides multi-select filtering logic.
 * Now supports 'show' (inclusive) and 'hide' (exclusive) modes.
 */
export function useSupplierFilter(data: Product[]) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<SupplierFilterMode>('show');

  // Extract unique suppliers from the current data set
  const uniqueSuppliers = useMemo(() => {
    const suppliers = data
      .map(item => item.supplier || 'no set supplier');
    
    // Create unique set and sort alphabetically
    return Array.from(new Set(suppliers)).sort();
  }, [data]);

  const toggleSupplierFilter = useCallback((supplier: string) => {
    setSelectedSuppliers(prev => {
      if (prev.includes(supplier)) {
        return prev.filter(s => s !== supplier);
      }
      return [...prev, supplier];
    });
  }, []);

  const clearSupplierFilters = useCallback(() => {
    setSelectedSuppliers([]);
  }, []);

  const toggleFilterMode = useCallback(() => {
    setFilterMode(prev => (prev === 'show' ? 'hide' : 'show'));
  }, []);

  // Filter the data based on selection and mode
  const filteredData = useMemo(() => {
    if (selectedSuppliers.length === 0) {
      return data;
    }
    
    return data.filter(item => {
      const s = item.supplier || 'no set supplier';
      if (filterMode === 'show') {
        return selectedSuppliers.includes(s);
      } else {
        // Hide mode: exclude selected suppliers
        return !selectedSuppliers.includes(s);
      }
    });
  }, [data, selectedSuppliers, filterMode]);

  return {
    uniqueSuppliers,
    selectedSuppliers,
    filterMode,
    toggleSupplierFilter,
    clearSupplierFilters,
    setFilterMode,
    toggleFilterMode,
    filteredData
  };
}

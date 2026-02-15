
import { useState, useMemo } from 'react';
import { Product } from '../types';

/**
 * Custom hook to filter an array of products by supplier.
 * Extracts unique suppliers from the data and provides filtering logic.
 */
export function useSupplierFilter(data: Product[]) {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All Suppliers');

  // Extract unique suppliers from the current data set
  const uniqueSuppliers = useMemo(() => {
    const suppliers = data
      .map(item => item.supplier)
      .filter((s): s is string => !!s);
    
    // Create unique set and sort alphabetically, keeping 'All Suppliers' at the top
    const unique = Array.from(new Set(suppliers)).sort();
    return ['All Suppliers', ...unique];
  }, [data]);

  // Filter the data based on selection
  const filteredData = useMemo(() => {
    if (selectedSupplier === 'All Suppliers') {
      return data;
    }
    return data.filter(item => item.supplier === selectedSupplier);
  }, [data, selectedSupplier]);

  return {
    uniqueSuppliers,
    selectedSupplier,
    setSelectedSupplier,
    filteredData
  };
}

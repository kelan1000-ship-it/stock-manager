import { useState, useMemo, useCallback } from 'react';
import { Product } from '../types';

export type LocationFilterMode = 'show' | 'hide';

/**
 * Custom hook to filter an array of products by location.
 */
export function useLocationFilter(data: Product[]) {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<LocationFilterMode>('show');

  // Extract unique locations from the current data set
  const uniqueLocations = useMemo(() => {
    const locations = data
      .map(item => item.location)
      .filter(Boolean) as string[];
    
    // Create unique set and sort alphabetically
    return Array.from(new Set(locations)).sort();
  }, [data]);

  const toggleLocationFilter = useCallback((location: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(location)) {
        return prev.filter(l => l !== location);
      }
      return [...prev, location];
    });
  }, []);

  const clearLocationFilters = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  const toggleFilterMode = useCallback(() => {
    setFilterMode(prev => (prev === 'show' ? 'hide' : 'show'));
  }, []);

  // Filter the data based on selection and mode
  const filteredData = useMemo(() => {
    if (selectedLocations.length === 0) {
      return data;
    }
    
    return data.filter(item => {
      const l = item.location;
      if (!l) return filterMode === 'hide'; // Show if hiding and no location, or hide if showing and no location
      
      if (filterMode === 'show') {
        return selectedLocations.includes(l);
      } else {
        return !selectedLocations.includes(l);
      }
    });
  }, [data, selectedLocations, filterMode]);

  return {
    uniqueLocations,
    selectedLocations,
    filterMode,
    toggleLocationFilter,
    clearLocationFilters,
    setFilterMode,
    toggleFilterMode,
    filteredData
  };
}

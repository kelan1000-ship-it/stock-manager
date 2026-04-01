
import React, { useState, useCallback, useMemo } from 'react';

/**
 * A generic hook for managing item selection in lists.
 * Optimized for performance with large datasets using Set.
 */
export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((specificIds?: string[] | React.MouseEvent) => {
    let idsToUse = items.map((i) => i.id);
    if (specificIds && Array.isArray(specificIds)) {
      idsToUse = specificIds;
    }
    
    const areAllInCurrentListSelected = idsToUse.length > 0 && idsToUse.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (areAllInCurrentListSelected) {
        // If all items in the current view are already selected, deselect them
        idsToUse.forEach(id => next.delete(id));
      } else {
        // Otherwise, select all items in the current view
        idsToUse.forEach(id => next.add(id));
      }
      return next;
    });
  }, [items, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && items.every(i => selectedIds.has(i.id));
  }, [items, selectedIds]);

  const selectionCount = useMemo(() => {
    // We only count selections that exist in the CURRENT items list
    // This prevents "hidden" selections from confusing the user
    const itemIds = new Set(items.map(i => i.id));
    let count = 0;
    selectedIds.forEach(id => {
      if (itemIds.has(id)) count++;
    });
    return count;
  }, [items, selectedIds]);

  return {
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isAllSelected,
    selectionCount
  };
}

import { useState, useCallback } from 'react';

/**
 * useProductNotes - Manages the visibility of internal product notes in a list view.
 * Uses a Set for efficient tracking of multiple expanded rows.
 */
export function useProductNotes() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleNote = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isNoteExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  return {
    expandedIds,
    toggleNote,
    isNoteExpanded
  };
}
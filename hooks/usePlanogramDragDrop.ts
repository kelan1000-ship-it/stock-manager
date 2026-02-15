
import React, { useState, useCallback } from 'react';

export function usePlanogramDragDrop(
  onUpdateSlot: (slotId: number, productId: string | null, faceId?: string) => void,
  onSwapSlots: (sourceId: number, targetId: number, sourceFaceId?: string, targetFaceId?: string) => void
) {
  // We need to track the source face ID if dragging from another slot
  const [draggedItem, setDraggedItem] = useState<{ type: 'library' | 'shelf' | 'floor_tool', id: string | number, faceId?: string } | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, type: 'library' | 'shelf' | 'floor_tool', id: string | number, faceId?: string) => {
    setDraggedItem({ type, id, faceId });
    // Use lowercase, namespaced types for better browser compatibility
    e.dataTransfer.setData('application/x-greenchem-type', type);
    e.dataTransfer.setData('application/x-greenchem-id', id.toString());
    if (faceId) e.dataTransfer.setData('application/x-greenchem-face-id', faceId);
    
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.dropEffect = type === 'floor_tool' ? 'copy' : 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverSlotId(null);
  }, []);

  const handleDropOnSlot = useCallback((e: React.DragEvent, slotId: number, targetFaceId?: string) => {
    e.preventDefault();
    setDragOverSlotId(null);

    // Try to get data from state first (reliable in-app), then fallback to dataTransfer
    const transferType = e.dataTransfer.getData('application/x-greenchem-type');
    const transferId = e.dataTransfer.getData('application/x-greenchem-id');
    const transferFaceId = e.dataTransfer.getData('application/x-greenchem-face-id');

    const type = draggedItem?.type || transferType;
    const id = draggedItem?.id || transferId;
    const sourceFaceId = draggedItem?.faceId || transferFaceId;

    if (!type || !id) return;

    if (type === 'library') {
      onUpdateSlot(slotId, id.toString(), targetFaceId);
    } else if (type === 'shelf') {
      const sourceSlotId = parseInt(id.toString());
      if (!isNaN(sourceSlotId)) {
        // Only swap if source and target are different (different slot OR different face)
        if (sourceSlotId !== slotId || sourceFaceId !== targetFaceId) {
           onSwapSlots(sourceSlotId, slotId, sourceFaceId, targetFaceId);
        }
      }
    }
    
    setDraggedItem(null);
  }, [draggedItem, onUpdateSlot, onSwapSlots]);

  return {
    draggedItem,
    setDraggedItem,
    dragOverSlotId,
    setDragOverSlotId,
    handleDragStart,
    handleDragEnd,
    handleDropOnSlot
  };
}

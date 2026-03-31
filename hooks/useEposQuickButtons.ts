import { useState, useEffect, useCallback } from 'react';
import { EposQuickButton, BranchKey } from '../types';
import { subscribeToEposQuickButtons, saveEposQuickButton, deleteEposQuickButton } from '../services/firestoreService';

export function useEposQuickButtons(currentBranch: BranchKey) {
  const [buttons, setButtons] = useState<EposQuickButton[]>([]);

  useEffect(() => {
    const unsub = subscribeToEposQuickButtons(currentBranch, (data) => {
      setButtons(data.sort((a, b) => a.sortOrder - b.sortOrder));
    });
    return () => unsub();
  }, [currentBranch]);

  const saveButton = useCallback(async (button: EposQuickButton) => {
    await saveEposQuickButton(currentBranch, button);
  }, [currentBranch]);

  const removeButton = useCallback(async (id: string) => {
    await deleteEposQuickButton(currentBranch, id);
  }, [currentBranch]);

  const reorderButtons = useCallback(async (reordered: EposQuickButton[]) => {
    for (let i = 0; i < reordered.length; i++) {
      const updated = { ...reordered[i], sortOrder: i };
      await saveEposQuickButton(currentBranch, updated);
    }
  }, [currentBranch]);

  return { buttons, saveButton, removeButton, reorderButtons };
}

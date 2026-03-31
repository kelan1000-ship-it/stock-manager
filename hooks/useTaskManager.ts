
import { useCallback } from 'react';
import { BranchData, BranchKey, BranchTask } from '../types';

export function useTaskManager(
  currentBranch: BranchKey,
  setBranchData: React.Dispatch<React.SetStateAction<BranchData>>
) {
  const addTask = useCallback((task: Omit<BranchTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    const now = new Date().toISOString();
    const newTask: BranchTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdBy: currentBranch,
      createdAt: now,
      updatedAt: now
    };

    setBranchData(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask]
    }));
  }, [currentBranch, setBranchData]);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<BranchTask, 'id' | 'createdAt' | 'createdBy'>>) => {
    const now = new Date().toISOString();
    setBranchData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => 
        t.id === taskId ? { ...t, ...updates, updatedAt: now } : t
      )
    }));
  }, [setBranchData]);

  const deleteTask = useCallback((taskId: string) => {
    setBranchData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== taskId)
    }));
  }, [setBranchData]);

  return {
    addTask,
    updateTask,
    deleteTask
  };
}

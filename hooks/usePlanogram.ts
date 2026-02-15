
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PlanogramLayout, PlanogramSlot, BranchKey, BranchData, Product, ShopFloor, ShopFloorItem, PlanogramFace } from '../types';

export function usePlanogram(branchData: BranchData, setBranchData: React.Dispatch<React.SetStateAction<BranchData>>, currentBranch: BranchKey) {
  const [activePlanogramId, setActivePlanogramId] = useState<string | null>(null);

  // Initialize planograms and floor plans if they don't exist
  useEffect(() => {
    let updates: Partial<BranchData> = {};
    
    if (!branchData.planograms || branchData.planograms.length === 0) {
      const defaultLayout: PlanogramLayout = {
        id: 'default-main-shelf',
        name: 'Main Retail Shelf',
        branch: currentBranch,
        cols: 4,
        rows: 5,
        location: 'Pharmacy Front',
        description: 'Standard retail layout for essential medicines.',
        slots: Array.from({ length: 20 }, (_, i) => ({ id: i, productId: null })),
        realShelfImage: null,
        aiVisualisation: null
      };
      updates.planograms = [defaultLayout];
      setActivePlanogramId(defaultLayout.id);
    } else if (!activePlanogramId) {
      setActivePlanogramId(branchData.planograms[0]?.id || null);
    }

    if (!branchData.floorPlans || branchData.floorPlans.length === 0) {
      const defaultFloor: ShopFloor = {
        id: `fp_${currentBranch}`,
        branch: currentBranch,
        items: []
      };
      updates.floorPlans = [defaultFloor];
    }

    if (Object.keys(updates).length > 0) {
      setBranchData(prev => ({ ...prev, ...updates }));
    }
  }, [branchData.planograms, branchData.floorPlans, currentBranch, setBranchData, activePlanogramId]);

  const activePlanogram = useMemo(() => {
    return branchData.planograms?.find(p => p.id === activePlanogramId) || null;
  }, [branchData.planograms, activePlanogramId]);

  const activeFloorPlan = useMemo(() => {
    return branchData.floorPlans?.find(f => f.branch === currentBranch) || null;
  }, [branchData.floorPlans, currentBranch]);

  const updateSlot = useCallback((slotId: number, productId: string | null, faceId?: string) => {
    if (!activePlanogramId) return;

    setBranchData(prev => {
      if (!prev.planograms) return prev;
      return {
        ...prev,
        planograms: prev.planograms.map(p => {
          if (p.id !== activePlanogramId) return p;
          
          if (faceId && p.faces) {
            // Update specific face
            const newFaces = p.faces.map(f => {
              if (f.id === faceId) {
                const newSlots = f.slots.map(s => s.id === slotId ? { ...s, productId } : s);
                return { ...f, slots: newSlots };
              }
              return f;
            });
            return { ...p, faces: newFaces };
          } else {
            // Update default face
            const newSlots = p.slots.map(s => s.id === slotId ? { ...s, productId } : s);
            return { ...p, slots: newSlots };
          }
        })
      };
    });
  }, [activePlanogramId, setBranchData]);

  const updatePlanogramImage = useCallback((imageUrl: string | null) => {
    if (!activePlanogramId) return;
    setBranchData(prev => ({
      ...prev,
      planograms: prev.planograms?.map(p => 
        p.id === activePlanogramId ? { ...p, realShelfImage: imageUrl } : p
      )
    }));
  }, [activePlanogramId, setBranchData]);

  const updateAiVisualisation = useCallback((imageUrl: string | null) => {
    if (!activePlanogramId) return;
    setBranchData(prev => ({
      ...prev,
      planograms: prev.planograms?.map(p => 
        p.id === activePlanogramId ? { ...p, aiVisualisation: imageUrl } : p
      )
    }));
  }, [activePlanogramId, setBranchData]);

  const swapSlots = useCallback((sourceId: number, targetId: number, sourceFaceId?: string, targetFaceId?: string) => {
    if (!activePlanogramId) return;

    setBranchData(prev => {
      if (!prev.planograms) return prev;
      return {
        ...prev,
        planograms: prev.planograms.map(p => {
          if (p.id !== activePlanogramId) return p;

          // Helper to get slot
          const getSlot = (sId: number, fId?: string) => {
            if (fId && p.faces) {
              const face = p.faces.find(f => f.id === fId);
              return face?.slots.find(s => s.id === sId) || null;
            }
            return p.slots.find(s => s.id === sId) || null;
          };

          const sourceSlot = getSlot(sourceId, sourceFaceId);
          const targetSlot = getSlot(targetId, targetFaceId);

          const sourceProduct = sourceSlot?.productId || null;
          const targetProduct = targetSlot?.productId || null;

          // Helper to update specific slot
          const updateSlotInStructure = (sId: number, fId: string | undefined, prodId: string | null, currentFaces: PlanogramFace[], currentSlots: PlanogramSlot[]) => {
             if (fId && currentFaces) {
                return {
                   faces: currentFaces.map(f => {
                      if (f.id === fId) {
                         return { ...f, slots: f.slots.map(s => s.id === sId ? { ...s, productId: prodId } : s) };
                      }
                      return f;
                   }),
                   slots: currentSlots
                };
             } else {
                return {
                   faces: currentFaces,
                   slots: currentSlots.map(s => s.id === sId ? { ...s, productId: prodId } : s)
                };
             }
          };

          let faces = p.faces || [];
          let slots = p.slots;

          // Perform swap logic
          // 1. Update Source with Target Product
          let res = updateSlotInStructure(sourceId, sourceFaceId, targetProduct, faces, slots);
          faces = res.faces;
          slots = res.slots;

          // 2. Update Target with Source Product
          res = updateSlotInStructure(targetId, targetFaceId, sourceProduct, faces, slots);
          faces = res.faces;
          slots = res.slots;

          return { ...p, faces, slots };
        })
      };
    });
  }, [activePlanogramId, setBranchData]);

  const addPlanogram = useCallback((name: string, rows: number, cols: number, location?: string, description?: string) => {
    const newP: PlanogramLayout = {
      id: `pl_${Date.now()}`,
      name,
      branch: currentBranch,
      rows,
      cols,
      location,
      description,
      slots: Array.from({ length: rows * cols }, (_, i) => ({ id: i, productId: null })),
      faces: [], // Start with empty faces, relying on main slots as "Face 1" effectively, or migrate immediately?
      realShelfImage: null,
      aiVisualisation: null
    };
    setBranchData(prev => ({
      ...prev,
      planograms: [...(prev.planograms || []), newP]
    }));
    setActivePlanogramId(newP.id);
  }, [currentBranch, setBranchData]);

  const addFaceToPlanogram = useCallback((planogramId: string, name: string, rows: number, cols: number) => {
    setBranchData(prev => {
        if (!prev.planograms) return prev;
        return {
            ...prev,
            planograms: prev.planograms.map(p => {
                if (p.id !== planogramId) return p;
                
                // If it's the first additional face, we might want to migrate the "main" slots to be the first face?
                // For simplicity, let's keep "slots" as the default/primary face, and "faces" as additional.
                // OR: We define that if `faces` has length, we strictly use faces. 
                // Let's adopt: `faces` stores additional sides. Main slots is always the "Primary" or "Side A".
                // BUT the user wants "3 or 4 sides".
                // Best approach: If we add a face, we create a new face object.
                
                const newFace: PlanogramFace = {
                    id: `face_${Date.now()}`,
                    name: name || `Side ${ (p.faces?.length || 0) + 2 }`, // +2 because main is 1
                    rows,
                    cols,
                    slots: Array.from({ length: rows * cols }, (_, i) => ({ id: i, productId: null }))
                };

                return { ...p, faces: [...(p.faces || []), newFace] };
            })
        };
    });
  }, [setBranchData]);

  const removeFace = useCallback((planogramId: string, faceId: string) => {
      setBranchData(prev => {
          if (!prev.planograms) return prev;
          return {
              ...prev,
              planograms: prev.planograms.map(p => {
                  if (p.id !== planogramId) return p;
                  return { ...p, faces: (p.faces || []).filter(f => f.id !== faceId) };
              })
          };
      });
  }, [setBranchData]);

  const updatePlanogramDetails = useCallback((id: string, updates: { name: string; rows: number; cols: number }, faceId?: string) => {
    setBranchData(prev => {
      if (!prev.planograms) return prev;
      return {
        ...prev,
        planograms: prev.planograms.map(p => {
          if (p.id !== id) return p;
          
          const updateGrid = (currentSlots: PlanogramSlot[], oldRows: number, oldCols: number) => {
             const newRows = updates.rows;
             const newCols = updates.cols;
             
             if (oldRows === newRows && oldCols === newCols) return currentSlots;

             const newSlots: PlanogramSlot[] = Array.from({ length: newRows * newCols }, (_, i) => ({ 
                 id: i, 
                 productId: null 
             }));

             currentSlots.forEach(slot => {
                if (slot.productId) {
                   const r = Math.floor(slot.id / oldCols);
                   const c = slot.id % oldCols;
                   if (r < newRows && c < newCols) {
                      const newIndex = r * newCols + c;
                      if (newSlots[newIndex]) newSlots[newIndex].productId = slot.productId;
                   }
                }
             });
             return newSlots;
          };

          if (faceId && p.faces) {
             // Updating a specific face
             const newFaces = p.faces.map(f => {
                 if (f.id === faceId) {
                     return { 
                         ...f, 
                         name: updates.name, 
                         rows: updates.rows, 
                         cols: updates.cols, 
                         slots: updateGrid(f.slots, f.rows, f.cols) 
                     };
                 }
                 return f;
             });
             return { ...p, faces: newFaces };
          } else {
             // Updating main/primary face
             return { 
                 ...p, 
                 name: updates.name, 
                 rows: updates.rows, 
                 cols: updates.cols, 
                 slots: updateGrid(p.slots, p.rows, p.cols) 
             };
          }
        })
      };
    });
  }, [setBranchData]);

  const addShelfToFloor = useCallback((planogramId: string, x: number = 50, y: number = 50) => {
    setBranchData(prev => {
      const floorPlans = prev.floorPlans || [];
      return {
        ...prev,
        floorPlans: floorPlans.map(fp => {
          if (fp.branch !== currentBranch) return fp;
          const newItem: ShopFloorItem = {
            id: `item_${Date.now()}`,
            planogramId,
            x,
            y,
            rotation: 0,
            width: 12,
            depth: 6
          };
          return { ...fp, items: [...fp.items, newItem] };
        })
      };
    });
  }, [currentBranch, setBranchData]);

  const updateFloorItem = useCallback((itemId: string, updates: Partial<ShopFloorItem>) => {
    setBranchData(prev => {
      const floorPlans = prev.floorPlans || [];
      return {
        ...prev,
        floorPlans: floorPlans.map(fp => {
          if (fp.branch !== currentBranch) return fp;
          return {
            ...fp,
            items: fp.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
          };
        })
      };
    });
  }, [currentBranch, setBranchData]);

  const removeFloorItem = useCallback((itemId: string) => {
    setBranchData(prev => {
      const floorPlans = prev.floorPlans || [];
      return {
        ...prev,
        floorPlans: floorPlans.map(fp => {
          if (fp.branch !== currentBranch) return fp;
          return {
            ...fp,
            items: fp.items.filter(item => item.id !== itemId)
          };
        })
      };
    });
  }, [currentBranch, setBranchData]);

  return {
    activePlanogram,
    activeFloorPlan,
    planograms: branchData.planograms || [],
    setActivePlanogramId,
    updateSlot,
    swapSlots,
    addPlanogram,
    addFaceToPlanogram,
    removeFace,
    updatePlanogramDetails,
    updatePlanogramImage,
    updateAiVisualisation,
    addShelfToFloor,
    updateFloorItem,
    removeFloorItem
  };
}

export type PlanogramReturn = ReturnType<typeof usePlanogram>;

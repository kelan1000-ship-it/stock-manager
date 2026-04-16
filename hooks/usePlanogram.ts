
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PlanogramLayout, PlanogramSlot, BranchKey, BranchData, Product, ShopFloor, ShopFloorItem, PlanogramFace, SavedPlanogramConfiguration } from '../types';

export function usePlanogram(branchData: BranchData, setBranchData: React.Dispatch<React.SetStateAction<BranchData>>, currentBranch: BranchKey) {
  const [activePlanogramId, setActivePlanogramId] = useState<string | null>(null);

  const branchPlanogramsKey = currentBranch === 'bywood' ? 'bywoodPlanograms' : 'broomPlanograms' as keyof BranchData;
  const branchFloorPlansKey = currentBranch === 'bywood' ? 'bywoodFloorPlans' : 'broomFloorPlans' as keyof BranchData;

  const currentPlanograms = (branchData[branchPlanogramsKey] || []) as PlanogramLayout[];
  const currentFloorPlans = (branchData[branchFloorPlansKey] || []) as ShopFloor[];

  // Reset active planogram when branch changes so the new branch's planogram is selected
  useEffect(() => {
    setActivePlanogramId(null);
  }, [currentBranch]);

  // Initialize planograms and floor plans if they don't exist
  useEffect(() => {
    // Wait until planograms are loaded from Firestore (they start as undefined)
    if (branchData[branchPlanogramsKey] === undefined) return;
    
    let updates: Partial<BranchData> = {};
    
    if (currentPlanograms.length === 0) {
      const defaultLayout: PlanogramLayout = {
        id: `default-main-shelf-${currentBranch}`,
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
      updates[branchPlanogramsKey] = [defaultLayout] as any;
      setActivePlanogramId(defaultLayout.id);
    } else if (!activePlanogramId || !currentPlanograms.some(p => p.id === activePlanogramId)) {
      setActivePlanogramId(currentPlanograms[0]?.id || null);
    }

    // Wait until floorPlans are loaded
    if (branchData[branchFloorPlansKey] !== undefined && currentFloorPlans.length === 0) {
      const defaultFloor: ShopFloor = {
        id: `fp_${currentBranch}`,
        branch: currentBranch,
        items: []
      };
      updates[branchFloorPlansKey] = [defaultFloor] as any;
    }

    if (Object.keys(updates).length > 0) {
      setBranchData(prev => ({ ...prev, ...updates }));
    }
  }, [branchData[branchPlanogramsKey], branchData[branchFloorPlansKey], currentBranch, setBranchData, activePlanogramId]);

  const activePlanogram = useMemo(() => {
    return currentPlanograms.find(p => p.id === activePlanogramId) || null;
  }, [currentPlanograms, activePlanogramId]);

  const activeFloorPlan = useMemo(() => {
    return currentFloorPlans.find(f => f.branch === currentBranch) || null;
  }, [currentFloorPlans, currentBranch]);

  const updateSlot = useCallback((slotId: number, productId: string | null, faceId?: string) => {
    if (!activePlanogramId) return;

    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
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
  }, [activePlanogramId, setBranchData, branchPlanogramsKey]);

  const updateSlotPurpose = useCallback((slotId: number, purpose: 'product' | 'gap' | 'shelf_end' | undefined, faceId?: string) => {
    if (!activePlanogramId) return;

    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== activePlanogramId) return p;

          const applyPurpose = (slots: PlanogramSlot[], rows: number, cols: number) => {
             if (purpose !== 'shelf_end') {
                 return slots.map(s => s.id === slotId ? { ...s, productId: purpose === 'gap' ? null : s.productId, purpose } : s);
             }
             
             // Shelf End logic: fill to the right
             const row = Math.floor(slotId / cols);
             const col = slotId % cols;
             return slots.map(s => {
                const sRow = Math.floor(s.id / cols);
                const sCol = s.id % cols;
                if (sRow === row && sCol >= col) {
                   return { ...s, productId: null, purpose: 'shelf_end' };
                }
                return s;
             });
          };

          if (faceId && p.faces) {
            const newFaces = p.faces.map(f => {
              if (f.id === faceId) {
                return { ...f, slots: applyPurpose(f.slots, f.rows, f.cols) };
              }
              return f;
            });
            return { ...p, faces: newFaces };
          } else {
            return { ...p, slots: applyPurpose(p.slots, p.rows, p.cols) };
          }
        })
      };
    });
  }, [activePlanogramId, setBranchData, branchPlanogramsKey]);

  const updatePlanogramImage = useCallback((imageUrl: string | null, faceId?: string) => {
    if (!activePlanogramId) return;
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== activePlanogramId) return p;
          if (faceId && p.faces) {
            return {
              ...p,
              faces: p.faces.map(f => f.id === faceId ? { ...f, realShelfImage: imageUrl } : f)
            };
          }
          return { ...p, realShelfImage: imageUrl };
        })
      };
    });
  }, [activePlanogramId, setBranchData, branchPlanogramsKey]);

  const updateAiVisualisation = useCallback((imageUrl: string | null, faceId?: string) => {
    if (!activePlanogramId) return;
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== activePlanogramId) return p;
          if (faceId && p.faces) {
            return {
              ...p,
              faces: p.faces.map(f => f.id === faceId ? { ...f, aiVisualisation: imageUrl } : f)
            };
          }
          return { ...p, aiVisualisation: imageUrl };
        })
      };
    });
  }, [activePlanogramId, setBranchData, branchPlanogramsKey]);

  const swapSlots = useCallback((sourceId: number, targetId: number, sourceFaceId?: string, targetFaceId?: string) => {
    if (!activePlanogramId) return;

    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
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
  }, [activePlanogramId, setBranchData, branchPlanogramsKey]);

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
      faces: [], 
      realShelfImage: null,
      aiVisualisation: null
    };
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: [...planograms, newP]
      };
    });
    setActivePlanogramId(newP.id);
  }, [currentBranch, setBranchData, branchPlanogramsKey]);

  const addFaceToPlanogram = useCallback((planogramId: string, name: string, rows: number, cols: number) => {
    setBranchData(prev => {
        const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
        return {
            ...prev,
            [branchPlanogramsKey]: planograms.map(p => {
                if (p.id !== planogramId) return p;
                
                const newFace: PlanogramFace = {
                    id: `face_${Date.now()}`,
                    name: name || `Side ${ (p.faces?.length || 0) + 2 }`, 
                    rows,
                    cols,
                    slots: Array.from({ length: rows * cols }, (_, i) => ({ id: i, productId: null }))
                };

                return { ...p, faces: [...(p.faces || []), newFace] };
            })
        };
    });
  }, [setBranchData, branchPlanogramsKey]);

  const removeFace = useCallback((planogramId: string, faceId: string) => {
      setBranchData(prev => {
          const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
          return {
              ...prev,
              [branchPlanogramsKey]: planograms.map(p => {
                  if (p.id !== planogramId) return p;
                  return { ...p, faces: (p.faces || []).filter(f => f.id !== faceId) };
              })
          };
      });
  }, [setBranchData, branchPlanogramsKey]);

  const updatePlanogramDetails = useCallback((id: string, updates: { name: string; rows: number; cols: number }, faceId?: string) => {
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
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
                if (slot.productId || slot.purpose === 'gap') {
                   const r = Math.floor(slot.id / oldCols);
                   const c = slot.id % oldCols;
                   if (r < newRows && c < newCols) {
                      const newIndex = r * newCols + c;
                      if (newSlots[newIndex]) {
                        newSlots[newIndex].productId = slot.productId;
                        if (slot.purpose) newSlots[newIndex].purpose = slot.purpose;
                      }
                   }
                }
             });
             return newSlots;
          };

          if (faceId && p.faces) {
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
  }, [setBranchData, branchPlanogramsKey]);

  const addShelfToFloor = useCallback((planogramId: string, x: number = 50, y: number = 50) => {
    setBranchData(prev => {
      const floorPlans = (prev[branchFloorPlansKey] || []) as ShopFloor[];
      return {
        ...prev,
        [branchFloorPlansKey]: floorPlans.map(fp => {
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
  }, [currentBranch, setBranchData, branchFloorPlansKey]);

  const updateFloorItem = useCallback((itemId: string, updates: Partial<ShopFloorItem>) => {
    setBranchData(prev => {
      const floorPlans = (prev[branchFloorPlansKey] || []) as ShopFloor[];
      return {
        ...prev,
        [branchFloorPlansKey]: floorPlans.map(fp => {
          if (fp.branch !== currentBranch) return fp;
          return {
            ...fp,
            items: fp.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
          };
        })
      };
    });
  }, [currentBranch, setBranchData, branchFloorPlansKey]);

  const removeFloorItem = useCallback((itemId: string) => {
    setBranchData(prev => {
      const floorPlans = (prev[branchFloorPlansKey] || []) as ShopFloor[];
      return {
        ...prev,
        [branchFloorPlansKey]: floorPlans.map(fp => {
          if (fp.branch !== currentBranch) return fp;
          return {
            ...fp,
            items: fp.items.filter(item => item.id !== itemId)
          };
        })
      };
    });
  }, [currentBranch, setBranchData, branchFloorPlansKey]);

  const deletePlanogram = useCallback((planogramId: string) => {
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.filter(p => p.id !== planogramId)
      };
    });
    if (activePlanogramId === planogramId) {
       setActivePlanogramId(null);
    }
  }, [setBranchData, branchPlanogramsKey, activePlanogramId]);

  const saveConfiguration = useCallback((planogramId: string, name: string) => {
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== planogramId) return p;
          const newConfig: SavedPlanogramConfiguration = {
            id: `config_${Date.now()}`,
            name,
            timestamp: new Date().toISOString(),
            slots: [...p.slots],
            cols: p.cols,
            rows: p.rows,
            faces: p.faces ? p.faces.map(f => ({...f, slots: [...f.slots]})) : undefined
          };
          return { ...p, savedConfigurations: [...(p.savedConfigurations || []), newConfig] };
        })
      };
    });
  }, [setBranchData, branchPlanogramsKey]);

  const loadConfiguration = useCallback((planogramId: string, configId: string) => {
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== planogramId) return p;
          const config = p.savedConfigurations?.find(c => c.id === configId);
          if (!config) return p;
          return {
             ...p,
             slots: [...config.slots],
             cols: config.cols,
             rows: config.rows,
             faces: config.faces ? config.faces.map(f => ({...f, slots: [...f.slots]})) : undefined
          };
        })
      };
    });
  }, [setBranchData, branchPlanogramsKey]);

  const deleteConfiguration = useCallback((planogramId: string, configId: string) => {
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== planogramId) return p;
          return {
             ...p,
             savedConfigurations: (p.savedConfigurations || []).filter(c => c.id !== configId)
          };
        })
      };
    });
  }, [setBranchData, branchPlanogramsKey]);

  const renameConfiguration = useCallback((planogramId: string, configId: string, newName: string) => {
    setBranchData(prev => {
      const planograms = (prev[branchPlanogramsKey] || []) as PlanogramLayout[];
      return {
        ...prev,
        [branchPlanogramsKey]: planograms.map(p => {
          if (p.id !== planogramId) return p;
          return {
            ...p,
            savedConfigurations: (p.savedConfigurations || []).map(c =>
              c.id === configId ? { ...c, name: newName } : c
            )
          };
        })
      };
    });
  }, [setBranchData, branchPlanogramsKey]);

  return {
    activePlanogram,
    activeFloorPlan,
    planograms: currentPlanograms,
    setActivePlanogramId,
    updateSlot,
    updateSlotPurpose,
    swapSlots,
    addPlanogram,
    addFaceToPlanogram,
    removeFace,
    updatePlanogramDetails,
    updatePlanogramImage,
    updateAiVisualisation,
    addShelfToFloor,
    updateFloorItem,
    removeFloorItem,
    deletePlanogram,
    saveConfiguration,
    loadConfiguration,
    deleteConfiguration,
    renameConfiguration
  };
}

export type PlanogramReturn = ReturnType<typeof usePlanogram>;

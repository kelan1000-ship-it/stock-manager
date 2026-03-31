
import { useState, useCallback } from 'react';
import { PlanogramLayout, ShopFloor, Product, PlanogramSlot } from '../types';
import { visualizePlanogram, visualizeShopFloor, optimizePlanogramLayout } from '../services/geminiService';
import { createShelfComposite, CompositorItem } from '../utils/merchCompositor';

export function usePlanogramVisualization() {
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const handleVisualizeShelf = useCallback(async (
    activePlanogram: PlanogramLayout | null,
    inventory: Product[],
    faceContext?: { slots: PlanogramSlot[], rows: number, cols: number }
  ): Promise<void> => {
    if (!activePlanogram) return;
    setIsVisualizing(true);
    setAiResult(null);

    const currentSlots = faceContext?.slots || activePlanogram.slots;
    const currentRows = faceContext?.rows || activePlanogram.rows;
    const currentCols = faceContext?.cols || activePlanogram.cols;

    try {
      // 1. Identify gap slots, shelf ends, and valid products
      const gapSlotIds = currentSlots
        .filter(slot => slot.purpose === 'gap')
        .map(slot => slot.id);

      const shelfEndSlotIds = currentSlots
        .filter(slot => slot.purpose === 'shelf_end')
        .map(slot => slot.id);

      const productsInPlanogram = currentSlots
        .filter(slot => slot.purpose !== 'gap' && slot.purpose !== 'shelf_end')
        .map(slot => {
           const p = inventory.find(x => x.id === slot.productId);
           if (!p) return null;
           return p;
        })
        .filter(Boolean) as Product[];

      if (productsInPlanogram.length === 0) {
          throw new Error("No products found in planogram to merchandise.");
      }

      // 2. AI Layout Optimization (skip gaps & shelf ends)
      console.log("[AI Merchandiser] Optimizing layout...", gapSlotIds.length > 0 ? `(${gapSlotIds.length} gap slots excluded)` : '');
      const optimizedAssignments = await optimizePlanogramLayout(productsInPlanogram, currentRows, currentCols, gapSlotIds, shelfEndSlotIds);

      // 3. Prepare Compositor Items for image generation
      const compositorItems: CompositorItem[] = optimizedAssignments
        .map(assign => {
            const p = productsInPlanogram.find(x => x.id === assign.productId);
            if (!p) return null;

            // Try to use product image, fallback to placeholder if absolutely necessary
            const imageUrl = p.productImage || "https://placehold.co/400x400/white/000?text=" + encodeURIComponent(p.name);

            return {
                imageUrl,
                slotId: assign.slotId,
                row: Math.floor(assign.slotId / currentCols),
                col: assign.slotId % currentCols
            };
        })
        .filter(Boolean) as CompositorItem[];

      // 5. Create Pixel-Perfect Composite
      console.log("[AI Merchandiser] Creating base composite...");

      const compositeBase = await createShelfComposite(
        activePlanogram.realShelfImage,
        compositorItems,
        currentRows,
        currentCols,
        gapSlotIds,
        shelfEndSlotIds
      );

      // 6. AI Harmonization (Imagen 4)
      // This step takes the raw composite and makes it look "realistic" by harmonizing lighting and shadows.
      console.log("[AI Merchandiser] Performing AI harmonization for realism...");
      const finalRender = await visualizePlanogram(
        activePlanogram,
        inventory,
        faceContext,
        compositeBase
      );

      setAiResult(finalRender || compositeBase);
    } catch (err: any) {
      console.error("AI Merchandiser failed", err);
      alert(err.message || "AI Merchandiser failed to generate render.");
    } finally {
      setIsVisualizing(false);
    }
  }, []);

  const handleVisualizeShop = useCallback(async (activeFloorPlan: ShopFloor | null, planograms: PlanogramLayout[]) => {
    if (!activeFloorPlan) return;
    setIsVisualizing(true);
    setAiResult(null);
    try {
      const imageUrl = await visualizeShopFloor(activeFloorPlan, planograms);
      setAiResult(imageUrl);
    } catch (err) {
      console.error("Shop Visualiser failed", err);
    } finally {
      setIsVisualizing(false);
    }
  }, []);

  const handleDownloadImage = useCallback((url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Merch_Render_${new Date().toISOString()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return {
    isVisualizing,
    aiResult,
    setAiResult,
    handleVisualizeShelf,
    handleVisualizeShop,
    handleDownloadImage
  };
}

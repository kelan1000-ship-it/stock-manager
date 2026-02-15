
import { useState, useCallback } from 'react';
import { PlanogramLayout, ShopFloor, Product } from '../types';
import { visualizePlanogram, visualizeShopFloor } from '../services/geminiService';

export function usePlanogramVisualization() {
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const handleVisualizeShelf = useCallback(async (activePlanogram: PlanogramLayout | null, inventory: Product[]) => {
    if (!activePlanogram) return;
    setIsVisualizing(true);
    setAiResult(null);
    try {
      const imageUrl = await visualizePlanogram(activePlanogram, inventory);
      setAiResult(imageUrl);
    } catch (err) {
      console.error("AI Merchandiser failed", err);
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

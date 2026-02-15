
import { Product, BranchData } from '../types';

/**
 * Mock Database Service
 * Replaces direct Firestore calls with local storage operations.
 * This ensures the app runs smoothly in the prototype environment without a real Firebase connection.
 */

const STORAGE_KEY = 'greenchem-data';

export const mockDb = {
  /**
   * Updates a product's image in the master inventory and persists to localStorage.
   */
  updateMasterProductImage: async (productId: string, imageUrl: string) => {
    // Simulate minor network delay for realistic UI
    await new Promise(resolve => setTimeout(resolve, 800));

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const data: BranchData = JSON.parse(saved);
      
      // Update Master Inventory
      data.masterInventory = data.masterInventory.map(p => 
        p.id === productId ? { ...p, image: imageUrl } : p
      );

      // Persist changes
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Notify the rest of the app that data has changed via a custom event
      window.dispatchEvent(new CustomEvent('greenchem-data-updated', { 
        detail: { type: 'master_image_update', productId, imageUrl } 
      }));

      console.log(`[MockDB] Successfully updated image for product: ${productId}`);
    } catch (error) {
      console.error('[MockDB] Update failed:', error);
      throw new Error('Local database update failed');
    }
  },

  /**
   * Retrieves products from mock store (mirrors master inventory)
   */
  getMasterInventory: async (): Promise<any[]> => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      const data: BranchData = JSON.parse(saved);
      return data.masterInventory || [];
    } catch {
      return [];
    }
  }
};

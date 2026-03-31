import { Product } from '../types';

/** Returns the best matching key: barcode if present, else productCode */
export function getProductMatchKey(item: { barcode?: string; productCode?: string }): string {
  if (item.barcode?.trim()) return item.barcode;
  if (item.productCode?.trim()) return item.productCode;
  return '';
}

/**
 * Find a matching product from a list.
 * Tries barcode first, falls back to productCode.
 * Filters deleted items by default.
 */
export function findMatchByKey<T extends { barcode?: string; productCode?: string; deletedAt?: string }>(
  items: T[],
  source: { barcode?: string; productCode?: string },
  opts?: { skipDeleted?: boolean }
): T | undefined {
  const skipDeleted = opts?.skipDeleted !== false; // default true
  const filtered = skipDeleted ? items.filter(p => !p.deletedAt) : items;

  if (source.barcode?.trim()) {
    const match = filtered.find(p => p.barcode === source.barcode);
    if (match) return match;
  }
  if (source.productCode?.trim()) {
    return filtered.find(p => p.productCode === source.productCode);
  }
  return undefined;
}

export const findProductMatches = (inventory: Product[], target: Product): Product[] => {
  // Filter out deleted/archived items first
  const activeInventory = inventory.filter(p => !p.deletedAt && !p.isArchived);

  // 1. Try Barcode Match (Strongest)
  if (target.barcode && target.barcode.trim() !== '') {
    return activeInventory.filter(p => p.barcode === target.barcode);
  }

  // 2. Try Product Code / PIP Match (Strong)
  if (target.productCode && target.productCode.trim() !== '') {
    return activeInventory.filter(p => p.productCode === target.productCode);
  }

  // 3. Fallback: Name + Pack Size Match (Weak but necessary if no codes)
  if (target.name && target.name.trim() !== '') {
    const targetName = target.name.toLowerCase().trim();
    const targetPack = (target.packSize || '').toLowerCase().trim();
    
    return activeInventory.filter(p => 
      p.name.toLowerCase().trim() === targetName && 
      (p.packSize || '').toLowerCase().trim() === targetPack
    );
  }

  // 4. Last Resort: ID match (if same branch or synced ID)
  return activeInventory.filter(p => p.id === target.id);
};

import { Product } from '../types';

export type ProductStatus = 'Healthy' | 'Low Stock' | 'Critical Reorder' | 'Out of Stock' | 'Excess Stock' | 'Unavailable' | 'Archive' | 'Bin' | 'Short Expiry' | 'Critical Expiry' | 'Expired';

export function getProductStatus(item: Product, mainView?: string): { text: string; color: string; severity: number } {
  if (mainView === 'bin') {
    if (item.deletedAt) {
      const diffDays = Math.ceil((new Date(new Date(item.deletedAt).getTime() + (30 * 24 * 60 * 60 * 1000)).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return { text: `${Math.max(0, diffDays)} DAYS LEFT`, color: diffDays <= 5 ? 'rose' : 'amber', severity: 5 };
    }
    return { text: 'DELETED', color: 'rose', severity: 5 };
  }
  
  if (mainView === 'archive' || item.isArchived) {
    return { text: 'ARCHIVED', color: 'amber', severity: 0 };
  }

  if (item.isDiscontinued) return { text: 'Unavailable', color: 'rose', severity: 4 };
  if (item.isExcessStock) return { text: 'Excess Stock', color: 'orange', severity: 0 };
  if (item.stockInHand === 0 && (item.partPacks || 0) === 0) return { text: 'Out of Stock', color: 'rose', severity: 4 };
  if (item.stockInHand < (item.stockToKeep * 0.35)) return { text: 'Critical Reorder', color: 'rose', severity: 3 };
  if (item.stockInHand < (item.stockToKeep * 0.50)) return { text: 'Low Stock', color: 'amber', severity: 2 };

  return { text: 'Healthy', color: 'emerald', severity: 1 };
}

export const STATUS_OPTIONS: ProductStatus[] = [
    'Healthy',
    'Low Stock',
    'Critical Reorder',
    'Out of Stock',
    'Excess Stock',
    'Unavailable'
];

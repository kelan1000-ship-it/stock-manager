
import { useMemo } from 'react';
import { Product, OrderHistoryEntry } from '../types';

export type SlowMoverBucketKey = 'threeMonths' | 'sixMonths' | 'nineMonths' | 'deadStock';

export interface SlowMoverInsight {
  product: Product;
  monthsInactive: number;
  lastActiveDate: string | null;
  statusLabel: string;
}

export interface UseSlowMoverInsightsReturn {
  buckets: Record<SlowMoverBucketKey, SlowMoverInsight[]>;
  counts: Record<SlowMoverBucketKey, number>;
  totalSlowMovers: number;
}

/**
 * useSlowMoverInsights - Analyzes inventory to identify products that haven't 
 * been ordered in 3, 6, 9, or 12+ months.
 * 
 * @param inventoryData Array of active products
 */
export function useSlowMoverInsights(inventoryData: Product[]): UseSlowMoverInsightsReturn {
  return useMemo(() => {
    const now = new Date();
    
    const results: Record<SlowMoverBucketKey, SlowMoverInsight[]> = {
      threeMonths: [],
      sixMonths: [],
      nineMonths: [],
      deadStock: []
    };

    inventoryData.forEach(product => {
      // 1. Determine the most recent activity date (lastOrderedDate or latest history entry)
      let lastDate: Date | null = null;
      
      if (product.lastOrderedDate) {
        lastDate = new Date(product.lastOrderedDate);
      } else if (product.orderHistory && product.orderHistory.length > 0) {
        // Fallback: Find max date in history array
        const latestHistory = [...product.orderHistory].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        lastDate = new Date(latestHistory.date);
      }

      // If no history exists, we treat it as potentially new or never moved.
      // We skip items added in the last 3 months to avoid false positives.
      if (!lastDate) {
        const addedDate = new Date(product.lastUpdated);
        const monthsSinceAdded = (now.getFullYear() - addedDate.getFullYear()) * 12 + (now.getMonth() - addedDate.getMonth());
        if (monthsSinceAdded < 3) return;
        
        // Otherwise, it's effectively "Dead Stock" if it's old but never moved
        lastDate = addedDate;
      }

      // 2. Calculate months passed
      const monthsInactive = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());

      // 3. Group into buckets
      const insight: SlowMoverInsight = {
        product,
        monthsInactive,
        lastActiveDate: lastDate.toISOString(),
        statusLabel: `No movement since ${lastDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
      };

      if (monthsInactive >= 12) {
        results.deadStock.push(insight);
      } else if (monthsInactive >= 9) {
        results.nineMonths.push(insight);
      } else if (monthsInactive >= 6) {
        results.sixMonths.push(insight);
      } else if (monthsInactive >= 3) {
        results.threeMonths.push(insight);
      }
    });

    return {
      buckets: results,
      counts: {
        threeMonths: results.threeMonths.length,
        sixMonths: results.sixMonths.length,
        nineMonths: results.nineMonths.length,
        deadStock: results.deadStock.length
      },
      totalSlowMovers: 
        results.threeMonths.length + 
        results.sixMonths.length + 
        results.nineMonths.length + 
        results.deadStock.length
    };
  }, [inventoryData]);
}

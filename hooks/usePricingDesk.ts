import React, { useState, useMemo, useCallback } from 'react';
import { Product, BranchData, BranchKey } from '../types';

export interface PricingAlert {
  id: string;
  barcode: string;
  name: string;
  type: 'gap' | 'pending';
  localPrice: number;
  referencePrice: number;
  severity: 'high' | 'medium';
  isPriceSynced: boolean;
  hasGap: boolean;
  isPending: boolean;
  referenceSiteName: string;
  changeOriginBranch: string; // The branch that initiated the change
}

/**
 * usePricingDesk - Logic for detecting and reconciling price discrepancies between branches.
 */
export function usePricingDesk(branchData: BranchData, setBranchData: React.Dispatch<React.SetStateAction<BranchData>>, currentBranch: BranchKey) {
  const [isLoading, setIsLoading] = useState(false);

  const alerts = useMemo(() => {
    const siteAlerts: PricingAlert[] = [];
    const now = new Date();
    const localItems = branchData[currentBranch] || [];
    const otherBranchKey: BranchKey = currentBranch === 'bywood' ? 'broom' : 'bywood';
    const otherItems = branchData[otherBranchKey] || [];
    const localSiteName = currentBranch === 'bywood' ? 'Bywood' : 'Broom Road';
    const refSiteName = otherBranchKey === 'bywood' ? 'Bywood' : 'Broom Road';

    localItems.forEach(p => {
      if (p.deletedAt || p.isArchived || !p.barcode) return;
      if (!p.pendingPriceUpdate && p.labelNeedsUpdate) return;
      if (p.ignoredPriceAlertUntil && new Date(p.ignoredPriceAlertUntil) > now) return;

      const match = otherItems.find(o => o.barcode === p.barcode && !o.deletedAt);
      const localP = p.price || 0;
      const refP = match ? (match.price || 0) : localP;
      const hasGap = match ? Math.abs(localP - refP) > 0.001 : false;
      const isPending = !!p.pendingPriceUpdate;

      if (isPending || hasGap) {
        // Priority logic for origin: use priceChangeOrigin if set, otherwise try to guess.
        let origin = p.priceChangeOrigin ? (p.priceChangeOrigin === 'bywood' ? 'Bywood' : 'Broom Road') : localSiteName;
        
        if (!p.priceChangeOrigin && !isPending && match && new Date(match.lastUpdated) > new Date(p.lastUpdated)) {
          origin = refSiteName;
        }

        siteAlerts.push({
          id: `alert-${p.id}`,
          barcode: p.barcode,
          name: p.name,
          type: isPending ? 'pending' : 'gap',
          localPrice: localP,
          referencePrice: refP,
          severity: Math.abs(localP - refP) > 1 ? 'high' : 'medium',
          isPriceSynced: !!p.isPriceSynced,
          hasGap,
          isPending,
          referenceSiteName: refSiteName,
          changeOriginBranch: origin
        });
      }
    });

    return siteAlerts;
  }, [branchData, currentBranch]);

  const labelQueue = useMemo(() => {
    const queue: Product[] = [];
    const targetProducts = branchData[currentBranch] || [];
    targetProducts.forEach(p => {
      if (p.labelNeedsUpdate && !p.deletedAt) {
        queue.push(p);
      }
    });
    return queue;
  }, [branchData, currentBranch]);

  /**
   * handleMatch - Confirms a price and moves it to the label queue.
   */
  const handleMatch = useCallback((barcode: string) => {
    setBranchData(prev => {
      const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';
      const otherProduct = prev[otherBranch].find(p => p.barcode === barcode);
      const localProduct = prev[currentBranch].find(p => p.barcode === barcode);
      if (!localProduct) return prev;
      
      const targetP = otherProduct ? (otherProduct.price || 0) : localProduct.price;

      return {
        ...prev,
        [currentBranch]: prev[currentBranch].map(p => {
          if (p.barcode === barcode) {
            return { 
              ...p, 
              targetPrice: targetP,
              pendingPriceUpdate: false,
              labelNeedsUpdate: true,
              ignoredPriceAlertUntil: undefined,
              priceChangeOrigin: undefined // Clear origin once resolved
            };
          }
          return p;
        })
      };
    });
  }, [currentBranch, setBranchData]);

  const toggleSync = useCallback((barcode: string) => {
    setBranchData(prev => {
      const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';
      const localProduct = prev[currentBranch].find(p => p.barcode === barcode);
      if (!localProduct) return prev;
      const nextSyncState = !localProduct.isPriceSynced;
      return {
        ...prev,
        [currentBranch]: prev[currentBranch].map(p => p.barcode === barcode ? { ...p, isPriceSynced: nextSyncState } : p),
        [otherBranch]: prev[otherBranch].map(p => p.barcode === barcode ? { ...p, isPriceSynced: nextSyncState } : p)
      };
    });
  }, [currentBranch, setBranchData]);

  /**
   * handleIgnore - Dismisses the alert but still flows the item through to labels
   */
  const handleIgnore = useCallback((barcode: string) => {
    const until = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();
    setBranchData(prev => ({
      ...prev,
      [currentBranch]: prev[currentBranch].map(p => {
        if (p.barcode === barcode) {
          return { 
            ...p, 
            ignoredPriceAlertUntil: until, 
            pendingPriceUpdate: false,
            labelNeedsUpdate: true,
            targetPrice: p.price,
            priceChangeOrigin: undefined
          };
        }
        return p;
      })
    }));
  }, [currentBranch, setBranchData]);

  const markLabelPrinted = useCallback((productId: string, branch: BranchKey) => {
    setBranchData(prev => {
      const now = new Date().toISOString();
      return {
        ...prev,
        [branch]: prev[branch].map(p => {
          if (p.id === productId) {
            const finalPrice = p.targetPrice !== undefined ? p.targetPrice : p.price;
            const history = [...(p.priceHistory || [])];
            
            if (Math.abs(p.price - finalPrice) > 0.001) {
              history.push({ 
                date: now, 
                rrp: finalPrice, 
                costPrice: p.costPrice, 
                margin: finalPrice > 0 ? ((finalPrice - p.costPrice) / finalPrice * 100) : 0 
              });
            }

            return { 
              ...p, 
              price: finalPrice, 
              targetPrice: undefined,
              labelNeedsUpdate: false,
              lastUpdated: now,
              priceHistory: history
            };
          }
          return p;
        })
      };
    });
  }, [setBranchData]);

  return {
    alerts,
    labelQueue,
    isLoading,
    handleMatch,
    handleIgnore,
    markLabelPrinted,
    toggleSync
  };
}

export type PricingDeskReturn = ReturnType<typeof usePricingDesk>;
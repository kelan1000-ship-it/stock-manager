import { BranchData, BranchKey, Product } from '../types';

export function updateSharedValues(
  prev: BranchData,
  currentBranch: BranchKey,
  barcode: string,
  field: 'price' | 'costPrice',
  value: number,
  productCode?: string
): BranchData {
  const now = new Date().toISOString();
  const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

  const matches = (p: Product) => {
    if (barcode && p.barcode === barcode) return true;
    if (!barcode && productCode && p.productCode === productCode) return true;
    return false;
  };

  const updated = { ...prev };
  const localItem = prev[currentBranch].find(p => matches(p) && !p.deletedAt);
  const partnerItem = prev[otherBranch].find(p => matches(p) && !p.deletedAt);

  if (!localItem) return prev;

  const isPriceField = field === 'price';
  const isCostField = field === 'costPrice';

  const isSynced = !!localItem.isPriceSynced || !!partnerItem?.isPriceSynced;

  // 1. Update Initiating (Local) Branch
  updated[currentBranch] = prev[currentBranch].map((p: Product) => {
    if (matches(p) && !p.deletedAt) {
      const newPrice = field === 'price' ? value : p.price;
      const newCost = field === 'costPrice' ? value : p.costPrice;
      const hasChanged = Math.abs(p.price - newPrice) > 0.001 || Math.abs(p.costPrice - newCost) > 0.001;
      
      return {
        ...p,
        [field]: value,
        lastUpdated: now,
        labelNeedsUpdate: isPriceField ? true : p.labelNeedsUpdate,
        ignoredPriceAlertUntil: hasChanged ? undefined : p.ignoredPriceAlertUntil,
        priceHistory: hasChanged ? [
          ...(p.priceHistory || []),
          {
              date: now,
              rrp: newPrice,
              costPrice: newCost,
              margin: newPrice > 0 ? ((newPrice - newCost) / newPrice * 100) : 0
          }
        ] : p.priceHistory
      };
    }
    return p;
  });

  // 2. Conditionally update partner branch
  const shouldUpdatePartner = isSynced || isCostField;

  if (shouldUpdatePartner) {
    updated[otherBranch] = prev[otherBranch].map((p: Product) => {
      if (matches(p) && !p.deletedAt) {
        const newPrice = field === 'price' ? value : p.price;
        const newCost = field === 'costPrice' ? value : p.costPrice;
        const hasChanged = Math.abs(p.price - newPrice) > 0.001 || Math.abs(p.costPrice - newCost) > 0.001;

        return {
          ...p,
          [field]: value,
          lastUpdated: now,
          priceChangeOrigin: currentBranch,
          pendingPriceUpdate: isPriceField ? true : p.pendingPriceUpdate,
          ignoredPriceAlertUntil: hasChanged ? undefined : p.ignoredPriceAlertUntil,
          priceHistory: hasChanged ? [
            ...(p.priceHistory || []),
            {
              date: now,
              rrp: newPrice,
              costPrice: newCost,
              margin: newPrice > 0 ? ((newPrice - newCost) / newPrice * 100) : 0
            }
          ] : p.priceHistory
        };
      }
      return p;
    });
  }
  return updated;
}

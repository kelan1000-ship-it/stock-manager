
import { useState, useMemo, useCallback } from 'react';
import { BranchData, BranchKey, Product, JointOrder } from '../types';
import { StockLogicReturn } from './useStockLogic';

export function useSharedStock(
  branchData: BranchData,
  currentBranch: BranchKey,
  logic: StockLogicReturn,
  localItems: Product[]
) {
  // State for ordering - separate inputs for each branch
  const [orderDrafts, setOrderDrafts] = useState<Record<string, { bywood: number; broom: number }>>({});
  const [orderConfirmations, setOrderConfirmations] = useState<Record<string, { bywood: boolean; broom: boolean }>>({});
  
  // State for Allocation Mode
  const [allocationDrafts, setAllocationDrafts] = useState<Record<string, { bywood: number; broom: number }>>({});

  const liveOrderTotal = useMemo(() => {
    let total = 0;
    (Object.entries(orderDrafts) as [string, { bywood: number; broom: number }][]).forEach(([id, qtys]) => {
      const product = localItems.find(p => p.id === id);
      if (product) {
        const qty = (qtys.bywood || 0) + (qtys.broom || 0);
        total += qty * product.costPrice;
      }
    });
    return total;
  }, [orderDrafts, localItems]);

  const handleOrderDraftChange = useCallback((id: string, branch: 'bywood' | 'broom', val: string) => {
    const num = parseInt(val);
    const cleanNum = isNaN(num) ? 0 : num;
    setOrderDrafts(prev => {
        const existing = prev[id] || { bywood: 0, broom: 0 };
        return { ...prev, [id]: { ...existing, [branch]: cleanNum } };
    });
  }, []);

  const toggleConfirmation = useCallback((itemId: string, branch: 'bywood' | 'broom') => {
    setOrderConfirmations(prev => {
        const current = prev[itemId] || { bywood: false, broom: false };
        return { ...prev, [itemId]: { ...current, [branch]: !current[branch] } };
    });
  }, []);

  const handlePlaceJointOrder = useCallback((item: Product) => {
    const draft = orderDrafts[item.id] || { bywood: 0, broom: 0 };
    const total = draft.bywood + draft.broom;
    
    if (total > 0) {
      logic.createJointOrder(item, total, draft);
      // Clear draft & confirmations
      setOrderDrafts(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
      });
      setOrderConfirmations(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
      });
      alert("Joint order created! Go to Order History to confirm allocation.");
    }
  }, [logic, orderDrafts]);

  /**
   * Enhanced updateSharedValues
   * Implements Pricing Desk Logic:
   * 1. Triggers label queue for local branch
   * 2. Logs price history
   * 3. If Price Sync is ON OR field is Cost Price: Updates other branch + triggers label queue + sets origin
   * 4. If Price Sync is OFF and field is RRP: Updates only local (triggers 'Gap' alert in Pricing Desk)
   */
  const updateSharedValues = useCallback((barcode: string, field: 'price' | 'costPrice', value: number) => {
    const now = new Date().toISOString();
    const otherBranch = currentBranch === 'bywood' ? 'broom' : 'bywood';

    if (logic.setBranchData) {
      logic.setBranchData((prev: BranchData) => {
        const updated = { ...prev };
        const localItem = prev[currentBranch].find(p => p.barcode === barcode && !p.deletedAt);
        
        if (!localItem) return prev;

        const isPriceField = field === 'price';
        const isCostField = field === 'costPrice';
        const isSynced = !!localItem.isPriceSynced;

        // 1. Update Initiating (Local) Branch
        updated[currentBranch] = prev[currentBranch].map((p: Product) => {
          if (p.barcode === barcode && !p.deletedAt) {
            const newPrice = field === 'price' ? value : p.price;
            const newCost = field === 'costPrice' ? value : p.costPrice;
            const hasChanged = Math.abs(p.price - newPrice) > 0.001 || Math.abs(p.costPrice - newCost) > 0.001;
            
            return { 
              ...p, 
              [field]: value, 
              lastUpdated: now,
              labelNeedsUpdate: isPriceField ? true : p.labelNeedsUpdate,
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
        // Update if Price Sync is active OR if updating Cost Price (which is global)
        const shouldUpdatePartner = isSynced || isCostField;

        if (shouldUpdatePartner) {
          updated[otherBranch] = prev[otherBranch].map((p: Product) => {
            if (p.barcode === barcode && !p.deletedAt) {
              const newPrice = field === 'price' ? value : p.price;
              const newCost = field === 'costPrice' ? value : p.costPrice;
              const hasChanged = Math.abs(p.price - newPrice) > 0.001 || Math.abs(p.costPrice - newCost) > 0.001;

              return { 
                ...p, 
                [field]: value, 
                lastUpdated: now,
                // Only flag label update if RRP changed
                labelNeedsUpdate: isPriceField ? true : p.labelNeedsUpdate,
                priceChangeOrigin: isPriceField ? currentBranch : p.priceChangeOrigin,
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
        // NOTE: If isSynced is false and it's an RRP change, we don't update other branch. 
        // This will naturally cause a price gap detected by usePricingDesk.ts.

        return updated;
      });
    }
  }, [logic, currentBranch]);

  const handleUpdateTarget = useCallback((productId: string, branch: BranchKey, val: number) => {
    if (logic.setBranchData) {
      logic.setBranchData((prev: BranchData) => ({
          ...prev,
          [branch]: prev[branch].map((p: Product) => 
              p.id === productId ? { ...p, stockToKeep: val, lastUpdated: new Date().toISOString() } : p
          )
      }));
    }
  }, [logic]);

  const handleUpdateStock = useCallback((productId: string, branch: BranchKey, val: number) => {
    if (logic.setBranchData) {
      logic.setBranchData((prev: BranchData) => ({
          ...prev,
          [branch]: prev[branch].map((p: Product) => 
              p.id === productId ? { ...p, stockInHand: val, lastUpdated: new Date().toISOString() } : p
          )
      }));
    }
  }, [logic]);

  const handleAllocationChange = useCallback((orderId: string, branch: 'bywood' | 'broom', val: string) => {
    const num = parseInt(val) || 0;
    setAllocationDrafts(prev => {
      const current = prev[orderId] || { bywood: 0, broom: 0 };
      return { ...prev, [orderId]: { ...current, [branch]: num } };
    });
  }, []);

  const confirmAllocation = useCallback((order: JointOrder) => {
    const draft = allocationDrafts[order.id] || { bywood: order.allocationBywood, broom: order.allocationBroom };
    logic.distributeJointOrder(order.id, draft.bywood, draft.broom);
    setAllocationDrafts(prev => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });
  }, [allocationDrafts, logic]);

  return {
    orderDrafts,
    orderConfirmations,
    allocationDrafts,
    liveOrderTotal,
    handleOrderDraftChange,
    toggleConfirmation,
    handlePlaceJointOrder,
    updateSharedValues,
    handleUpdateTarget,
    handleUpdateStock,
    handleAllocationChange,
    confirmAllocation
  };
}

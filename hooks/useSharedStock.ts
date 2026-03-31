
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BranchData, BranchKey, Product, JointOrder, SharedOrderDraft } from '../types';
import { StockLogicReturn } from './useStockLogic';
import { updateSharedValues as updateSharedValuesFunc } from '../utils/updateSharedValues';
import { getProductMatchKey } from '../utils/productMatching';

export function useSharedStock(
  branchData: BranchData,
  currentBranch: BranchKey,
  logic: StockLogicReturn,
  localItems: Product[]
) {
  // Local state for responsive input editing
  const [orderDrafts, setOrderDrafts] = useState<Record<string, { bywood: number; broom: number }>>({});
  const [orderConfirmations, setOrderConfirmations] = useState<Record<string, { bywood: boolean; broom: boolean }>>({});

  // State for Allocation Mode
  const [allocationDrafts, setAllocationDrafts] = useState<Record<string, { bywood: number; broom: number }>>({});

  // Refs for latest values (used in saveDraftOnBlur to avoid stale closures)
  const orderDraftsRef = useRef(orderDrafts);
  const orderConfsRef = useRef(orderConfirmations);
  useEffect(() => { orderDraftsRef.current = orderDrafts; }, [orderDrafts]);
  useEffect(() => { orderConfsRef.current = orderConfirmations; }, [orderConfirmations]);

  // Initialize from Firestore on mount + sync remote changes for non-edited drafts
  // Firestore drafts use barcode as the doc ID (for cross-branch matching),
  // but local state is keyed by product ID (unique per product).
  const prevSharedDraftsRef = useRef<SharedOrderDraft[]>([]);
  useEffect(() => {
    const sharedDrafts = branchData.sharedOrderDrafts || [];
    const prevMap = new Map<string, string>(prevSharedDraftsRef.current.map(d => [d.id, JSON.stringify(d)]));
    prevSharedDraftsRef.current = sharedDrafts;

    const changedDraftIds = new Set<string>();
    const currentDraftIds = new Set<string>();

    for (const d of sharedDrafts) {
      currentDraftIds.add(d.id);
      if (prevMap.get(d.id) !== JSON.stringify(d)) {
        changedDraftIds.add(d.id);
      }
    }
    prevMap.forEach((_, id) => {
      if (!currentDraftIds.has(id)) changedDraftIds.add(id);
    });

    if (changedDraftIds.size === 0 && prevMap.size === 0 && sharedDrafts.length === 0) return;

    // On very first load (prevMap empty), load everything
    const isFirstLoad = prevMap.size === 0 && sharedDrafts.length > 0;

    // Build a matchKey→productId map from local items for keying state by product ID
    const matchKeyToProductId = new Map<string, string>();
    for (const p of localItems) {
      const key = getProductMatchKey(p);
      if (key) matchKeyToProductId.set(key, p.id);
    }

    setOrderDrafts(prev => {
      const next = { ...prev };
      for (const d of sharedDrafts) {
        if (isFirstLoad || changedDraftIds.has(d.id)) {
          // d.id is the Firestore doc key (barcode/productCode); map to local product ID
          const productId = matchKeyToProductId.get(d.barcode || d.productCode || d.id) || d.id;
          next[productId] = { bywood: d.bywood, broom: d.broom };
        }
      }
      // Remove drafts whose Firestore doc was deleted
      for (const draftId of changedDraftIds) {
        if (!currentDraftIds.has(draftId)) {
          const productId = matchKeyToProductId.get(draftId) || draftId;
          delete next[productId];
        }
      }
      return next;
    });

    setOrderConfirmations(prev => {
      const next = { ...prev };
      for (const d of sharedDrafts) {
        if (isFirstLoad || changedDraftIds.has(d.id)) {
          const productId = matchKeyToProductId.get(d.barcode || d.productCode || d.id) || d.id;
          next[productId] = { bywood: d.bywoodConfirmed, broom: d.broomConfirmed };
        }
      }
      for (const draftId of changedDraftIds) {
        if (!currentDraftIds.has(draftId)) {
          const productId = matchKeyToProductId.get(draftId) || draftId;
          delete next[productId];
        }
      }
      return next;
    });
  }, [branchData.sharedOrderDrafts, localItems]);

  const liveOrderTotal = useMemo(() => {
    let total = 0;
    (Object.entries(orderDrafts) as [string, { bywood: number; broom: number }][]).forEach(([productId, qtys]) => {
      const product = localItems.find(p => p.id === productId && p.isShared && !p.deletedAt && !p.isArchived);
      if (product) {
        const qty = (qtys.bywood || 0) + (qtys.broom || 0);
        total += qty * product.costPrice;
      }
    });
    return total;
  }, [orderDrafts, localItems]);

  // Update local draft state (called on every keystroke for responsiveness)
  const handleOrderDraftChange = useCallback((productId: string, branch: 'bywood' | 'broom', val: string) => {
    const num = parseInt(val);
    const cleanNum = isNaN(num) ? 0 : num;
    const existing = orderDraftsRef.current[productId] || { bywood: 0, broom: 0 };
    const updated = { ...existing, [branch]: cleanNum };
    // Update ref immediately so saveDraftOnBlur reads the correct value
    orderDraftsRef.current = { ...orderDraftsRef.current, [productId]: updated };
    setOrderDrafts(prev => ({ ...prev, [productId]: updated }));
  }, []);

  // Save draft to Firestore (called on blur)
  // productId is the local state key; Firestore doc ID is the barcode (for cross-branch matching)
  const saveDraftOnBlur = useCallback((productId: string) => {
    if (!logic.setBranchData) return;

    const draft = orderDraftsRef.current[productId] || { bywood: 0, broom: 0 };
    const conf = orderConfsRef.current[productId] || { bywood: false, broom: false };

    // Look up the match key from localItems for Firestore persistence
    const product = localItems.find(p => p.id === productId);
    const matchKey = product ? getProductMatchKey(product) : productId;

    logic.setBranchData((prev: BranchData) => {
      const existingDrafts = prev.sharedOrderDrafts || [];
      const newDraft: SharedOrderDraft = {
        id: matchKey,
        barcode: product?.barcode || matchKey,
        productCode: product?.productCode,
        bywood: draft.bywood,
        broom: draft.broom,
        bywoodConfirmed: conf.bywood,
        broomConfirmed: conf.broom,
      };

      // Don't persist empty drafts
      if (newDraft.bywood === 0 && newDraft.broom === 0 && !newDraft.bywoodConfirmed && !newDraft.broomConfirmed) {
        const filtered = existingDrafts.filter(d => d.id !== matchKey);
        return filtered.length !== existingDrafts.length ? { ...prev, sharedOrderDrafts: filtered } : prev;
      }

      const idx = existingDrafts.findIndex(d => d.id === matchKey);
      if (idx >= 0) {
        return { ...prev, sharedOrderDrafts: existingDrafts.map(d => d.id === matchKey ? newDraft : d) };
      }
      return { ...prev, sharedOrderDrafts: [...existingDrafts, newDraft] };
    });
  }, [logic, localItems]);

  const toggleConfirmation = useCallback((productId: string, branch: 'bywood' | 'broom') => {
    const current = orderConfsRef.current[productId] || { bywood: false, broom: false };
    const newConf = { ...current, [branch]: !current[branch] };

    // Update local state
    setOrderConfirmations(prev => ({ ...prev, [productId]: newConf }));
    // Update ref immediately so saveDraftOnBlur reads the correct value
    orderConfsRef.current = { ...orderConfsRef.current, [productId]: newConf };

    // Save to Firestore
    saveDraftOnBlur(productId);
  }, [saveDraftOnBlur]);

  const handlePlaceJointOrder = useCallback((item: Product) => {
    const draft = orderDraftsRef.current[item.id] || { bywood: 0, broom: 0 };
    const qty = draft[currentBranch] || 0;
    const matchKey = getProductMatchKey(item) || item.id;

    if (qty > 0) {
      logic.sendToRestockWithQuantity(item, qty);

      // Clear local state (keyed by product ID)
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

      // Remove draft from Firestore (keyed by match key)
      if (logic.setBranchData) {
        logic.setBranchData((prev: BranchData) => ({
          ...prev,
          sharedOrderDrafts: (prev.sharedOrderDrafts || []).filter(d => d.id !== matchKey)
        }));
      }
    }
  }, [logic, currentBranch]);

  const updateSharedValues = useCallback((barcode: string, field: 'price' | 'costPrice', value: number, productCode?: string) => {
    if (logic.setBranchData) {
      logic.setBranchData((prev: BranchData) =>
        updateSharedValuesFunc(prev, currentBranch, barcode, field, value, productCode)
      );
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

  const handleUpdateLooseTarget = useCallback((productId: string, branch: BranchKey, val: number) => {
    if (logic.setBranchData) {
      logic.setBranchData((prev: BranchData) => ({
        ...prev,
        [branch]: prev[branch].map((p: Product) =>
          p.id === productId ? { ...p, looseStockToKeep: val, lastUpdated: new Date().toISOString() } : p
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

  const clearAllDrafts = useCallback(() => {
    setOrderDrafts({});
    setOrderConfirmations({});
    if (logic.setBranchData) {
      logic.setBranchData((prev: BranchData) => ({
        ...prev,
        sharedOrderDrafts: []
      }));
    }
  }, [logic]);

  const handleAllocationChange = useCallback((orderId: string, branch: 'bywood' | 'broom', val: string) => {
    const num = parseInt(val) || 0;
    setAllocationDrafts(prev => {
      const current = prev[orderId] || { bywood: 0, broom: 0 };
      return { ...prev, [orderId]: { ...current, [branch]: num } };
    });
    // Persist allocation change to JointOrder in Firestore
    const allocationKey = branch === 'bywood' ? 'allocationBywood' : 'allocationBroom';
    logic.updateJointOrder(orderId, { [allocationKey]: num });
  }, [logic]);

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
    saveDraftOnBlur,
    toggleConfirmation,
    handlePlaceJointOrder,
    updateSharedValues,
    handleUpdateTarget,
    handleUpdateLooseTarget,
    handleUpdateStock,
    handleAllocationChange,
    confirmAllocation,
    clearAllDrafts
  };
}

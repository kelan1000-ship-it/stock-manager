
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BranchData, BranchKey, Product, ProductFormData, RequestFormData, BulkItem, CustomerRequest, OrderItem, SharedOrderDraft, Supplier, PlanogramLayout, ShopFloor } from '../types';

export type SyncStatus = 'connected' | 'reconnecting' | 'offline' | 'error';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToProducts,
  subscribeToMessages,
  subscribeToTransfers,
  subscribeToRequests,
  subscribeToOrders,
  subscribeToJointOrders,
  subscribeToSharedOrderDrafts,
  subscribeToMasterInventory,
  subscribeToPlanograms,
  subscribeToFloorPlans,
  subscribeToSuppliers,
  subscribeToTasks,
  saveProduct,
  deleteProductFromDb,
  saveMessage,
  saveTransfer,
  saveRequest,
  deleteRequestFromDb,
  saveOrder,
  saveJointOrder,
  saveSharedOrderDraft,
  deleteSharedOrderDraft,
  saveMasterProduct,
  deleteMasterProductFromDb,
  savePlanogram,
  deletePlanogramFromDb,
  saveFloorPlan,
  saveSupplier,
  deleteSupplierFromDb,
  saveTask,
  deleteTaskFromDb,
} from '../services/firestoreService';

// Initial state constants
export const initialFormData = {
  name: '', subheader: '', barcode: '', productCode: '', packSize: '', price: '', costPrice: '',
  stockToKeep: '', looseStockToKeep: '0', stockInHand: '', partPacks: '', supplier: '', location: '', parentGroup: '',
  productImage: '', sourceUrls: [], notes: '', expiryDate: '',
  isDiscontinued: false, isUnavailable: false, isReducedToClear: false,
  isShared: false, isPriceSynced: false, enableThresholdAlert: false,
  thresholdType: 'percentage' as 'percentage' | 'quantity', thresholdValue: 25,
  looseUnitPrice: '',
  stockType: 'retail' as 'retail' | 'dispensary', tags: [],
  isExcessStock: false, keywords: '', noVat: false, reducedVat: false
};

export const initialRequestFormData = {
  customerName: '', contactNumber: '', itemName: '', barcode: '', productCode: '', supplier: '',
  quantity: 1, priceToPay: 0, isPaid: false, urgency: 'medium' as 'medium', status: 'pending', notes: ''
};

// ─── Diff helper ──────────────────────────────────────────────────
function diffById<T extends { id: string }>(prev: T[], next: T[]): { upserted: T[]; removedIds: string[] } {
  const prevMap = new Map(prev.map(item => [item.id, JSON.stringify(item)]));
  const nextMap = new Map(next.map(item => [item.id, item]));
  const upserted: T[] = [];
  const removedIds: string[] = [];
  for (const [id, item] of nextMap) {
    const prevJson = prevMap.get(id);
    if (!prevJson || prevJson !== JSON.stringify(item)) upserted.push(item);
  }
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) removedIds.push(id);
  }
  return { upserted, removedIds };
}

// ─── Module-level write failure callback ────────────────────────
let onWriteFailure: ((count: number) => void) | null = null;

// ─── Write diffs to Firestore in parallel ─────────────────────────
function syncToFirestore(prev: BranchData, next: BranchData) {
  const promises: Promise<void>[] = [];

  // Tasks
  if (prev.tasks !== next.tasks) {
    const { upserted, removedIds } = diffById(prev.tasks || [], next.tasks || []);
    if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} tasks`);
    upserted.forEach(t => promises.push(saveTask(t)));
    removedIds.forEach(id => promises.push(deleteTaskFromDb(id)));
  }

  // Products
  for (const branch of ['bywood', 'broom'] as BranchKey[]) {
    if (prev[branch] !== next[branch]) {
      const { upserted, removedIds } = diffById(prev[branch], next[branch]);
      if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} products for ${branch}`);
      upserted.forEach(p => promises.push(saveProduct(branch, p)));
      removedIds.forEach(id => promises.push(deleteProductFromDb(branch, id)));
    }
  }
  // Messages
  if (prev.messages !== next.messages) {
    const { upserted } = diffById(prev.messages, next.messages);
    if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} messages`);
    upserted.forEach(m => promises.push(saveMessage(m)));
  }
  // Transfers
  if (prev.transfers !== next.transfers) {
    const { upserted } = diffById(prev.transfers, next.transfers);
    if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} transfers`);
    upserted.forEach(t => promises.push(saveTransfer(t)));
  }
  // Requests
  for (const [key, branch] of [['bywoodRequests', 'bywood'], ['broomRequests', 'broom']] as [keyof BranchData, BranchKey][]) {
    const prevList = (prev[key] || []) as CustomerRequest[];
    const nextList = (next[key] || []) as CustomerRequest[];
    if (prevList !== nextList) {
      const { upserted, removedIds } = diffById(prevList, nextList);
      if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} requests for ${branch}`);
      upserted.forEach(r => promises.push(saveRequest(branch, r)));
      removedIds.forEach(id => promises.push(deleteRequestFromDb(branch, id)));
    }
  }
  // Orders
  for (const [key, branch] of [['bywoodOrders', 'bywood'], ['broomOrders', 'broom']] as [keyof BranchData, BranchKey][]) {
    const prevList = (prev[key] || []) as OrderItem[];
    const nextList = (next[key] || []) as OrderItem[];
    if (prevList !== nextList) {
      const { upserted } = diffById(prevList, nextList);
      if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} orders for ${branch}`);
      upserted.forEach(o => promises.push(saveOrder(branch, o)));
    }
  }
  // Joint Orders
  if (prev.jointOrders !== next.jointOrders) {
    const { upserted } = diffById(prev.jointOrders || [], next.jointOrders || []);
    if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} joint orders`);
    upserted.forEach(o => promises.push(saveJointOrder(o)));
  }
  // Shared Order Drafts
  if (prev.sharedOrderDrafts !== next.sharedOrderDrafts) {
    const { upserted, removedIds } = diffById(prev.sharedOrderDrafts || [], next.sharedOrderDrafts || []);
    if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} order drafts`);
    upserted.forEach(d => promises.push(saveSharedOrderDraft(d)));
    removedIds.forEach(id => promises.push(deleteSharedOrderDraft(id)));
  }
  // Master Inventory
  if (prev.masterInventory !== next.masterInventory) {
    const { upserted, removedIds } = diffById(prev.masterInventory || [], next.masterInventory || []);
    if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} master products`);
    upserted.forEach(p => promises.push(saveMasterProduct(p)));
    removedIds.forEach(id => promises.push(deleteMasterProductFromDb(id)));
  }
  // Planograms
  for (const branch of ['bywood', 'broom'] as BranchKey[]) {
    const key = branch === 'bywood' ? 'bywoodPlanograms' : 'broomPlanograms';
    const prevList = (prev[key] || []) as PlanogramLayout[];
    const nextList = (next[key] || []) as PlanogramLayout[];
    if (prevList !== nextList) {
      const { upserted, removedIds } = diffById(prevList, nextList);
      if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} planograms for ${branch}`);
      upserted.forEach(l => promises.push(savePlanogram(branch, l)));
      removedIds.forEach(id => promises.push(deletePlanogramFromDb(branch, id)));
    }
  }

  // Floor Plans
  for (const branch of ['bywood', 'broom'] as BranchKey[]) {
    const key = branch === 'bywood' ? 'bywoodFloorPlans' : 'broomFloorPlans';
    const prevList = (prev[key] || []) as ShopFloor[];
    const nextList = (next[key] || []) as ShopFloor[];
    if (prevList !== nextList) {
      const { upserted } = diffById(prevList, nextList);
      if (upserted.length > 0) console.log(`[Firestore] Syncing ${upserted.length} floor plans for ${branch}`);
      upserted.forEach(f => promises.push(saveFloorPlan(branch, f)));
    }
  }

  if (promises.length > 0) {
    Promise.allSettled(promises).then(results => {
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`FIRESTORE: ${failures.length}/${promises.length} writes failed:`,
          failures.map(f => (f as PromiseRejectedResult).reason));
        onWriteFailure?.(failures.length);
      } else {
        console.log(`[Firestore] Successfully synced ${promises.length} changes.`);
      }
    });
  }
}

export function useStockState() {
  const { currentBranch, setCurrentBranch, firebaseUser } = useAuth();

  const [branchData, setBranchDataRaw] = useState<BranchData>({
    bywood: [], broom: [], messages: [], transfers: [],
    bywoodRequests: [], broomRequests: [],
    bywoodOrders: [], broomOrders: [],
    jointOrders: [], masterInventory: [], 
    bywoodPlanograms: undefined, broomPlanograms: undefined,
    bywoodFloorPlans: undefined, broomFloorPlans: undefined,
    tasks: [],
    sharedOrderDrafts: undefined,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connected');
  const listenerErrorCount = useRef(0);

  // Counter: > 0 means we're inside a Firestore listener callback
  const listenerDepth = useRef(0);

  // ─── setBranchData wrapper ──────────────────────────────────────
  //
  // THE KEY FIX: We capture prev and compute next INSIDE the state
  // updater function, then fire syncToFirestore immediately with both
  // values. No requestAnimationFrame, no snapshotRef — no race condition.
  //
  // syncToFirestore is fire-and-forget (non-blocking). The state updater
  // returns `next` synchronously so the UI updates instantly. The Firestore
  // write happens in the background.
  //
  const setBranchData: React.Dispatch<React.SetStateAction<BranchData>> = useCallback((action) => {
    if (listenerDepth.current > 0) {
      // From Firestore listener — just update state, don't write back
      setBranchDataRaw(action);
      return;
    }

    // From a hook — update state AND write to Firestore
    setBranchDataRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      // Fire-and-forget: syncToFirestore returns void, it handles its own errors.
      // We pass frozen copies of prev and next so no race condition is possible.
      syncToFirestore(prev, next);
      return next;
    });
  }, []);

  // ─── Firestore Listeners ────────────────────────────────────────
  useEffect(() => {
    if (!firebaseUser) return;

    // Reset error count on fresh mount
    listenerErrorCount.current = 0;

    const fromFirestore = (updater: (prev: BranchData) => BranchData) => {
      listenerDepth.current++;
      setBranchDataRaw(updater);
      // Successful snapshot means we're connected
      listenerErrorCount.current = 0;
      setSyncStatus('connected');
      Promise.resolve().then(() => {
        listenerDepth.current = Math.max(0, listenerDepth.current - 1);
      });
    };

    const handleListenerError = (error: Error) => {
      listenerErrorCount.current++;
      if (listenerErrorCount.current >= 2) {
        setSyncStatus('error');
      }
    };

    // Wire up write failure handler
    onWriteFailure = () => setSyncStatus('error');

    const unsubs = [
      subscribeToProducts('bywood', (products) =>
        fromFirestore(prev => ({ ...prev, bywood: products })),
        handleListenerError
      ),
      subscribeToProducts('broom', (products) =>
        fromFirestore(prev => ({ ...prev, broom: products })),
        handleListenerError
      ),
      subscribeToMessages((messages) =>
        fromFirestore(prev => ({ ...prev, messages })),
        handleListenerError
      ),
      subscribeToTransfers((incomingTransfers) =>
        fromFirestore(prev => {
          const TERMINAL = new Set(['completed', 'cancelled']);
          const localMap = new Map(prev.transfers.map(t => [t.id, t]));

          const merged = incomingTransfers.map(incoming => {
            const local = localMap.get(incoming.id);
            if (!local) return incoming;
            // Never downgrade a terminal status back to non-terminal
            if (TERMINAL.has(local.status) && !TERMINAL.has(incoming.status)) return local;
            // Never lose a resolvedAt timestamp
            if (local.resolvedAt && !incoming.resolvedAt) return local;
            return incoming;
          });

          // Preserve local-only transfers whose writes are still in-flight
          for (const [id, local] of localMap) {
            if (!incomingTransfers.some(t => t.id === id)) merged.push(local);
          }

          return { ...prev, transfers: merged };
        }),
        handleListenerError
      ),
      subscribeToRequests('bywood', (r) =>
        fromFirestore(prev => ({ ...prev, bywoodRequests: r })),
        handleListenerError
      ),
      subscribeToRequests('broom', (r) =>
        fromFirestore(prev => ({ ...prev, broomRequests: r })),
        handleListenerError
      ),
      subscribeToOrders('bywood', (o) =>
        fromFirestore(prev => ({ ...prev, bywoodOrders: o })),
        handleListenerError
      ),
      subscribeToOrders('broom', (o) =>
        fromFirestore(prev => ({ ...prev, broomOrders: o })),
        handleListenerError
      ),
      subscribeToJointOrders((o) =>
        fromFirestore(prev => ({ ...prev, jointOrders: o })),
        handleListenerError
      ),
      subscribeToSharedOrderDrafts((d) =>
        fromFirestore(prev => ({ ...prev, sharedOrderDrafts: d })),
        handleListenerError
      ),
      subscribeToMasterInventory((m) =>
        fromFirestore(prev => ({ ...prev, masterInventory: m })),
        handleListenerError
      ),
      subscribeToPlanograms('bywood', (p) =>
        fromFirestore(prev => ({ ...prev, bywoodPlanograms: p })),
        handleListenerError
      ),
      subscribeToPlanograms('broom', (p) =>
        fromFirestore(prev => ({ ...prev, broomPlanograms: p })),
        handleListenerError
      ),
      subscribeToFloorPlans('bywood', (f) =>
        fromFirestore(prev => ({ ...prev, bywoodFloorPlans: f })),
        handleListenerError
      ),
      subscribeToFloorPlans('broom', (f) =>
        fromFirestore(prev => ({ ...prev, broomFloorPlans: f })),
        handleListenerError
      ),
      subscribeToSuppliers((s) => 
        fromFirestore(prev => ({ ...prev, suppliers: s })),
        handleListenerError
      ),
      subscribeToTasks((t) =>
        fromFirestore(prev => ({ ...prev, tasks: t })),
        handleListenerError
      ),
    ];

    return () => {
      unsubs.forEach(fn => fn());
      onWriteFailure = null;
    };
  }, [firebaseUser]);

  // ─── Online / Offline Detection ──────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('reconnecting');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status based on current network state
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── UI State ───────────────────────────────────────────────────
  const [mainView, setMainView] = useState<'inventory' | 'requests' | 'performance' | 'archive' | 'bin' | 'planogram' | 'reconciliation' | 'shared-stock' | 'supplier-management'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [subFilter, setSubFilter] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusFilterMode, setStatusFilterMode] = useState<'show' | 'hide'>('show');
  const [stockTypeFilter, setStockTypeFilter] = useState<'all' | 'retail' | 'dispensary'>('all');
  const [isManageDataOpen, setIsManageDataOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isMasterCatalogueOpen, setIsMasterCatalogueOpen] = useState(false);
  const [isTransferInboxOpen, setIsTransferInboxOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }[]>([]);
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isMissingAttributesOpen, setIsMissingAttributesOpen] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [copyToBothBranches, setCopyToBothBranches] = useState(false);

  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestFormData, setRequestFormData] = useState<RequestFormData>(initialRequestFormData);

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkScanningRowId, setBulkScanningRowId] = useState<string | null>(null);
  const [isBulkCameraOpen, setIsBulkCameraOpen] = useState(false);

  const [pendingDuplicate, setPendingDuplicate] = useState<Product | null>(null);

  const [orderTab, setOrderTab] = useState<'active' | 'backorder'>('active');

  const toggleStatusFilter = useCallback((status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }, []);

  const toggleStatusFilterMode = useCallback(() => {
    setStatusFilterMode(prev => (prev === 'show' ? 'hide' : 'show'));
  }, []);

  const clearStatusFilters = useCallback(() => {
    setSelectedStatuses([]);
  }, []);

  return {
    currentBranch, setCurrentBranch,
    branchData, setBranchData,
    mainView, setMainView,
    searchQuery, setSearchQuery,
    subFilter, setSubFilter,
    selectedStatuses, toggleStatusFilter, clearStatusFilters,
    statusFilterMode, toggleStatusFilterMode,
    stockTypeFilter, setStockTypeFilter,
    isManageDataOpen, setIsManageDataOpen,
    isBulkOpen, setIsBulkOpen,
    isMasterCatalogueOpen, setIsMasterCatalogueOpen,
    isTransferInboxOpen, setIsTransferInboxOpen,
    isChatOpen, setIsChatOpen,
    isMuted, setIsMuted,
    sortConfig, setSortConfig,
    isVisionScanning, setIsVisionScanning,
    isAILoading, setIsAILoading,
    isMissingAttributesOpen, setIsMissingAttributesOpen,

    isAdding, setIsAdding,
    editingId, setEditingId,
    formData, setFormData,
    copyToBothBranches, setCopyToBothBranches,

    isAddingRequest, setIsAddingRequest,
    editingRequestId, setEditingRequestId,
    requestFormData, setRequestFormData,

    bulkItems, setBulkItems,
    bulkScanningRowId, setBulkScanningRowId,
    isBulkCameraOpen, setIsBulkCameraOpen,

    pendingDuplicate, setPendingDuplicate,

    orderTab, setOrderTab,

    syncStatus,
  };
}

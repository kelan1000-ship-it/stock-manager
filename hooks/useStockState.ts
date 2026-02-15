
import { useState, useEffect, useRef, useCallback } from 'react';
import { BranchData, BranchKey, Product, ProductFormData, RequestFormData, BulkItem, CustomerRequest, OrderItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToProducts,
  subscribeToMessages,
  subscribeToTransfers,
  subscribeToRequests,
  subscribeToOrders,
  subscribeToJointOrders,
  subscribeToMasterInventory,
  subscribeToPlanograms,
  subscribeToFloorPlans,
  saveProduct,
  deleteProductFromDb,
  saveMessage,
  saveTransfer,
  saveRequest,
  deleteRequestFromDb,
  saveOrder,
  saveJointOrder,
  saveMasterProduct,
  deleteMasterProductFromDb,
  savePlanogram,
  deletePlanogramFromDb,
  saveFloorPlan,
} from '../services/firestoreService';

// Initial state constants
export const initialFormData = {
  name: '', barcode: '', productCode: '', packSize: '', price: '', costPrice: '',
  stockToKeep: '', stockInHand: '', partPacks: '', supplier: '', location: '', parentGroup: '',
  productImage: '', sourceUrls: [], notes: '', expiryDate: '',
  isDiscontinued: false, isUnavailable: false, isReducedToClear: false,
  isShared: false, isPriceSynced: false, enableThresholdAlert: false,
  stockType: 'retail' as 'retail' | 'dispensary', tags: []
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

// ─── Write diffs to Firestore in parallel ─────────────────────────
function syncToFirestore(prev: BranchData, next: BranchData) {
  const promises: Promise<void>[] = [];

  // Products
  for (const branch of ['bywood', 'broom'] as BranchKey[]) {
    if (prev[branch] !== next[branch]) {
      const { upserted, removedIds } = diffById(prev[branch], next[branch]);
      upserted.forEach(p => promises.push(saveProduct(branch, p)));
      removedIds.forEach(id => promises.push(deleteProductFromDb(branch, id)));
    }
  }
  // Messages
  if (prev.messages !== next.messages) {
    const { upserted } = diffById(prev.messages, next.messages);
    upserted.forEach(m => promises.push(saveMessage(m)));
  }
  // Transfers
  if (prev.transfers !== next.transfers) {
    const { upserted } = diffById(prev.transfers, next.transfers);
    upserted.forEach(t => promises.push(saveTransfer(t)));
  }
  // Requests
  for (const [key, branch] of [['bywoodRequests', 'bywood'], ['broomRequests', 'broom']] as [keyof BranchData, BranchKey][]) {
    const prevList = (prev[key] || []) as CustomerRequest[];
    const nextList = (next[key] || []) as CustomerRequest[];
    if (prevList !== nextList) {
      const { upserted, removedIds } = diffById(prevList, nextList);
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
      upserted.forEach(o => promises.push(saveOrder(branch, o)));
    }
  }
  // Joint Orders
  if (prev.jointOrders !== next.jointOrders) {
    const { upserted } = diffById(prev.jointOrders || [], next.jointOrders || []);
    upserted.forEach(o => promises.push(saveJointOrder(o)));
  }
  // Master Inventory
  if (prev.masterInventory !== next.masterInventory) {
    const { upserted, removedIds } = diffById(prev.masterInventory || [], next.masterInventory || []);
    upserted.forEach(p => promises.push(saveMasterProduct(p)));
    removedIds.forEach(id => promises.push(deleteMasterProductFromDb(id)));
  }
  // Planograms
  if (prev.planograms !== next.planograms) {
    const { upserted, removedIds } = diffById(prev.planograms || [], next.planograms || []);
    upserted.forEach(l => promises.push(savePlanogram(l)));
    removedIds.forEach(id => promises.push(deletePlanogramFromDb(id)));
  }
  // Floor Plans
  if (prev.floorPlans !== next.floorPlans) {
    const { upserted } = diffById(prev.floorPlans || [], next.floorPlans || []);
    upserted.forEach(f => promises.push(saveFloorPlan(f)));
  }

  if (promises.length > 0) {
    Promise.allSettled(promises).then(results => {
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`FIRESTORE: ${failures.length}/${promises.length} writes failed:`,
          failures.map(f => (f as PromiseRejectedResult).reason));
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
    jointOrders: [], masterInventory: [], planograms: [], floorPlans: [],
  });

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

    const fromFirestore = (updater: (prev: BranchData) => BranchData) => {
      listenerDepth.current++;
      setBranchDataRaw(updater);
      Promise.resolve().then(() => {
        listenerDepth.current = Math.max(0, listenerDepth.current - 1);
      });
    };

    const unsubs = [
      subscribeToProducts('bywood', (products) =>
        fromFirestore(prev => ({ ...prev, bywood: products }))
      ),
      subscribeToProducts('broom', (products) =>
        fromFirestore(prev => ({ ...prev, broom: products }))
      ),
      subscribeToMessages((messages) =>
        fromFirestore(prev => ({ ...prev, messages }))
      ),
      subscribeToTransfers((transfers) =>
        fromFirestore(prev => ({ ...prev, transfers }))
      ),
      subscribeToRequests('bywood', (r) =>
        fromFirestore(prev => ({ ...prev, bywoodRequests: r }))
      ),
      subscribeToRequests('broom', (r) =>
        fromFirestore(prev => ({ ...prev, broomRequests: r }))
      ),
      subscribeToOrders('bywood', (o) =>
        fromFirestore(prev => ({ ...prev, bywoodOrders: o }))
      ),
      subscribeToOrders('broom', (o) =>
        fromFirestore(prev => ({ ...prev, broomOrders: o }))
      ),
      subscribeToJointOrders((o) =>
        fromFirestore(prev => ({ ...prev, jointOrders: o }))
      ),
      subscribeToMasterInventory((m) =>
        fromFirestore(prev => ({ ...prev, masterInventory: m }))
      ),
      subscribeToPlanograms((p) =>
        fromFirestore(prev => ({ ...prev, planograms: p }))
      ),
      subscribeToFloorPlans((f) =>
        fromFirestore(prev => ({ ...prev, floorPlans: f }))
      ),
    ];

    return () => unsubs.forEach(fn => fn());
  }, [firebaseUser]);

  // ─── UI State ───────────────────────────────────────────────────
  const [mainView, setMainView] = useState<'inventory' | 'requests' | 'performance' | 'archive' | 'bin' | 'planogram' | 'reconciliation' | 'shared-stock'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [subFilter, setSubFilter] = useState('all');
  const [stockTypeFilter, setStockTypeFilter] = useState<'all' | 'retail' | 'dispensary'>('all');
  const [isManageDataOpen, setIsManageDataOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isMasterCatalogueOpen, setIsMasterCatalogueOpen] = useState(false);
  const [isTransferInboxOpen, setIsTransferInboxOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

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

  return {
    currentBranch, setCurrentBranch,
    branchData, setBranchData,
    mainView, setMainView,
    searchQuery, setSearchQuery,
    subFilter, setSubFilter,
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
  };
}

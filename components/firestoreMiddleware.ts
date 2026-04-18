import { Middleware } from '@reduxjs/toolkit';
import {
  subscribeToProducts,
  subscribeToTasks,
  subscribeToSuppliers,
  subscribeToMessages,
  subscribeToTransfers,
  subscribeToRequests,
  subscribeToOrders,
  subscribeToJointOrders,
  subscribeToSharedOrderDrafts,
  subscribeToMasterInventory,
  subscribeToPlanograms,
  subscribeToFloorPlans,
  saveProduct,
  deleteProductFromDb,
  saveTransfer,
  saveRequest,
  deleteRequestFromDb,
  saveOrder,
  saveMasterProduct,
  deleteMasterProductFromDb,
  saveTask,
  deleteTaskFromDb,
  savePlanogram,
  deletePlanogramFromDb,
  saveFloorPlan,
  saveJointOrder,
  saveSharedOrderDraft,
  deleteSharedOrderDraft,
} from '../services/firestoreService';
import {
  setInventory,
  setBranchData,
  setMessages,
  setTransfers,
  triggerNotification,
  updateUnreadCounts,
  requestTransfer,
  setError,
  startInventoryListeners,
  stopInventoryListeners,
  setStatus,
  setCurrentBranch,
  addStockItem,
  updateStockItem,
  removeStockItem,
  StockState,
} from './stockSlice';
import { Unsubscribe } from 'firebase/firestore';
import {
  Transfer, Product, BranchKey, CustomerRequest, OrderItem,
  MasterProduct, BranchTask, PlanogramLayout, ShopFloor,
  JointOrder, SharedOrderDraft,
} from '../types';

let globalUnsubscribes: Unsubscribe[] = [];

const parseTS = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts === 'string') return new Date(ts).getTime();
  return 0;
};

// ─── Write-back helpers ───────────────────────────────────────────────────────

// Compares two items for meaningful change.
// Uses lastUpdated / updatedAt when available; otherwise compares non-array scalar fields.
function isDirty<T extends { id: string }>(prev: T, next: T): boolean {
  const ts = (x: any) => x.lastUpdated || x.updatedAt || null;
  const prevTs = ts(prev);
  const nextTs = ts(next);
  if (prevTs && nextTs) return prevTs !== nextTs;
  // Fallback: compare scalar fields only (skip large nested arrays like stockHistory)
  const scalars = (x: any) =>
    JSON.stringify(
      Object.fromEntries(Object.entries(x).filter(([, v]) => !Array.isArray(v) && typeof v !== 'object'))
    );
  return scalars(prev) !== scalars(next);
}

// Diffs incoming vs current arrays, fires save for new/changed items and optionally delete for removed ones.
function syncArray<T extends { id: string }>(
  incoming: T[],
  current: T[],
  save: (item: T) => Promise<void>,
  del?: (id: string) => Promise<void>,
  onError?: (msg: string) => void,
) {
  const currentMap = new Map(current.map(x => [x.id, x]));
  for (const item of incoming) {
    const prev = currentMap.get(item.id);
    if (!prev || isDirty(prev, item)) {
      save(item).catch(err => {
        console.error('[Middleware] save failed:', err);
        onError?.(`Save failed: ${err.message}`);
      });
    }
  }
  if (del) {
    const incomingIds = new Set(incoming.map(x => x.id));
    for (const item of current) {
      if (!incomingIds.has(item.id)) {
        del(item.id).catch(err => {
          console.error('[Middleware] delete failed:', err);
          onError?.(`Delete failed: ${err.message}`);
        });
      }
    }
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const firestoreMiddleware: Middleware = store => next => action => {

  // ── requestTransfer ──────────────────────────────────────────────────────────
  if (requestTransfer.match(action)) {
    const { product, quantity, partQuantity, type, note, sourceBranch, targetBranch } = action.payload;
    const now = new Date().toISOString();

    const newTransfer: Transfer = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      sourceBranch,
      targetBranch,
      barcode: product.barcode,
      name: product.name,
      packSize: product.packSize,
      quantity,
      partQuantity,
      timestamp: now,
      status: 'pending',
      note,
    };

    const handleTransferProcess = async () => {
      try {
        if (type === 'send') {
          const updatedProduct: Product = {
            ...product,
            stockInHand: Math.max(0, product.stockInHand - quantity),
            partPacks: Math.max(0, (product.partPacks || 0) - partQuantity),
            lastUpdated: now,
            stockHistory: [
              ...(product.stockHistory || []),
              {
                date: now,
                type: 'transfer_out',
                change: -quantity,
                newBalance: Math.max(0, product.stockInHand - quantity),
                note: `Transfer to ${targetBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`,
              },
            ],
          };
          await saveProduct(sourceBranch, updatedProduct);
        }
        await saveTransfer(newTransfer);
      } catch (err: any) {
        store.dispatch(setError(`Transfer failed: ${err.message}`));
      }
    };
    handleTransferProcess();
  }

  // ── addStockItem → write new product ─────────────────────────────────────────
  if (addStockItem.match(action)) {
    const { branch, product } = action.payload;
    console.log('[Middleware] addStockItem — saving to Firestore', product.id);
    saveProduct(branch, product).catch(err => {
      console.error('[Middleware] addStockItem failed:', err);
      store.dispatch(setError(`Failed to save product "${product.name}": ${err.message}`));
    });
  }

  // ── updateStockItem → merge with pre-reducer state and write ─────────────────
  if (updateStockItem.match(action)) {
    const { branch, product: partial } = action.payload;
    const prevState = (store.getState() as { stock: StockState }).stock;
    const existing = prevState[branch].find((p: Product) => p.id === partial.id);
    if (existing) {
      const merged: Product = { ...existing, ...partial };
      console.log('[Middleware] updateStockItem — saving to Firestore', merged.id);
      saveProduct(branch, merged).catch(err => {
        console.error('[Middleware] updateStockItem failed:', err);
        store.dispatch(setError(`Failed to update product "${merged.name}": ${err.message}`));
      });
    }
  }

  // ── removeStockItem → delete from Firestore ───────────────────────────────────
  if (removeStockItem.match(action)) {
    const { branch, productId } = action.payload;
    console.log('[Middleware] removeStockItem — deleting from Firestore', productId);
    deleteProductFromDb(branch, productId).catch(err => {
      console.error('[Middleware] removeStockItem failed:', err);
      store.dispatch(setError(`Failed to delete product: ${err.message}`));
    });
  }

  // ── setBranchData → full write-back for user-originated mutations ─────────────
  //
  // Firestore listeners dispatch setBranchData with a SINGLE key (e.g. { bywoodRequests: [...] }).
  // User operations dispatch setBranchData with the FULL BranchData, which always includes
  // the `bywood` array. We use presence of `bywood` to distinguish user writes from listener echoes.
  //
  if (setBranchData.match(action) && action.payload.bywood !== undefined) {
    const prev = (store.getState() as { stock: StockState }).stock;
    const p = action.payload;
    const dispatchError = (msg: string) => store.dispatch(setError(msg));

    console.log('[Middleware] setBranchData — persisting to Firestore');

    // Products (bywood / broom) — diff by lastUpdated + stockInHand for efficiency
    const productDirty = (a: Product, b: Product) =>
      a.lastUpdated !== b.lastUpdated || a.stockInHand !== b.stockInHand;

    (['bywood', 'broom'] as BranchKey[]).forEach(branch => {
      const incoming = p[branch] as Product[] | undefined;
      if (!incoming) return;
      const currentMap = new Map((prev[branch] as Product[]).map(x => [x.id, x]));
      // Saves for new or changed products
      for (const product of incoming) {
        const existing = currentMap.get(product.id);
        if (!existing || productDirty(existing, product)) {
          saveProduct(branch, product).catch(err => {
            console.error(`[Middleware] saveProduct(${branch}) failed:`, err);
            dispatchError(`Failed to save product "${product.name}": ${err.message}`);
          });
        }
      }
      // Hard-deletes (product removed from array entirely)
      const incomingIds = new Set(incoming.map(x => x.id));
      for (const product of prev[branch] as Product[]) {
        if (!incomingIds.has(product.id)) {
          deleteProductFromDb(branch, product.id).catch(err => {
            console.error(`[Middleware] deleteProduct(${branch}) failed:`, err);
            dispatchError(`Failed to delete product: ${err.message}`);
          });
        }
      }
    });

    // Requests
    if (p.bywoodRequests) syncArray<CustomerRequest>(p.bywoodRequests, prev.bywoodRequests, r => saveRequest('bywood', r), id => deleteRequestFromDb('bywood', id), dispatchError);
    if (p.broomRequests) syncArray<CustomerRequest>(p.broomRequests, prev.broomRequests, r => saveRequest('broom', r), id => deleteRequestFromDb('broom', id), dispatchError);

    // Orders
    if (p.bywoodOrders) syncArray<OrderItem>(p.bywoodOrders, prev.bywoodOrders, o => saveOrder('bywood', o), undefined, dispatchError);
    if (p.broomOrders) syncArray<OrderItem>(p.broomOrders, prev.broomOrders, o => saveOrder('broom', o), undefined, dispatchError);

    // Master inventory
    if (p.masterInventory) syncArray<MasterProduct>(p.masterInventory, prev.masterInventory, m => saveMasterProduct(m), id => deleteMasterProductFromDb(id), dispatchError);

    // Tasks
    if (p.tasks) syncArray<BranchTask>(p.tasks, prev.tasks, t => saveTask(t), id => deleteTaskFromDb(id), dispatchError);

    // Planograms
    if (p.bywoodPlanograms) syncArray<PlanogramLayout>(p.bywoodPlanograms, prev.bywoodPlanograms, pl => savePlanogram('bywood', pl), id => deletePlanogramFromDb('bywood', id), dispatchError);
    if (p.broomPlanograms) syncArray<PlanogramLayout>(p.broomPlanograms, prev.broomPlanograms, pl => savePlanogram('broom', pl), id => deletePlanogramFromDb('broom', id), dispatchError);

    // Floor plans
    if (p.bywoodFloorPlans) syncArray<ShopFloor>(p.bywoodFloorPlans, prev.bywoodFloorPlans, fp => saveFloorPlan('bywood', fp), undefined, dispatchError);
    if (p.broomFloorPlans) syncArray<ShopFloor>(p.broomFloorPlans, prev.broomFloorPlans, fp => saveFloorPlan('broom', fp), undefined, dispatchError);

    // Joint orders
    if (p.jointOrders) syncArray<JointOrder>(p.jointOrders, prev.jointOrders, jo => saveJointOrder(jo), undefined, dispatchError);

    // Shared order drafts
    if (p.sharedOrderDrafts) syncArray<SharedOrderDraft>(p.sharedOrderDrafts, prev.sharedOrderDrafts, d => saveSharedOrderDraft(d), id => deleteSharedOrderDraft(id), dispatchError);
  }

  // ── startInventoryListeners ───────────────────────────────────────────────────
  if (startInventoryListeners.match(action)) {
    globalUnsubscribes.forEach(unsub => unsub());
    globalUnsubscribes = [];

    try {
      const unsubBywood = subscribeToProducts('bywood', products => {
        store.dispatch(setInventory({ branch: 'bywood', products }));
        store.dispatch(setStatus('connected'));
      }, error => store.dispatch(setError(`Bywood products error: ${error.message}`)));

      const unsubBroom = subscribeToProducts('broom', products => {
        store.dispatch(setInventory({ branch: 'broom', products }));
        store.dispatch(setStatus('connected'));
      }, error => store.dispatch(setError(`Broom products error: ${error.message}`)));

      const unsubMessages = subscribeToMessages(
        messages => {
          const currentState = store.getState() as { stock: StockState };
          const currentBranch = currentState.stock.currentBranch;
          store.dispatch(setMessages(messages));
          const unreadMessagesCount = messages.filter(m =>
            m.sender !== currentBranch && !m.isRead && !(m.deletedBy || []).includes(currentBranch)
          ).length;
          store.dispatch(updateUnreadCounts({
            messages: unreadMessagesCount,
            transfers: currentState.stock.unreadCounts.transfers,
          }));
          const prevMessages = currentState.stock.messages;
          if (messages.length > prevMessages.length && prevMessages.length > 0) {
            const latestMsg = [...messages].sort((a, b) => parseTS(b.timestamp) - parseTS(a.timestamp))[0];
            if (latestMsg) {
              const msgTime = parseTS(latestMsg.timestamp);
              if (Date.now() - msgTime < 10000) {
                store.dispatch(triggerNotification({ type: 'message', count: messages.length, timestamp: msgTime }));
              }
            }
          }
        },
        error => store.dispatch(setError(`Messages error: ${error.message}`))
      );

      const unsubTransfers = subscribeToTransfers(
        transfers => {
          const currentState = store.getState() as { stock: StockState };
          const prevTransfers = currentState.stock.transfers;
          const currentBranch = currentState.stock.currentBranch;
          store.dispatch(setTransfers(transfers));
          const pendingTransfersCount = transfers.filter(t =>
            !t.resolvedAt &&
            ((t.targetBranch === currentBranch && t.status === 'pending') ||
              (t.sourceBranch === currentBranch && t.status === 'confirmed' && t.type === 'request'))
          ).length;
          store.dispatch(updateUnreadCounts({
            messages: currentState.stock.unreadCounts.messages,
            transfers: pendingTransfersCount,
          }));
          if (transfers.length > prevTransfers.length && prevTransfers.length > 0) {
            const latestTrf = [...transfers].sort((a, b) => parseTS(b.createdAt || b.timestamp) - parseTS(a.createdAt || a.timestamp))[0];
            if (latestTrf) {
              const trfTime = parseTS(latestTrf.createdAt || latestTrf.timestamp);
              if (Date.now() - trfTime < 10000) {
                store.dispatch(triggerNotification({ type: 'transfer', count: transfers.length, timestamp: trfTime }));
              }
            }
          }
        },
        error => store.dispatch(setError(`Transfers error: ${error.message}`))
      );

      const unsubJointOrders = subscribeToJointOrders(
        jointOrders => store.dispatch(setBranchData({ jointOrders })),
        error => store.dispatch(setError(`JointOrders error: ${error.message}`))
      );
      const unsubSharedOrderDrafts = subscribeToSharedOrderDrafts(
        sharedOrderDrafts => store.dispatch(setBranchData({ sharedOrderDrafts })),
        error => store.dispatch(setError(`SharedOrderDrafts error: ${error.message}`))
      );
      const unsubMasterInventory = subscribeToMasterInventory(
        masterInventory => store.dispatch(setBranchData({ masterInventory })),
        error => store.dispatch(setError(`MasterInventory error: ${error.message}`))
      );
      const unsubSuppliers = subscribeToSuppliers(
        suppliers => store.dispatch(setBranchData({ suppliers })),
        error => store.dispatch(setError(`Suppliers error: ${error.message}`))
      );
      const unsubTasks = subscribeToTasks(
        tasks => store.dispatch(setBranchData({ tasks })),
        error => store.dispatch(setError(`Tasks error: ${error.message}`))
      );
      const unsubBywoodRequests = subscribeToRequests('bywood',
        bywoodRequests => store.dispatch(setBranchData({ bywoodRequests })),
        error => store.dispatch(setError(`BywoodRequests error: ${error.message}`))
      );
      const unsubBroomRequests = subscribeToRequests('broom',
        broomRequests => store.dispatch(setBranchData({ broomRequests })),
        error => store.dispatch(setError(`BroomRequests error: ${error.message}`))
      );
      const unsubBywoodOrders = subscribeToOrders('bywood',
        bywoodOrders => store.dispatch(setBranchData({ bywoodOrders })),
        error => store.dispatch(setError(`BywoodOrders error: ${error.message}`))
      );
      const unsubBroomOrders = subscribeToOrders('broom',
        broomOrders => store.dispatch(setBranchData({ broomOrders })),
        error => store.dispatch(setError(`BroomOrders error: ${error.message}`))
      );
      const unsubBywoodPlanograms = subscribeToPlanograms('bywood',
        bywoodPlanograms => store.dispatch(setBranchData({ bywoodPlanograms })),
        error => store.dispatch(setError(`BywoodPlanograms error: ${error.message}`))
      );
      const unsubBroomPlanograms = subscribeToPlanograms('broom',
        broomPlanograms => store.dispatch(setBranchData({ broomPlanograms })),
        error => store.dispatch(setError(`BroomPlanograms error: ${error.message}`))
      );
      const unsubBywoodFloorPlans = subscribeToFloorPlans('bywood',
        bywoodFloorPlans => store.dispatch(setBranchData({ bywoodFloorPlans })),
        error => store.dispatch(setError(`BywoodFloorPlans error: ${error.message}`))
      );
      const unsubBroomFloorPlans = subscribeToFloorPlans('broom',
        broomFloorPlans => store.dispatch(setBranchData({ broomFloorPlans })),
        error => store.dispatch(setError(`BroomFloorPlans error: ${error.message}`))
      );

      globalUnsubscribes.push(
        unsubBywood, unsubBroom, unsubMessages, unsubTransfers,
        unsubJointOrders, unsubSharedOrderDrafts, unsubMasterInventory,
        unsubSuppliers, unsubTasks, unsubBywoodRequests, unsubBroomRequests,
        unsubBywoodOrders, unsubBroomOrders, unsubBywoodPlanograms, unsubBroomPlanograms,
        unsubBywoodFloorPlans, unsubBroomFloorPlans
      );
    } catch (err: any) {
      store.dispatch(setError(err.message || 'Failed to start inventory listeners'));
    }
  }

  // ── stopInventoryListeners ────────────────────────────────────────────────────
  if (stopInventoryListeners.match(action)) {
    globalUnsubscribes.forEach(unsub => unsub());
    globalUnsubscribes = [];
  }

  // ── setCurrentBranch → recompute unread counts immediately ───────────────────
  if (setCurrentBranch.match(action)) {
    const result = next(action);
    const { stock } = store.getState() as { stock: StockState };
    const newBranch = action.payload;
    const unreadMessagesCount = stock.messages.filter(m =>
      m.sender !== newBranch && !m.isRead && !(m.deletedBy || []).includes(newBranch)
    ).length;
    const pendingTransfersCount = stock.transfers.filter(t =>
      !t.resolvedAt &&
      ((t.targetBranch === newBranch && t.status === 'pending') ||
        (t.sourceBranch === newBranch && t.status === 'confirmed' && t.type === 'request'))
    ).length;
    store.dispatch(updateUnreadCounts({ messages: unreadMessagesCount, transfers: pendingTransfersCount }));
    return result;
  }

  return next(action);
};

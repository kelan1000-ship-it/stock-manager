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
  saveTransfer
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
  StockState
} from './stockSlice';
import { Unsubscribe } from 'firebase/firestore';
import { Transfer, Product } from '../types';

let globalUnsubscribes: Unsubscribe[] = [];

const parseTS = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts === 'string') return new Date(ts).getTime();
  return 0;
};

export const firestoreMiddleware: Middleware = store => next => action => {
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
      note
    };

    const handleTransferProcess = async () => {
      try {
        if (type === 'send') {
          // Step A: Deduct stock from Firestore
          const updatedProduct: Product = {
            ...product,
            stockInHand: Math.max(0, product.stockInHand - quantity),
            partPacks: Math.max(0, (product.partPacks || 0) - partQuantity),
            lastUpdated: now,
            stockHistory: [...(product.stockHistory || []), {
              date: now,
              type: 'transfer_out',
              change: -quantity,
              newBalance: Math.max(0, product.stockInHand - quantity),
              note: `Transfer to ${targetBranch === 'bywood' ? 'Bywood Ave' : 'Broom Rd'}`
            }]
          };
          await saveProduct(sourceBranch, updatedProduct);
        }

        // Step B: Create Transfer Document
        await saveTransfer(newTransfer);

        // Step C: Implicit Success (handled by background listeners)
      } catch (err: any) {
        store.dispatch(setError(`Transfer failed: ${err.message}`));
      }
    };

    handleTransferProcess();
  }

  if (startInventoryListeners.match(action)) {
    // Clear any existing listeners first
    globalUnsubscribes.forEach(unsub => unsub());
    globalUnsubscribes = [];

    try {
      // 1. Inventory Products
      const unsubBywood = subscribeToProducts('bywood', (products) => {
        store.dispatch(setInventory({ branch: 'bywood', products }));
        store.dispatch(setStatus('connected'));
      }, (error) => store.dispatch(setError(`Bywood products error: ${error.message}`)));

      const unsubBroom = subscribeToProducts('broom', (products) => {
        store.dispatch(setInventory({ branch: 'broom', products }));
        store.dispatch(setStatus('connected'));
      }, (error) => store.dispatch(setError(`Broom products error: ${error.message}`)));

      // 2. Shared Data Collections
      console.log('Middleware listening to: shared/data/messages (Global)');
      const unsubMessages = subscribeToMessages(
        (messages) => {
          console.log('Middleware snapshot: messages received', messages.length);
          const currentState = store.getState() as { stock: StockState };
          const prevMessages = currentState.stock.messages;
          const currentBranch = currentState.stock.currentBranch;
          const lastSeen = currentState.stock.lastSeenMessagesTimestamp;

          store.dispatch(setMessages(messages));
          
          // Re-calculate unread count
          const unreadMessagesCount = messages.filter(m =>
            m.sender !== currentBranch &&
            !m.isRead &&
            !(m.deletedBy || []).includes(currentBranch)
          ).length;
          console.log('Middleware: Calculated unread messages:', unreadMessagesCount);
          store.dispatch(updateUnreadCounts({ 
            messages: unreadMessagesCount, 
            transfers: currentState.stock.unreadCounts.transfers 
          }));
          
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
        (error) => store.dispatch(setError(`Messages error: ${error.message}`))
      );
      
      const unsubTransfers = subscribeToTransfers(
        (transfers) => {
          const currentState = store.getState() as { stock: StockState };
          const prevTransfers = currentState.stock.transfers;
          const currentBranch = currentState.stock.currentBranch;

          store.dispatch(setTransfers(transfers));

          // Re-calculate pending transfers
          const pendingTransfersCount = transfers.filter(t =>
            !t.resolvedAt &&
            ((t.targetBranch === currentBranch && t.status === 'pending') ||
            (t.sourceBranch === currentBranch && t.status === 'confirmed' && t.type === 'request'))
          ).length;

          store.dispatch(updateUnreadCounts({ 
            messages: currentState.stock.unreadCounts.messages, 
            transfers: pendingTransfersCount 
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
        (error) => store.dispatch(setError(`Transfers error: ${error.message}`))
      );

      const unsubJointOrders = subscribeToJointOrders(
        (jointOrders) => store.dispatch(setBranchData({ jointOrders })),
        (error) => store.dispatch(setError(`JointOrders error: ${error.message}`))
      );

      const unsubSharedOrderDrafts = subscribeToSharedOrderDrafts(
        (sharedOrderDrafts) => store.dispatch(setBranchData({ sharedOrderDrafts })),
        (error) => store.dispatch(setError(`SharedOrderDrafts error: ${error.message}`))
      );

      const unsubMasterInventory = subscribeToMasterInventory(
        (masterInventory) => store.dispatch(setBranchData({ masterInventory })),
        (error) => store.dispatch(setError(`MasterInventory error: ${error.message}`))
      );

      const unsubSuppliers = subscribeToSuppliers(
        (suppliers) => store.dispatch(setBranchData({ suppliers })),
        (error) => store.dispatch(setError(`Suppliers error: ${error.message}`))
      );

      const unsubTasks = subscribeToTasks(
        (tasks) => store.dispatch(setBranchData({ tasks })),
        (error) => store.dispatch(setError(`Tasks error: ${error.message}`))
      );

      // 3. Branch-specific Data Collections
      const unsubBywoodRequests = subscribeToRequests('bywood',
        (bywoodRequests) => store.dispatch(setBranchData({ bywoodRequests })),
        (error) => store.dispatch(setError(`BywoodRequests error: ${error.message}`))
      );
      const unsubBroomRequests = subscribeToRequests('broom',
        (broomRequests) => store.dispatch(setBranchData({ broomRequests })),
        (error) => store.dispatch(setError(`BroomRequests error: ${error.message}`))
      );

      const unsubBywoodOrders = subscribeToOrders('bywood',
        (bywoodOrders) => store.dispatch(setBranchData({ bywoodOrders })),
        (error) => store.dispatch(setError(`BywoodOrders error: ${error.message}`))
      );
      const unsubBroomOrders = subscribeToOrders('broom',
        (broomOrders) => store.dispatch(setBranchData({ broomOrders })),
        (error) => store.dispatch(setError(`BroomOrders error: ${error.message}`))
      );

      const unsubBywoodPlanograms = subscribeToPlanograms('bywood',
        (bywoodPlanograms) => store.dispatch(setBranchData({ bywoodPlanograms })),
        (error) => store.dispatch(setError(`BywoodPlanograms error: ${error.message}`))
      );
      const unsubBroomPlanograms = subscribeToPlanograms('broom',
        (broomPlanograms) => store.dispatch(setBranchData({ broomPlanograms })),
        (error) => store.dispatch(setError(`BroomPlanograms error: ${error.message}`))
      );

      const unsubBywoodFloorPlans = subscribeToFloorPlans('bywood',
        (bywoodFloorPlans) => store.dispatch(setBranchData({ bywoodFloorPlans })),
        (error) => store.dispatch(setError(`BywoodFloorPlans error: ${error.message}`))
      );
      const unsubBroomFloorPlans = subscribeToFloorPlans('broom',
        (broomFloorPlans) => store.dispatch(setBranchData({ broomFloorPlans })),
        (error) => store.dispatch(setError(`BroomFloorPlans error: ${error.message}`))
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

  if (stopInventoryListeners.match(action)) {
    globalUnsubscribes.forEach(unsub => unsub());
    globalUnsubscribes = [];
  }

  // Recompute unread counts when the user switches branches so the notification
  // bar refreshes immediately rather than waiting for the next Firestore snapshot.
  if (setCurrentBranch.match(action)) {
    const result = next(action); // let the reducer apply the new branch first
    const { stock } = store.getState() as { stock: StockState };
    const newBranch = action.payload;

    const unreadMessagesCount = stock.messages.filter(m =>
      m.sender !== newBranch &&
      !m.isRead &&
      !(m.deletedBy || []).includes(newBranch)
    ).length;

    const pendingTransfersCount = stock.transfers.filter(t =>
      !t.resolvedAt &&
      ((t.targetBranch === newBranch && t.status === 'pending') ||
       (t.sourceBranch === newBranch && t.status === 'confirmed' && t.type === 'request'))
    ).length;

    store.dispatch(updateUnreadCounts({
      messages: unreadMessagesCount,
      transfers: pendingTransfersCount
    }));
    return result;
  }

  return next(action);
};

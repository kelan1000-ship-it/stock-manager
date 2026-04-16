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
  subscribeToFloorPlans
} from '../services/firestoreService';
import { 
  setInventory, 
  setBranchData,
  setError, 
  startInventoryListeners, 
  stopInventoryListeners,
  setStatus
} from './stockSlice';
import { Unsubscribe } from 'firebase/firestore';

let globalUnsubscribes: Unsubscribe[] = [];

export const firestoreMiddleware: Middleware = store => next => action => {
  if (startInventoryListeners.match(action)) {
    // Clear any existing listeners first
    globalUnsubscribes.forEach(unsub => unsub());
    globalUnsubscribes = [];

    try {
      // 1. Inventory Products
      const unsubBywood = subscribeToProducts('bywood', (products) => {
        store.dispatch(setInventory({ branch: 'bywood', products }));
        store.dispatch(setStatus('succeeded'));
      }, (error) => store.dispatch(setError(`Bywood products error: ${error.message}`)));

      const unsubBroom = subscribeToProducts('broom', (products) => {
        store.dispatch(setInventory({ branch: 'broom', products }));
        store.dispatch(setStatus('succeeded'));
      }, (error) => store.dispatch(setError(`Broom products error: ${error.message}`)));

      // 2. Shared Data Collections
      const unsubMessages = subscribeToMessages(
        (messages) => store.dispatch(setBranchData({ messages })),
        (error) => store.dispatch(setError(`Messages error: ${error.message}`))
      );
      
      const unsubTransfers = subscribeToTransfers(
        (transfers) => store.dispatch(setBranchData({ transfers })),
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

  return next(action);
};

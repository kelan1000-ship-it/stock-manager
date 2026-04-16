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
      console.log('Middleware: Initializing all listeners');

      // 1. Inventory Products
      console.log('Middleware listening to: branches/bywood/products');
      const unsubBywood = subscribeToProducts('bywood', (products) => {
        console.log('Middleware received data for: branches/bywood/products', products.length);
        store.dispatch(setInventory({ branch: 'bywood', products }));
        store.dispatch(setStatus('succeeded'));
      }, (error) => store.dispatch(setError(`Bywood products error: ${error.message}`)));

      console.log('Middleware listening to: branches/broom/products');
      const unsubBroom = subscribeToProducts('broom', (products) => {
        console.log('Middleware received data for: branches/broom/products', products.length);
        store.dispatch(setInventory({ branch: 'broom', products }));
        store.dispatch(setStatus('succeeded'));
      }, (error) => store.dispatch(setError(`Broom products error: ${error.message}`)));

      // 2. Shared Data Collections
      console.log('Middleware listening to: shared/data/messages');
      const unsubMessages = subscribeToMessages(
        (messages) => {
          console.log('Middleware received data for: shared/data/messages', messages.length);
          store.dispatch(setBranchData({ messages }));
        },
        (error) => store.dispatch(setError(`Messages error: ${error.message}`))
      );
      
      console.log('Middleware listening to: shared/data/transfers');
      const unsubTransfers = subscribeToTransfers(
        (transfers) => {
          console.log('Middleware received data for: shared/data/transfers', transfers.length);
          store.dispatch(setBranchData({ transfers }));
        },
        (error) => store.dispatch(setError(`Transfers error: ${error.message}`))
      );

      console.log('Middleware listening to: shared/data/jointOrders');
      const unsubJointOrders = subscribeToJointOrders(
        (jointOrders) => {
          console.log('Middleware received data for: shared/data/jointOrders', jointOrders.length);
          store.dispatch(setBranchData({ jointOrders }));
        },
        (error) => store.dispatch(setError(`JointOrders error: ${error.message}`))
      );

      console.log('Middleware listening to: shared/data/orderDrafts');
      const unsubSharedOrderDrafts = subscribeToSharedOrderDrafts(
        (sharedOrderDrafts) => {
          console.log('Middleware received data for: shared/data/orderDrafts', sharedOrderDrafts.length);
          store.dispatch(setBranchData({ sharedOrderDrafts }));
        },
        (error) => store.dispatch(setError(`SharedOrderDrafts error: ${error.message}`))
      );

      console.log('Middleware listening to: shared/data/masterInventory');
      const unsubMasterInventory = subscribeToMasterInventory(
        (masterInventory) => {
          console.log('Middleware received data for: shared/data/masterInventory', masterInventory.length);
          store.dispatch(setBranchData({ masterInventory }));
        },
        (error) => store.dispatch(setError(`MasterInventory error: ${error.message}`))
      );

      console.log('Middleware listening to: shared/data/suppliers');
      const unsubSuppliers = subscribeToSuppliers(
        (suppliers) => {
          console.log('Middleware received data for: shared/data/suppliers', suppliers.length);
          store.dispatch(setBranchData({ suppliers }));
        },
        (error) => store.dispatch(setError(`Suppliers error: ${error.message}`))
      );

      console.log('Middleware listening to: shared/data/tasks');
      const unsubTasks = subscribeToTasks(
        (tasks) => {
          console.log('Middleware received data for: shared/data/tasks', tasks.length);
          store.dispatch(setBranchData({ tasks }));
        },
        (error) => store.dispatch(setError(`Tasks error: ${error.message}`))
      );

      // 3. Branch-specific Data Collections
      console.log('Middleware listening to: branches/bywood/requests');
      const unsubBywoodRequests = subscribeToRequests('bywood',
        (bywoodRequests) => {
          console.log('Middleware received data for: branches/bywood/requests', bywoodRequests.length);
          store.dispatch(setBranchData({ bywoodRequests }));
        },
        (error) => store.dispatch(setError(`BywoodRequests error: ${error.message}`))
      );
      console.log('Middleware listening to: branches/broom/requests');
      const unsubBroomRequests = subscribeToRequests('broom',
        (broomRequests) => {
          console.log('Middleware received data for: branches/broom/requests', broomRequests.length);
          store.dispatch(setBranchData({ broomRequests }));
        },
        (error) => store.dispatch(setError(`BroomRequests error: ${error.message}`))
      );

      console.log('Middleware listening to: branches/bywood/orders');
      const unsubBywoodOrders = subscribeToOrders('bywood',
        (bywoodOrders) => {
          console.log('Middleware received data for: branches/bywood/orders', bywoodOrders.length);
          store.dispatch(setBranchData({ bywoodOrders }));
        },
        (error) => store.dispatch(setError(`BywoodOrders error: ${error.message}`))
      );
      console.log('Middleware listening to: branches/broom/orders');
      const unsubBroomOrders = subscribeToOrders('broom',
        (broomOrders) => {
          console.log('Middleware received data for: branches/broom/orders', broomOrders.length);
          store.dispatch(setBranchData({ broomOrders }));
        },
        (error) => store.dispatch(setError(`BroomOrders error: ${error.message}`))
      );

      console.log('Middleware listening to: branches/bywood/planograms');
      const unsubBywoodPlanograms = subscribeToPlanograms('bywood',
        (bywoodPlanograms) => {
          console.log('Middleware received data for: branches/bywood/planograms', bywoodPlanograms.length);
          store.dispatch(setBranchData({ bywoodPlanograms }));
        },
        (error) => store.dispatch(setError(`BywoodPlanograms error: ${error.message}`))
      );
      console.log('Middleware listening to: branches/broom/planograms');
      const unsubBroomPlanograms = subscribeToPlanograms('broom',
        (broomPlanograms) => {
          console.log('Middleware received data for: branches/broom/planograms', broomPlanograms.length);
          store.dispatch(setBranchData({ broomPlanograms }));
        },
        (error) => store.dispatch(setError(`BroomPlanograms error: ${error.message}`))
      );

      console.log('Middleware listening to: branches/bywood/floorPlans');
      const unsubBywoodFloorPlans = subscribeToFloorPlans('bywood',
        (bywoodFloorPlans) => {
          console.log('Middleware received data for: branches/bywood/floorPlans', bywoodFloorPlans.length);
          store.dispatch(setBranchData({ bywoodFloorPlans }));
        },
        (error) => store.dispatch(setError(`BywoodFloorPlans error: ${error.message}`))
      );
      console.log('Middleware listening to: branches/broom/floorPlans');
      const unsubBroomFloorPlans = subscribeToFloorPlans('broom',
        (broomFloorPlans) => {
          console.log('Middleware received data for: branches/broom/floorPlans', broomFloorPlans.length);
          store.dispatch(setBranchData({ broomFloorPlans }));
        },
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

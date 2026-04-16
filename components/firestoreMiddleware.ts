import { Middleware } from '@reduxjs/toolkit';
import { subscribeToProducts } from '../services/firestoreService';
import { 
  setInventory, 
  setError, 
  startInventoryListeners, 
  stopInventoryListeners,
  setStatus
} from './stockSlice';
import { Unsubscribe } from 'firebase/firestore';

let inventoryUnsubscribes: Unsubscribe[] = [];

export const firestoreMiddleware: Middleware = store => next => action => {
  if (startInventoryListeners.match(action)) {
    // Clear any existing listeners first
    inventoryUnsubscribes.forEach(unsub => unsub());
    inventoryUnsubscribes = [];

    try {
      // Start listeners for both branches
      const unsubBywood = subscribeToProducts('bywood', (products) => {
        store.dispatch(setInventory({ branch: 'bywood', products }));
        store.dispatch(setStatus('succeeded'));
      }, (error) => {
        store.dispatch(setError(`Bywood products listener error: ${error.message}`));
      });

      const unsubBroom = subscribeToProducts('broom', (products) => {
        store.dispatch(setInventory({ branch: 'broom', products }));
        store.dispatch(setStatus('succeeded'));
      }, (error) => {
        store.dispatch(setError(`Broom products listener error: ${error.message}`));
      });

      inventoryUnsubscribes.push(unsubBywood, unsubBroom);
    } catch (err: any) {
      store.dispatch(setError(err.message || 'Failed to start inventory listeners'));
    }
  }

  if (stopInventoryListeners.match(action)) {
    inventoryUnsubscribes.forEach(unsub => unsub());
    inventoryUnsubscribes = [];
  }

  return next(action);
};

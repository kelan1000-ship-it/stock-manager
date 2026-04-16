import { configureStore } from '@reduxjs/toolkit';
import stockReducer from './stockSlice';
import { firestoreMiddleware } from './firestoreMiddleware';

export const store = configureStore({
  reducer: {
    stock: stockReducer,
    // Add other reducers here as the integration progresses
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(firestoreMiddleware),
});

export default store;

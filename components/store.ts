import { configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
// react-redux v9: .withTypes<>() is the correct way to create a pre-typed selector hook
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;

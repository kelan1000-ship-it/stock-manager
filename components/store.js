import { configureStore } from '@reduxjs/toolkit';
import stockReducer from './stockSlice';

export const store = configureStore({
  reducer: {
    stock: stockReducer,
    // Add other reducers here as the integration progresses
  },
});

export default store;

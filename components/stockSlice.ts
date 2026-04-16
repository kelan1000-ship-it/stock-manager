import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  BranchData, 
  Product, 
  Message, 
  Transfer, 
  CustomerRequest, 
  OrderItem, 
  JointOrder, 
  MasterProduct, 
  PlanogramLayout, 
  ShopFloor, 
  Supplier, 
  BranchTask, 
  SharedOrderDraft,
  BranchKey
} from '../types';

export interface StockState extends BranchData {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: StockState = {
  bywood: [],
  broom: [],
  messages: [],
  transfers: [],
  bywoodRequests: [],
  broomRequests: [],
  bywoodRequests_archived: [],
  broomRequests_archived: [],
  bywoodOrders: [],
  broomOrders: [],
  jointOrders: [],
  masterInventory: [],
  bywoodPlanograms: [],
  broomPlanograms: [],
  bywoodFloorPlans: [],
  broomFloorPlans: [],
  suppliers: [],
  tasks: [],
  screenshotHistory: [],
  sharedOrderDrafts: [],
  status: 'idle',
  error: null
};

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    setBranchData: (state, action: PayloadAction<Partial<BranchData>>) => {
      Object.assign(state, action.payload);
    },
    setInventory: (state, action: PayloadAction<{ branch: BranchKey; products: Product[] }>) => {
      if (action.payload.branch === 'bywood') {
        state.bywood = action.payload.products;
      } else {
        state.broom = action.payload.products;
      }
    },
    addStockItem: (state, action: PayloadAction<{ branch: BranchKey; product: Product }>) => {
      if (action.payload.branch === 'bywood') {
        state.bywood.push(action.payload.product);
      } else {
        state.broom.push(action.payload.product);
      }
    },
    updateStockItem: (state, action: PayloadAction<{ branch: BranchKey; product: Partial<Product> & { id: string } }>) => {
      const { branch, product } = action.payload;
      const items = branch === 'bywood' ? state.bywood : state.broom;
      const index = items.findIndex(item => item.id === product.id);
      if (index !== -1) {
        items[index] = { ...items[index], ...product };
      }
    },
    removeStockItem: (state, action: PayloadAction<{ branch: BranchKey; productId: string }>) => {
      if (action.payload.branch === 'bywood') {
        state.bywood = state.bywood.filter(item => item.id !== action.payload.productId);
      } else {
        state.broom = state.broom.filter(item => item.id !== action.payload.productId);
      }
    },
    setStatus: (state, action: PayloadAction<StockState['status']>) => {
      state.status = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.status = 'failed';
    },
    // Actions for middleware to intercept
    startInventoryListeners: (state) => {
      state.status = 'loading';
    },
    stopInventoryListeners: () => {}
  }
});

export const { 
  setBranchData, 
  setInventory, 
  setInventory: setStock,
  addStockItem,
  updateStockItem,
  removeStockItem,
  setStatus, 
  setError,
  startInventoryListeners,
  stopInventoryListeners
} = stockSlice.actions;

export default stockSlice.reducer;

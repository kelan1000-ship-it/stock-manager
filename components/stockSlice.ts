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
  status: 'idle' | 'loading' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  error: string | null;
  lastSeenMessagesTimestamp: number;
  unreadCounts: { messages: number; transfers: number };
  currentBranch: BranchKey;
  lastNotification?: {
    type: 'message' | 'transfer';
    count: number;
    timestamp: number;
  };
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
  error: null,
  lastSeenMessagesTimestamp: Number(localStorage.getItem('lastSeenMessagesTimestamp') || 0),
  unreadCounts: { messages: 0, transfers: 0 },
  currentBranch: 'bywood'
};

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    setCurrentBranch: (state, action: PayloadAction<BranchKey>) => {
      state.currentBranch = action.payload;
    },
    updateUnreadCounts: (state, action: PayloadAction<{messages: number, transfers: number}>) => {
      state.unreadCounts = action.payload;
    },
    requestTransfer: (state, action: PayloadAction<{ product: Product, quantity: number, partQuantity: number, type: 'send' | 'request', note: string, sourceBranch: BranchKey, targetBranch: BranchKey }>) => {
      // Handled by middleware
    },
    setBranchData: (state, action: PayloadAction<Partial<BranchData>>) => {
      const updates = { ...action.payload };
      
      const parseTS = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts === 'number') return ts;
        if (ts.toMillis) return ts.toMillis();
        if (ts.seconds) return ts.seconds * 1000;
        if (typeof ts === 'string') return new Date(ts).getTime();
        return 0;
      };

      // Special handling for messages to sort by timestamp
      if (updates.messages) {
        state.messages = [...updates.messages]
          .sort((a, b) => parseTS(a.timestamp) - parseTS(b.timestamp));
        delete updates.messages;
      }

      // Merge other properties
      Object.assign(state, updates);
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      const parseTS = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts === 'number') return ts;
        if (ts.toMillis) return ts.toMillis();
        if (ts.seconds) return ts.seconds * 1000;
        if (typeof ts === 'string') return new Date(ts).getTime();
        return 0;
      };

      state.messages = [...action.payload]
        .sort((a, b) => parseTS(a.timestamp) - parseTS(b.timestamp));
    },
    setLastSeenMessages: (state, action: PayloadAction<number>) => {
      state.lastSeenMessagesTimestamp = action.payload;
      localStorage.setItem('lastSeenMessagesTimestamp', String(action.payload));
    },
    setTransfers: (state, action: PayloadAction<Transfer[]>) => {
      state.transfers = action.payload;
    },
    triggerNotification: (state, action: PayloadAction<StockState['lastNotification']>) => {
      state.lastNotification = action.payload;
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
  setMessages,
  setTransfers,
  setLastSeenMessages,
  setCurrentBranch,
  setCurrentBranch: setCurrentBranchAction,
  updateUnreadCounts,
  requestTransfer,
  triggerNotification,
  addStockItem,
  updateStockItem,
  removeStockItem,
  setStatus, 
  setError,
  startInventoryListeners,
  stopInventoryListeners
} = stockSlice.actions;

export default stockSlice.reducer;


export interface PriceHistoryEntry {
  date: string;
  rrp: number;
  costPrice: number;
  margin: number;
}

export interface OrderHistoryEntry {
  date: string;
  quantity: number;
}

export interface StockMovement {
  date: string;
  type: 'manual' | 'order' | 'transfer_in' | 'transfer_out';
  change: number;
  newBalance: number;
  note?: string;
}

export interface Message {
  id: string;
  sender: BranchKey;
  text: string;
  timestamp: string;
  isRead: boolean;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string;
}

export interface Transfer {
  id: string;
  type: 'send' | 'request';
  sourceBranch: BranchKey;
  targetBranch: BranchKey;
  barcode: string;
  name: string;
  packSize: string;
  quantity: number;
  partQuantity?: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  note?: string;
  replyNote?: string;
  resolvedAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  packSize: string;
  supplier: string;
  quantity: number;
  status: 'pending' | 'ordered' | 'backorder' | 'cancelled' | 'completed';
  timestamp: string;
}

export interface JointOrder {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  packSize: string;
  totalQuantity: number;
  allocationBywood: number;
  allocationBroom: number;
  status: 'pending_allocation' | 'distributed';
  timestamp: string;
}

export interface CustomerRequest {
  id: string;
  customerName: string;
  contactNumber: string;
  itemName: string;
  barcode?: string;
  productCode?: string;
  supplier?: string;
  quantity: number;
  quantityOrdered: number;
  priceToPay: number;
  isPaid: boolean;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'ordered' | 'ready' | 'completed';
  notes?: string;
  timestamp: string;
  isArchived?: boolean;
  deletedAt?: string;
}

export interface MasterProduct {
  id: string;
  name: string;
  barcode: string;
  productCode?: string;
  packSize: string;
  price?: number;
  costPrice?: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  productCode?: string;
  packSize: string;
  price: number;
  costPrice: number;
  stockToKeep: number;
  stockInHand: number;
  partPacks?: number;
  isOrdered: boolean;
  supplier: string;
  location: string;
  parentGroup?: string;
  productImage: string | null;
  sourceUrls?: { title: string; uri: string }[];
  priceHistory: PriceHistoryEntry[];
  orderHistory: OrderHistoryEntry[];
  stockHistory: StockMovement[];
  lastOrderedDate: string | null;
  lastUpdated: string;
  pendingPriceUpdate?: boolean;
  ignorePriceGap?: boolean;
  isPriceSynced?: boolean;
  isUnavailable?: boolean;
  isArchived?: boolean;
  deletedAt?: string;
  isShared?: boolean;
  enableThresholdAlert?: boolean;
  isDiscontinued?: boolean;
  isShortExpiry?: boolean;
  expiryDate?: string;
  isReducedToClear?: boolean;
  stockType?: 'retail' | 'dispensary';
  notes?: string;
  labelNeedsUpdate?: boolean;
  ignoredPriceAlertUntil?: string;
  tags?: string[];
  targetPrice?: number;
  priceChangeOrigin?: BranchKey;
}

export interface PlanogramSlot {
  id: number;
  productId: string | null;
}

export interface PlanogramFace {
  id: string;
  name: string;
  cols: number;
  rows: number;
  slots: PlanogramSlot[];
}

export interface PlanogramLayout {
  id: string;
  name: string;
  branch: BranchKey;
  // Legacy/Default Face fields
  slots: PlanogramSlot[];
  cols: number;
  rows: number;
  // Multi-face support
  faces?: PlanogramFace[]; 
  
  location?: string;
  description?: string;
  realShelfImage?: string | null;
  aiVisualisation?: string | null;
}

export interface ShopFloorItem {
  id: string;
  planogramId: string;
  x: number; // Percent
  y: number; // Percent
  rotation: number; // Degrees
  width: number; // Percent
  depth: number; // Percent
}

export interface ShopFloor {
  id: string;
  branch: BranchKey;
  items: ShopFloorItem[];
}

export interface BranchData {
  bywood: Product[];
  broom: Product[];
  messages: Message[];
  transfers: Transfer[];
  bywoodRequests: CustomerRequest[];
  broomRequests: CustomerRequest[];
  bywoodRequests_archived?: CustomerRequest[];
  broomRequests_archived?: CustomerRequest[];
  bywoodOrders: OrderItem[];
  broomOrders: OrderItem[];
  jointOrders: JointOrder[];
  masterInventory: MasterProduct[];
  planograms?: PlanogramLayout[];
  floorPlans?: ShopFloor[];
}

export type BranchKey = 'bywood' | 'broom';

export interface ExtractedProductInfo {
  barcode?: string;
  productCode?: string;
  name?: string;
  packSize?: string;
  price?: string;
  imageUrl?: string;
  sourceUrls?: { title: string; uri: string }[];
}

export interface OrderSuggestion {
  suggestedQuantity: number;
  reasoning: string;
}

export interface PriceReviewItem {
  barcode: string;
  name: string;
  packSize: string;
  bywood: {
    oldPrice: number;
    newPrice: number;
    exists: boolean;
    cost: number;
  };
  broom: { oldPrice: number; newPrice: number; exists: boolean; cost: number };
}

export type TriState = 'keep' | 'on' | 'off';

/**
 * Shared type for inventory sub-filtering views.
 */
export type InventorySubFilter = 'all' | 'restock' | 'ordered' | 'expiring' | 'clearance' | 'alerts' | 'labels' | 'slow-movers';

export interface ProductFormData {
  name: string;
  barcode: string;
  productCode: string;
  packSize: string;
  price: string;
  costPrice: string;
  stockToKeep: string;
  stockInHand: string;
  partPacks: string;
  supplier: string;
  location: string;
  parentGroup: string;
  productImage: string;
  sourceUrls: { title: string; uri: string }[];
  notes: string;
  expiryDate: string;
  isDiscontinued: boolean;
  isUnavailable: boolean;
  isReducedToClear: boolean;
  isShared: boolean;
  isPriceSynced: boolean;
  enableThresholdAlert: boolean;
  stockType: 'retail' | 'dispensary';
  tags: string[];
}

export interface RequestFormData {
  customerName: string;
  contactNumber: string;
  itemName: string;
  barcode: string;
  productCode: string;
  supplier: string;
  quantity: number;
  quantityOrdered?: number;
  priceToPay: number;
  isPaid: boolean;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  notes: string;
  timestamp?: string;
}

export interface BulkItem {
  tempId: string;
  name: string;
  barcode: string;
  packSize?: string;
  priceStr?: string;
  costPriceStr?: string;
  stockInHandStr?: string;
  status: 'draft' | 'ready';
  productImage?: string;
  productCode?: string;
  stockType?: string;
  location?: string;
}

export interface ColumnVisibility {
  rrp: boolean;
  margin: boolean;
  stock: boolean;
  order: boolean;
  status: boolean;
}

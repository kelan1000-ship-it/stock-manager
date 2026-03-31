
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
  type: 'manual' | 'order' | 'transfer_in' | 'transfer_out' | 'sale' | 'return';
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
  taskId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string;
  isNudge?: boolean;
  deletedBy?: string[];
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: BranchKey;
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
  confirmedAt?: string;
  clearedBy?: string[];
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
  productCode?: string;
  packSize: string;
  totalQuantity: number;
  allocationBywood: number;
  allocationBroom: number;
  status: 'restock' | 'pending_allocation' | 'distributed' | 'cancelled';
  timestamp: string;
  restockRequestedBy?: string[];
}

export interface SharedOrderDraft {
  id: string;
  barcode: string;
  productCode?: string;
  bywood: number;
  broom: number;
  bywoodConfirmed: boolean;
  broomConfirmed: boolean;
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
  subheader?: string;
  parentGroup?: string;
  barcode: string;
  productCode?: string;
  packSize: string;
  price?: number;
  costPrice?: number;
  supplier?: string;
  image?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  catalogueUrl?: string;
  notes?: string;
  lastUpdated?: string;
}

export interface Product {
  id: string;
  name: string;
  subheader?: string;
  barcode: string;
  productCode?: string;
  packSize: string;
  price: number;
  costPrice: number;
  stockToKeep: number;
  looseStockToKeep?: number;
  stockInHand: number;
  partPacks?: number;
  looseUnitPrice?: number;  // price per single loose unit for dispensary items
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
  ignoreAttributeReport?: boolean;
  isShared?: boolean;
  enableThresholdAlert?: boolean;
  thresholdType?: 'percentage' | 'quantity';
  thresholdValue?: number;
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
  isExcessStock?: boolean;
  keywords?: string;
  createdAt?: string;
  noVat?: boolean;
}

export interface PlanogramSlot {
  id: number;
  productId: string | null;
  purpose?: 'product' | 'gap' | 'shelf_end';
}

export interface PlanogramFace {
  id: string;
  name: string;
  cols: number;
  rows: number;
  slots: PlanogramSlot[];
  aiVisualisation?: string | null;
  realShelfImage?: string | null;
}

export interface SavedPlanogramConfiguration {
  id: string;
  name: string;
  timestamp: string;
  slots: PlanogramSlot[];
  cols: number;
  rows: number;
  faces?: PlanogramFace[];
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
  images?: { url: string; name: string; size: number }[];
  savedConfigurations?: SavedPlanogramConfiguration[];
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

export interface TaskComment {
  id: string;
  author: BranchKey;
  text: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
}

export interface BranchTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdBy: BranchKey;
  assignedTo?: BranchKey | 'both';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  images?: { url: string; name: string; size: number }[];
  links?: { url: string; title: string }[];
  comments?: TaskComment[];
}

export type ScreenshotPersistenceMethod = 'temp_file' | 'modal' | 'history';

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
  bywoodPlanograms?: PlanogramLayout[];
  broomPlanograms?: PlanogramLayout[];
  bywoodFloorPlans?: ShopFloor[];
  broomFloorPlans?: ShopFloor[];
  suppliers?: Supplier[];
  tasks?: BranchTask[];
  screenshotHistory?: { id: string, data: string, timestamp: string, fileName: string }[];
  sharedOrderDrafts?: SharedOrderDraft[];
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
export type InventorySubFilter = 'all' | 'restock' | 'ordered' | 'expiring' | 'clearance' | 'alerts' | 'labels' | 'slow-movers' | 'recently-added';

export interface ProductFormData {
  name: string;
  subheader: string;
  barcode: string;
  productCode: string;
  packSize: string;
  price: string;
  costPrice: string;
  stockToKeep: string;
  looseStockToKeep: string;
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
  thresholdType?: 'percentage' | 'quantity';
  thresholdValue?: number;
  looseUnitPrice: string;
  stockType: 'retail' | 'dispensary';
  tags: string[];
  isExcessStock: boolean;
  keywords: string;
  noVat: boolean;
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
  originalData?: Partial<BulkItem>;
  isProcessing?: boolean;
  isError?: boolean;
}

export interface ColumnVisibility {
  rrp: boolean;
  margin: boolean;
  stock: boolean;
  order: boolean;
  status: boolean;
}

// ═══ EPOS Types ═══

export interface EposCartItem {
  id: string;
  productId: string | null;
  name: string;
  barcode?: string;
  packSize?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isMiscellaneous: boolean;
  refunded?: boolean;
  refundedAt?: string;
  refundMethod?: 'cash' | 'card';
  noDiscountAllowed?: boolean;
  noVat?: boolean;
}

export interface EposTransaction {
  id: string;
  branch: BranchKey;
  items: EposCartItem[];
  subtotal: number;
  total: number;
  vatAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  amountTendered: number;
  changeDue: number;
  cashAmount?: number;
  cardAmount?: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  timestamp: string;
  operator: string;
  voided?: boolean;
  voidedAt?: string;
  voidReason?: string;
  refunds?: { itemId: string; amount: number; refundedAt: string; method: 'cash' | 'card' }[];
  type?: 'sale' | 'refund';
}

export interface EposZRead {
  id: string;
  branch: BranchKey;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  voidedCount: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalMixed: number;
  itemsSold: number;
  topItems: { name: string; quantity: number; total: number }[];
  totalRefunded: number;
  refundCount: number;
  operator: string;
  timestamp: string;
}

export interface EposQuickButton {
  id: string;
  label: string;
  description?: string;
  price: number;
  productId?: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  noDiscountAllowed?: boolean;
  variablePrice?: boolean;
  noVat?: boolean;
}

export interface EposConfig {
  id: string;              // always 'default'
  branch: BranchKey;
  staffDiscountPercent: number;
}

export interface ReconciliationExclusion {
  id: string;
  type: 'barcode' | 'name' | 'rule';
  value: string;
  ruleConfig?: {
    field: keyof Product;
    operator: 'lt' | 'gt' | 'eq' | 'contains';
    threshold: string | number;
  };
}

// ═══ Staff Hours Types ═══

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  branch: BranchKey;
  isActive: boolean;
  color: string;
  createdAt: string;
  sortOrder: number;
}

export interface StaffShift {
  id: string;
  staffId: string;
  staffName: string;
  branch: BranchKey;
  date: string;
  clockIn: string;
  clockOut: string | null;
  totalHours: number | null;
  breakMinutes: number;
  note: string;
  operator: string;
  sortOrder?: number;
}

export interface StaffHoliday {
  id: string;
  staffId: string;
  staffName: string;
  branch: BranchKey;
  startDate: string;
  endDate: string;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  notes: string;
  approvedBy: string;
  createdAt: string;
}

export interface ShiftPreset {
  id: string;
  branch: BranchKey;
  label: string;
  inTime: string;
  outTime: string;
  breakMinutes: number;
  color?: string;
  sortOrder: number;
}

export type StaffHoursViewMode = 'day' | 'week' | 'month';

// Default store operating hours per day of week (0=Sun, 1=Mon, ..., 6=Sat)
export interface StoreHoursConfig {
  id: string;              // always 'default'
  branch: BranchKey;
  days: Record<string, {   // keys: '0'-'6' (day of week)
    closed: boolean;
    presetId: string;
    staffIds: string[];    // which staff to auto-assign on this day-of-week
  }>;
}

// Override for a specific date (e.g. mark a Sunday as open, or a weekday as closed)
export interface DayOverride {
  id: string;              // the date string YYYY-MM-DD
  branch: BranchKey;
  date: string;            // YYYY-MM-DD
  isOpen: boolean;
}

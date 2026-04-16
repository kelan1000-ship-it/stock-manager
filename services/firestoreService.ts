import {
  collection, doc, setDoc, updateDoc, deleteDoc, writeBatch,
  onSnapshot, query, Unsubscribe, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Product, Message, Transfer, MasterProduct, CustomerRequest,
         OrderItem, JointOrder, SharedOrderDraft, PlanogramLayout, ShopFloor, BranchKey, Supplier, BranchTask,
         EposTransaction, EposQuickButton, EposZRead, EposCartItem,
         StaffMember, StaffShift, StaffHoliday, ShiftPreset,
         StoreHoursConfig, DayOverride } from '../types';

export interface EposDraft {
  cart: EposCartItem[];
  discountPercent: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  amountTendered: string;
  updatedAt: string;
  operator: string;
}

// ═══ TASKS ═══

export function subscribeToTasks(callback: (t: BranchTask[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'tasks'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as BranchTask[]);
  }, (error) => { console.error('Listener error [tasks]:', error); onError?.(error); });
}

export async function saveTask(task: BranchTask) {
  await setDoc(doc(db, 'shared', 'data', 'tasks', task.id), task);
}

export async function deleteTaskFromDb(taskId: string) {
  await deleteDoc(doc(db, 'shared', 'data', 'tasks', taskId));
}

// ═══ SUPPLIERS ═══

export function subscribeToSuppliers(callback: (s: Supplier[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'suppliers'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as Supplier[]);
  }, (error) => { console.error('Listener error [suppliers]:', error); onError?.(error); });
}

export async function saveSupplier(supplier: Supplier) {
  await setDoc(doc(db, 'shared', 'data', 'suppliers', supplier.id), supplier);
}

export async function deleteSupplierFromDb(supplierId: string) {
  await deleteDoc(doc(db, 'shared', 'data', 'suppliers', supplierId));
}

// ═══ PRODUCTS ═══

export function subscribeToProducts(
  branch: BranchKey, callback: (products: Product[]) => void, onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'products'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as Product[]);
  }, (error) => { console.error(`Listener error [products/${branch}]:`, error); onError?.(error); });
}

export async function saveProduct(branch: BranchKey, product: Product) {
  await setDoc(doc(db, 'branches', branch, 'products', product.id),
    { ...product, lastUpdated: new Date().toISOString() });
}

export async function deleteProductFromDb(branch: BranchKey, productId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'products', productId));
}

export async function batchSaveProducts(branch: BranchKey, products: Product[]) {
  for (let i = 0; i < products.length; i += 450) {
    const batch = writeBatch(db);
    products.slice(i, i + 450).forEach(p => {
      batch.set(doc(db, 'branches', branch, 'products', p.id), p);
    });
    await batch.commit();
  }
}

// ═══ MESSAGES ═══

export function subscribeToMessages(callback: (m: Message[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'messages'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as Message[]);
  }, (error) => { console.error('Listener error [messages]:', error); onError?.(error); });
}

export async function saveMessage(message: Message) {
  await setDoc(doc(db, 'shared', 'data', 'messages', message.id), message);
}

export async function updateMessage(messageId: string, updates: Partial<Message>) {
  await updateDoc(doc(db, 'shared', 'data', 'messages', messageId), updates);
}

export async function batchUpdateMessages(messageIds: string[], updates: Partial<Message>) {
  for (let i = 0; i < messageIds.length; i += 450) {
    const batch = writeBatch(db);
    messageIds.slice(i, i + 450).forEach(id => {
      batch.update(doc(db, 'shared', 'data', 'messages', id), updates as any);
    });
    await batch.commit();
  }
}

// ═══ TRANSFERS ═══

export function subscribeToTransfers(callback: (t: Transfer[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'transfers'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as Transfer[]);
  }, (error) => { console.error('Listener error [transfers]:', error); onError?.(error); });
}

export async function saveTransfer(transfer: Transfer) {
  await setDoc(doc(db, 'shared', 'data', 'transfers', transfer.id), transfer);
}

// ═══ CUSTOMER REQUESTS ═══

export function subscribeToRequests(
  branch: BranchKey, callback: (r: CustomerRequest[]) => void, onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'requests'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as CustomerRequest[]);
  }, (error) => { console.error(`Listener error [requests/${branch}]:`, error); onError?.(error); });
}

export async function saveRequest(branch: BranchKey, request: CustomerRequest) {
  await setDoc(doc(db, 'branches', branch, 'requests', request.id), request);
}

export async function deleteRequestFromDb(branch: BranchKey, requestId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'requests', requestId));
}

// ═══ ORDERS ═══

export function subscribeToOrders(
  branch: BranchKey, callback: (o: OrderItem[]) => void, onError?: (error: Error) => void
): Unsubscribe {
  const key = branch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
  return onSnapshot(collection(db, 'shared', 'data', key), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as OrderItem[]);
  }, (error) => { console.error(`Listener error [orders/${branch}]:`, error); onError?.(error); });
}

export async function saveOrder(branch: BranchKey, order: OrderItem) {
  const key = branch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
  await setDoc(doc(db, 'shared', 'data', key, order.id), order);
}

// ═══ JOINT ORDERS ═══

export function subscribeToJointOrders(callback: (o: JointOrder[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'jointOrders'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as JointOrder[]);
  }, (error) => { console.error('Listener error [jointOrders]:', error); onError?.(error); });
}

export async function saveJointOrder(order: JointOrder) {
  await setDoc(doc(db, 'shared', 'data', 'jointOrders', order.id), order);
}

// ═══ SHARED ORDER DRAFTS ═══

export function subscribeToSharedOrderDrafts(callback: (d: SharedOrderDraft[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'orderDrafts'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as SharedOrderDraft[]);
  }, (error) => { console.error('Listener error [orderDrafts]:', error); onError?.(error); });
}

export async function saveSharedOrderDraft(draft: SharedOrderDraft) {
  await setDoc(doc(db, 'shared', 'data', 'orderDrafts', draft.id), draft);
}

export async function deleteSharedOrderDraft(id: string) {
  await deleteDoc(doc(db, 'shared', 'data', 'orderDrafts', id));
}

// ═══ MASTER INVENTORY ═══

export function subscribeToMasterInventory(callback: (p: MasterProduct[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'shared', 'data', 'masterInventory'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as MasterProduct[]);
  }, (error) => { console.error('Listener error [masterInventory]:', error); onError?.(error); });
}

export async function saveMasterProduct(product: MasterProduct) {
  await setDoc(doc(db, 'shared', 'data', 'masterInventory', product.id), product);
}

export async function deleteMasterProductFromDb(productId: string) {
  await deleteDoc(doc(db, 'shared', 'data', 'masterInventory', productId));
}

// ═══ PLANOGRAMS ═══

export function subscribeToPlanograms(branch: BranchKey, callback: (l: PlanogramLayout[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'planograms'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as PlanogramLayout[]);
  }, (error) => { console.error(`Listener error [planograms/${branch}]:`, error); onError?.(error); });
}

export async function savePlanogram(branch: BranchKey, layout: PlanogramLayout) {
  await setDoc(doc(db, 'branches', branch, 'planograms', layout.id), layout as any);
}

export async function deletePlanogramFromDb(branch: BranchKey, layoutId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'planograms', layoutId));
}

// ═══ FLOOR PLANS ═══

export function subscribeToFloorPlans(branch: BranchKey, callback: (f: ShopFloor[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'floorPlans'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as ShopFloor[]);
  }, (error) => { console.error(`Listener error [floorPlans/${branch}]:`, error); onError?.(error); });
}

export async function saveFloorPlan(branch: BranchKey, floor: ShopFloor) {
  await setDoc(doc(db, 'branches', branch, 'floorPlans', floor.id), floor as any);
}

// ═══ EPOS TRANSACTIONS ═══

export function subscribeToEposTransactions(branch: BranchKey, callback: (t: EposTransaction[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'eposTransactions'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as EposTransaction[]);
  }, (error) => { console.error(`Listener error [eposTransactions/${branch}]:`, error); onError?.(error); });
}

export async function saveEposTransaction(branch: BranchKey, transaction: EposTransaction) {
  await setDoc(doc(db, 'branches', branch, 'eposTransactions', transaction.id), transaction);
}

export async function deleteEposTransaction(branch: BranchKey, transactionId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'eposTransactions', transactionId));
}

export async function getEposTransactionsSnapshot(branch: BranchKey): Promise<EposTransaction[]> {
  const snap = await getDocs(collection(db, 'branches', branch, 'eposTransactions'));
  return snap.docs.map(d => ({ ...d.data(), id: d.id })) as EposTransaction[];
}

// ═══ EPOS QUICK BUTTONS ═══

export function subscribeToEposQuickButtons(branch: BranchKey, callback: (b: EposQuickButton[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'eposQuickButtons'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as EposQuickButton[]);
  }, (error) => { console.error(`Listener error [eposQuickButtons/${branch}]:`, error); onError?.(error); });
}

export async function saveEposQuickButton(branch: BranchKey, button: EposQuickButton) {
  await setDoc(doc(db, 'branches', branch, 'eposQuickButtons', button.id), button);
}

export async function deleteEposQuickButton(branch: BranchKey, buttonId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'eposQuickButtons', buttonId));
}

// ═══ EPOS Z-READS ═══

export function subscribeToEposZReads(branch: BranchKey, callback: (z: EposZRead[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'eposZReads'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as EposZRead[]);
  }, (error) => { console.error(`Listener error [eposZReads/${branch}]:`, error); onError?.(error); });
}

export async function saveEposZRead(branch: BranchKey, zRead: EposZRead) {
  await setDoc(doc(db, 'branches', branch, 'eposZReads', zRead.id), zRead);
}

export async function deleteEposZRead(branch: BranchKey, zReadId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'eposZReads', zReadId));
}

// ═══ EPOS DRAFT (cart persistence) ═══

export function subscribeToEposDraft(branch: BranchKey, callback: (draft: EposDraft | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'branches', branch, 'eposDraft', 'current'), (snap) => {
    callback(snap.exists() ? (snap.data() as EposDraft) : null);
  }, (error) => { console.error(`Listener error [eposDraft/${branch}]:`, error); });
}

export async function saveEposDraft(branch: BranchKey, draft: EposDraft) {
  await setDoc(doc(db, 'branches', branch, 'eposDraft', 'current'), draft);
}

export async function deleteEposDraft(branch: BranchKey) {
  await deleteDoc(doc(db, 'branches', branch, 'eposDraft', 'current'));
}

// ═══ EPOS CONFIG ═══

export interface EposConfig { [key: string]: any; } export function subscribeToEposConfig(branch: BranchKey, callback: (config: EposConfig | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'branches', branch, 'config', 'epos'), (snap) => {
    callback(snap.exists() ? ({ ...snap.data(), id: snap.id } as EposConfig) : null);
  }, (error) => { console.error(`Listener error [eposConfig/${branch}]:`, error); });
}

export async function saveEposConfig(branch: BranchKey, config: EposConfig) {
  await setDoc(doc(db, 'branches', branch, 'config', 'epos'), config);
}

// ═══ STOCK MANAGER CONFIG ═══

export interface StockManagerConfig { productTitleFontSize: number; }
export function subscribeToStockManagerConfig(callback: (config: StockManagerConfig | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'shared', 'data', 'config', 'stockManager'), (snap) => {
    callback(snap.exists() ? ({ ...snap.data() } as StockManagerConfig) : null);
  }, (error) => { console.error(`Listener error [stockManagerConfig]:`, error); });
}

export async function saveStockManagerConfig(config: StockManagerConfig) {
  await setDoc(doc(db, 'shared', 'data', 'config', 'stockManager'), config, { merge: true });
}

// ═══ STAFF MEMBERS ═══

export function subscribeToStaffMembers(branch: BranchKey, callback: (s: StaffMember[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'staffMembers'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as StaffMember[]);
  }, (error) => { console.error(`Listener error [staffMembers/${branch}]:`, error); onError?.(error); });
}

export async function saveStaffMember(branch: BranchKey, member: StaffMember) {
  await setDoc(doc(db, 'branches', branch, 'staffMembers', member.id), member);
}

export async function deleteStaffMember(branch: BranchKey, memberId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'staffMembers', memberId));
}

// ═══ STAFF SHIFTS ═══

export function subscribeToStaffShifts(branch: BranchKey, callback: (s: StaffShift[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'staffShifts'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as StaffShift[]);
  }, (error) => { console.error(`Listener error [staffShifts/${branch}]:`, error); onError?.(error); });
}

export async function saveStaffShift(branch: BranchKey, shift: StaffShift) {
  await setDoc(doc(db, 'branches', branch, 'staffShifts', shift.id), shift);
}

export async function deleteStaffShift(branch: BranchKey, shiftId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'staffShifts', shiftId));
}

// ═══ SHIFT PRESETS ═══

export function subscribeToShiftPresets(branch: BranchKey, callback: (p: ShiftPreset[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'shiftPresets'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as ShiftPreset[]);
  }, (error) => { console.error(`Listener error [shiftPresets/${branch}]:`, error); onError?.(error); });
}

export async function saveShiftPreset(branch: BranchKey, preset: ShiftPreset) {
  await setDoc(doc(db, 'branches', branch, 'shiftPresets', preset.id), preset);
}

export async function deleteShiftPreset(branch: BranchKey, presetId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'shiftPresets', presetId));
}

// ═══ STAFF HOLIDAYS ═══

export function subscribeToStaffHolidays(branch: BranchKey, callback: (h: StaffHoliday[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'staffHolidays'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as StaffHoliday[]);
  }, (error) => { console.error(`Listener error [staffHolidays/${branch}]:`, error); onError?.(error); });
}

export async function saveStaffHoliday(branch: BranchKey, holiday: StaffHoliday) {
  await setDoc(doc(db, 'branches', branch, 'staffHolidays', holiday.id), holiday);
}

export async function deleteStaffHoliday(branch: BranchKey, holidayId: string) {
  await deleteDoc(doc(db, 'branches', branch, 'staffHolidays', holidayId));
}

// ═══ STORE HOURS CONFIG ═══

export function subscribeToStoreHoursConfig(branch: BranchKey, callback: (config: StoreHoursConfig | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'branches', branch, 'config', 'storeHours'), (snap) => {
    callback(snap.exists() ? ({ ...snap.data(), id: snap.id } as StoreHoursConfig) : null);
  }, (error) => { console.error(`Listener error [storeHoursConfig/${branch}]:`, error); });
}

export async function saveStoreHoursConfig(branch: BranchKey, config: StoreHoursConfig) {
  await setDoc(doc(db, 'branches', branch, 'config', 'storeHours'), config);
}

// ═══ DAY OVERRIDES ═══

export function subscribeToDayOverrides(branch: BranchKey, callback: (overrides: DayOverride[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'branches', branch, 'dayOverrides'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as DayOverride));
  }, (error) => { console.error(`Listener error [dayOverrides/${branch}]:`, error); });
}

export async function saveDayOverride(branch: BranchKey, override: DayOverride) {
  await setDoc(doc(db, 'branches', branch, 'dayOverrides', override.id), override);
}

export async function deleteDayOverride(branch: BranchKey, dateStr: string) {
  await deleteDoc(doc(db, 'branches', branch, 'dayOverrides', dateStr));
}


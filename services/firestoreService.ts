import {
  collection, doc, setDoc, updateDoc, deleteDoc, writeBatch,
  onSnapshot, query, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Product, Message, Transfer, MasterProduct, CustomerRequest,
         OrderItem, JointOrder, PlanogramLayout, ShopFloor, BranchKey } from '../types';

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
  const key = branch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
  return onSnapshot(collection(db, 'shared', 'data', key), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as CustomerRequest[]);
  }, (error) => { console.error(`Listener error [requests/${branch}]:`, error); onError?.(error); });
}

export async function saveRequest(branch: BranchKey, request: CustomerRequest) {
  const key = branch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
  await setDoc(doc(db, 'shared', 'data', key, request.id), request);
}

export async function deleteRequestFromDb(branch: BranchKey, requestId: string) {
  const key = branch === 'bywood' ? 'bywoodRequests' : 'broomRequests';
  await deleteDoc(doc(db, 'shared', 'data', key, requestId));
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

export function subscribeToPlanograms(callback: (l: PlanogramLayout[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'planograms'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as PlanogramLayout[]);
  }, (error) => { console.error('Listener error [planograms]:', error); onError?.(error); });
}

export async function savePlanogram(layout: PlanogramLayout) {
  await setDoc(doc(db, 'planograms', layout.id), layout as any);
}

export async function deletePlanogramFromDb(layoutId: string) {
  await deleteDoc(doc(db, 'planograms', layoutId));
}

// ═══ FLOOR PLANS ═══

export function subscribeToFloorPlans(callback: (f: ShopFloor[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'floorPlans'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })) as ShopFloor[]);
  }, (error) => { console.error('Listener error [floorPlans]:', error); onError?.(error); });
}

export async function saveFloorPlan(floor: ShopFloor) {
  await setDoc(doc(db, 'floorPlans', floor.id), floor as any);
}
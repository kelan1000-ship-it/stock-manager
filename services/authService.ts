import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User,
  Unsubscribe,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, deleteDoc, onSnapshot,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser, FirestoreUserDoc, BranchId, UserRole } from '../types/auth';

// Listen for login/logout changes
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// Log in
export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, 'users', credential.user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    await updateDoc(userRef, { lastLogin: new Date().toISOString() });
  }
  return credential.user;
}

// Log out
export async function logout(): Promise<void> {
  await signOut(auth);
}

// Get a user's profile from Firestore
export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as AppUser;
}

// Watch a user's profile for real-time changes (e.g., branch reassignment)
export function subscribeToUserProfile(
  uid: string,
  callback: (user: AppUser | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) { callback(null); return; }
      callback({ uid, ...snap.data() } as AppUser);
    },
    onError
  );
}

// Admin: create a new user
export async function createBranchUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  assignedBranches: BranchId[],
  adminEmail: string,
  adminPassword: string
): Promise<string> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const newUid = credential.user.uid;
  await updateProfile(credential.user, { displayName });
  const now = new Date().toISOString();
  await setDoc(doc(db, 'users', newUid), {
    email, displayName, role, assignedBranches, createdAt: now, lastLogin: now,
  });
  // Re-login as admin (creating a user logs you in as them)
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  return newUid;
}

// Admin: get all users (real-time)
export function subscribeToAllUsers(callback: (users: AppUser[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), (snap) => {
    callback(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as AppUser[]);
  });
}

// Admin: update a user's branches
export async function updateUserBranches(uid: string, assignedBranches: BranchId[]): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { assignedBranches });
}

// Admin: update a user's role
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role });
}

// Admin: remove a user's profile (locks them out)
export async function removeUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}
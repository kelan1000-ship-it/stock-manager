export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer' | 'branch';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedBranches: BranchId[];
  createdAt: string;
  lastLogin: string;
}

export type BranchId = 'bywood' | 'broom';

export const BRANCH_DISPLAY_NAMES: Record<BranchId, string> = {
  bywood: 'Bywood Ave',
  broom: 'Broom Road',
};

export const BRANCH_DETAILS: Record<BranchId, { name: string; address: string; phone: string }> = {
  bywood: { name: 'Greenchem Pharmacy - Bywood Ave', address: '20 Bywood Avenue, Shirley, Croydon, CR0 7RA', phone: '020 8654 8576' },
  broom:  { name: 'Greenchem Pharmacy - Broom Road', address: '15 Broom Road, Shirley, Croydon, CR0 8NG', phone: '020 8777 7220' },
};

export interface FirestoreUserDoc {
  email: string;
  displayName: string;
  role: UserRole;
  assignedBranches: BranchId[];
  createdAt: string;
  lastLogin: string;
}
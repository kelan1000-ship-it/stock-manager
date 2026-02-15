export type UserRole = 'admin' | 'branch';

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

export interface FirestoreUserDoc {
  email: string;
  displayName: string;
  role: UserRole;
  assignedBranches: BranchId[];
  createdAt: string;
  lastLogin: string;
}
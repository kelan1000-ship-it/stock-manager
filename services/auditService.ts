import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export async function logPermissionChange(
  adminEmail: string,
  targetUserEmail: string,
  oldRole: string,
  newRole: string,
  details?: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      timestamp: new Date().toISOString(),
      action: 'PERMISSION_CHANGE',
      adminEmail,
      targetUserEmail,
      oldRole,
      newRole,
      details,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

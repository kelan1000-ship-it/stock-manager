import { collection, collectionGroup, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadProductImage } from '../services/storageService';

/**
 * Migration Script: Google Drive -> Firebase Storage
 * 
 * Fetches all products and master inventory items with legacy Drive links,
 * uploads them to Firebase Storage, and updates Firestore.
 */
export async function runMigration() {
  console.log('🚀 Starting Google Drive -> Firebase Storage Migration...');
  
  try {
    // 1. Fetch potential documents from both masterInventory and products collections
    const masterSnap = await getDocs(collection(db, 'shared', 'data', 'masterInventory'));
    const productsSnap = await getDocs(collectionGroup(db, 'products'));

    const allDocs = [
      ...masterSnap.docs.map(d => ({ ref: d.ref, data: d.data(), id: d.id })),
      ...productsSnap.docs.map(d => ({ ref: d.ref, data: d.data(), id: d.id }))
    ];

    // 2. Filter for legacy drive links
    const toMigrate = allDocs.filter(d => {
      const img = d.data.productImage || d.data.image || d.data.imageUrl;
      return typeof img === 'string' && img.includes('drive.google.com');
    });

    console.log(`📊 Found ${toMigrate.length} items to migrate.`);

    if (toMigrate.length === 0) {
      console.log('✅ No items require migration.');
      return;
    }

    // 3. Process in batches of 20
    const BATCH_SIZE = 20;
    let completed = 0;
    let errors = 0;

    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
      const batch = toMigrate.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(toMigrate.length / BATCH_SIZE)}...`);

      const results = await Promise.allSettled(batch.map(async (item) => {
        const oldUrl = item.data.productImage || item.data.image || item.data.imageUrl;
        
        try {
          // Download image
          const response = await fetch(oldUrl);
          if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
          const blob = await response.blob();

          // Upload to Firebase
          const newUrl = await uploadProductImage(blob, item.id);

          // Update Firestore
          const updates: any = {
            legacyDriveUrl: oldUrl
          };

          // Update whichever field was originally used
          if (item.data.productImage !== undefined) updates.productImage = newUrl;
          if (item.data.image !== undefined) updates.image = newUrl;
          if (item.data.imageUrl !== undefined) updates.imageUrl = newUrl;

          await updateDoc(item.ref, updates);
          return item.id;
        } catch (err) {
          console.error(`❌ Failed to migrate ${item.id}:`, err);
          throw err;
        }
      }));

      results.forEach(res => {
        if (res.status === 'fulfilled') completed++;
        else errors++;
      });

      console.log(`✨ Batch complete. Progress: ${completed} / ${toMigrate.length} (Errors: ${errors})`);
    }

    console.log('🏁 Migration finished!');
    console.log(`✅ Success: ${completed}`);
    console.log(`❌ Failed: ${errors}`);

  } catch (globalError) {
    console.error('🔥 Critical migration failure:', globalError);
  }
}

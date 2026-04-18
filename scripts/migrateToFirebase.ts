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
    const toMigrateRaw = allDocs.map(d => {
      const { productImage, image, imageUrl } = d.data;
      const targetUrl = [productImage, image, imageUrl].find(url => typeof url === 'string' && url.includes('googleusercontent.com'));
      return { ...d, oldUrl: targetUrl };
    });

    const toMigrate = toMigrateRaw.filter(d => !!d.oldUrl);

    console.log(`📊 Found ${toMigrate.length} items to migrate.`);

    if (toMigrate.length === 0) {
      console.log('✅ No items require migration.');
      return;
    }

    // 3. Process in batches of 10
    const BATCH_SIZE = 10;
    let completed = 0;
    let errors = 0;

    // Deduplication tracking
    const migrationPromises = new Map<string, Promise<string>>();
    let uploadedCount = 0;
    let deduplicatedCount = 0;

    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
      const batch = toMigrate.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(toMigrate.length / BATCH_SIZE)}...`);

      // Pre-calculate randomized cumulative delays (1 to 3 seconds) for realistic staggering
      let currentDelay = 0;
      const staggerDelays = batch.map(() => {
        const delay = currentDelay;
        currentDelay += Math.floor(Math.random() * 2000) + 1000;
        return delay;
      });

      const results = await Promise.allSettled(batch.map(async (item, index) => {
        const oldUrl = item.oldUrl as string;
        
        try {
          let newUrl: string;

          if (migrationPromises.has(oldUrl)) {
            console.log(`⏩ Skipping ${item.id} - already migrated`);
            // Wait for existing upload of this exact image to finish
            newUrl = await migrationPromises.get(oldUrl)!;
            deduplicatedCount++;
          } else {
            // First time seeing this image URL, start the upload process
            const uploadTask = (async () => {
              // Wait for our randomized stagger delay before fetching
              if (staggerDelays[index] > 0) {
                await new Promise(resolve => setTimeout(resolve, staggerDelays[index]));
              }

              let blob: Blob;

              const attemptFetch = async () => {
                const response = await fetch(oldUrl, { 
                  mode: 'cors', 
                  credentials: 'omit' 
                });
                if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
                return await response.blob();
              };

              try {
                blob = await attemptFetch();
              } catch (err: any) {
                const retryDelay = 5000;
                console.warn(`⚠️ First attempt failed for ${item.id} (${err.message}). Retrying in 5s...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                try {
                  blob = await attemptFetch();
                } catch (retryErr: any) {
                  throw new Error(`Final fetch failed: ${retryErr.message}`);
                }
              }

              // Upload to Firebase
              return await uploadProductImage(blob, item.id);
            })();

            migrationPromises.set(oldUrl, uploadTask);
            newUrl = await uploadTask;
            uploadedCount++;
          }

          // Update Firestore
          const updates: any = {
            legacyDriveUrl: oldUrl
          };

          // Update whichever field was originally used
          if (item.data.productImage === oldUrl) updates.productImage = newUrl;
          if (item.data.image === oldUrl) updates.image = newUrl;
          if (item.data.imageUrl === oldUrl) updates.imageUrl = newUrl;

          await updateDoc(item.ref, updates);
          return item.id;
        } catch (err: any) {
          console.error(`❌ Failed to migrate ${item.id}:`, err.message || err, `| Original URL: ${oldUrl}`);
          throw err;
        }
      }));

      results.forEach(res => {
        if (res.status === 'fulfilled') completed++;
        else errors++;
      });

      console.log(`✨ Batch complete. Progress: ${completed} / ${toMigrate.length} (Errors: ${errors})`);

      // Add a 10-second cooldown delay after every batch (except the last one)
      if (i + BATCH_SIZE < toMigrate.length) {
        console.log('⏳ Cooling down for 10 seconds to avoid Google rate limits...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    console.log('🏁 Migration finished!');
    console.log(`✅ Success: ${completed}`);
    console.log(`❌ Failed: ${errors}`);
    console.log(`☁️ Unique Images Uploaded: ${uploadedCount}`);
    console.log(`♻️ Duplicate Links Updated (Deduplicated): ${deduplicatedCount}`);

  } catch (globalError) {
    console.error('🔥 Critical migration failure:', globalError);
  }
}

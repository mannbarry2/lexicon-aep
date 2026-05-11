// Script to migrate all existing images to Firebase Storage
// Usage: node migrate-images-to-firebase.js

import { db, pool } from './server/db.js';
import { termImages } from './shared/schema.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { eq, isNull } from 'drizzle-orm';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'public', 'uploads');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseStorage = getStorage(firebaseApp);

async function migrateImagesToFirebase() {
  try {
    console.log('Starting image migration to Firebase Storage...');
    
    // Get all images that don't have a Firebase URL
    const imagesToMigrate = await db
      .select()
      .from(termImages)
      .where(isNull(termImages.firebaseUrl));
    
    console.log(`Found ${imagesToMigrate.length} images to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each image
    for (const image of imagesToMigrate) {
      try {
        console.log(`Migrating image ID ${image.id}: ${image.filename}`);
        
        // Check if local file exists
        const localFilePath = path.join(uploadsDir, image.filename);
        if (!fs.existsSync(localFilePath)) {
          console.error(`Local file not found: ${localFilePath}`);
          errorCount++;
          continue;
        }
        
        // Read the file
        const fileBuffer = fs.readFileSync(localFilePath);
        
        // Upload to Firebase Storage
        const storageRef = ref(firebaseStorage, `term-images/${image.filename}`);
        const metadata = {
          contentType: image.mimeType,
          customMetadata: {
            originalName: image.originalName,
            termId: String(image.termId),
            imageId: String(image.id)
          }
        };
        
        // Upload to Firebase
        const uploadResult = await uploadBytes(storageRef, fileBuffer, metadata);
        const firebaseUrl = await getDownloadURL(uploadResult.ref);
        
        // Update database record with Firebase URL
        await db.update(termImages)
          .set({ firebaseUrl })
          .where(eq(termImages.id, image.id));
        
        console.log(`Successfully migrated image ID ${image.id} to Firebase: ${firebaseUrl}`);
        successCount++;
      } catch (error) {
        console.error(`Error migrating image ID ${image.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Migration complete. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateImagesToFirebase();
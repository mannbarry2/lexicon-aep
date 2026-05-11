// Script to migrate all existing images to Firebase Storage
// Usage: npx tsx migrate-images-to-firebase.ts

import { db, pool } from './server/db';
import { termImages } from './shared/schema';
import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { eq, isNull } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the current directory for ES modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, 'public', 'uploads');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: 'adobe-aep-termbase.firebasestorage.app',
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase config:', {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: 'adobe-aep-termbase.firebasestorage.app',
  apiKeyPresent: !!process.env.VITE_FIREBASE_API_KEY,
  appIdPresent: !!process.env.VITE_FIREBASE_APP_ID
});

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseStorage = getStorage(firebaseApp);

async function migrateImagesToFirebase(options = { updateMissingFiles: false }) {
  try {
    console.log('Starting image migration to Firebase Storage...');
    
    // Get all images that don't have a Firebase URL
    const imagesToMigrate = await db
      .select()
      .from(termImages)
      .where(isNull(termImages.firebase_url));
    
    console.log(`Found ${imagesToMigrate.length} images to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    let missingFileCount = 0;
    let firebaseErrorCount = 0;
    let errorDetails: Record<string, string[]> = {};
    
    // Process each image
    for (const image of imagesToMigrate) {
      try {
        console.log(`Migrating image ID ${image.id}: ${image.filename}`);
        
        // Check if local file exists
        const localFilePath = path.join(uploadsDir, image.filename);
        if (!fs.existsSync(localFilePath)) {
          console.error(`Local file not found: ${localFilePath}`);
          missingFileCount++;
          
          // Add to error details
          if (!errorDetails['missing_files']) {
            errorDetails['missing_files'] = [];
          }
          errorDetails['missing_files'].push(`ID ${image.id}: ${image.filename}`);
          
          // Optionally mark records with missing files
          if (options.updateMissingFiles) {
            try {
              await db.update(termImages)
                .set({ 
                  firebase_url: 'MISSING_FILE'
                })
                .where(eq(termImages.id, image.id));
              console.log(`Marked image ID ${image.id} as missing in the database`);
            } catch (updateError) {
              console.error(`Error marking missing file in database for ID ${image.id}:`, updateError);
            }
          }
          
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
        
        try {
          // Upload to Firebase
          const uploadResult = await uploadBytes(storageRef, fileBuffer, metadata);
          const firebaseUrl = await getDownloadURL(uploadResult.ref);
          
          // Update database record with Firebase URL
          await db.update(termImages)
            .set({ firebase_url: firebaseUrl })
            .where(eq(termImages.id, image.id));
          
          console.log(`Successfully migrated image ID ${image.id} to Firebase: ${firebaseUrl}`);
          successCount++;
        } catch (firebaseError: any) {
          console.error(`Firebase error for image ID ${image.id}:`, firebaseError);
          firebaseErrorCount++;
          
          // Add to error details
          if (!errorDetails['firebase_errors']) {
            errorDetails['firebase_errors'] = [];
          }
          errorDetails['firebase_errors'].push(`ID ${image.id}: ${firebaseError.code || 'Unknown error'}`);
          
          errorCount++;
        }
      } catch (error: any) {
        console.error(`Error migrating image ID ${image.id}:`, error);
        errorCount++;
        
        // Add to error details
        if (!errorDetails['other_errors']) {
          errorDetails['other_errors'] = [];
        }
        errorDetails['other_errors'].push(`ID ${image.id}: ${error.message || 'Unknown error'}`);
      }
    }
    
    console.log('\n----- Migration Summary -----');
    console.log(`Total images processed: ${imagesToMigrate.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Missing local files: ${missingFileCount}`);
    console.log(`Firebase Storage errors: ${firebaseErrorCount}`);
    console.log(`Other errors: ${Math.max(0, errorCount - firebaseErrorCount)}`);  // Don't count missing files in error count
    
    // Print detailed error information
    if (Object.keys(errorDetails).length > 0) {
      console.log('\n----- Error Details -----');
      
      if (errorDetails['missing_files']) {
        console.log('\nMissing Files:');
        errorDetails['missing_files'].forEach(file => console.log(` - ${file}`));
      }
      
      if (errorDetails['firebase_errors']) {
        console.log('\nFirebase Errors:');
        errorDetails['firebase_errors'].forEach(error => console.log(` - ${error}`));
      }
      
      if (errorDetails['other_errors']) {
        console.log('\nOther Errors:');
        errorDetails['other_errors'].forEach(error => console.log(` - ${error}`));
      }
    }
    
    console.log('\nMigration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateImagesToFirebase();
import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ws from 'ws';

// Configure Neon to use ws
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config();

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, 'public', 'uploads');

// Database connection
console.log('Using Neon PostgreSQL database connection.');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment variables');
}

const pool = new Pool({ connectionString });

async function markMissingImages() {
  try {
    console.log('Finding images without Firebase URLs...');
    
    // Get all images that don't have a Firebase URL
    const { rows: imagesToCheck } = await pool.query(`
      SELECT id, filename, firebase_url
      FROM term_images
      WHERE firebase_url IS NULL
    `);
    
    console.log(`Found ${imagesToCheck.length} images without Firebase URLs`);
    
    let markedCount = 0;
    let checkedCount = 0;
    
    // Process each image
    for (const image of imagesToCheck) {
      try {
        console.log(`Checking image ID ${image.id}: ${image.filename}`);
        checkedCount++;
        
        // Check if local file exists
        const localFilePath = path.join(uploadsDir, image.filename);
        if (!fs.existsSync(localFilePath)) {
          console.error(`Local file not found: ${localFilePath}`);
          
          // Mark record as missing
          await pool.query(`
            UPDATE term_images
            SET firebase_url = 'MISSING_FILE'
            WHERE id = $1
          `, [image.id]);
          
          console.log(`Marked image ID ${image.id} as missing in the database`);
          markedCount++;
        } else {
          console.log(`Local file exists for image ID ${image.id}, but no Firebase URL. This should be migrated.`);
        }
      } catch (error) {
        console.error(`Error processing image ID ${image.id}:`, error);
      }
    }
    
    console.log('\n----- Summary -----');
    console.log(`Total images checked: ${checkedCount}`);
    console.log(`Images marked as missing: ${markedCount}`);
    console.log(`Migration complete!`);
  } catch (error) {
    console.error('Error checking images:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
markMissingImages();
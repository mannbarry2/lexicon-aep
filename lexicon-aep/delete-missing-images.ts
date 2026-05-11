import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import ws from 'ws';

// Configure Neon to use ws
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config();

// Database connection
console.log('Using Neon PostgreSQL database connection.');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment variables');
}

const pool = new Pool({ connectionString });

async function deleteMissingImages() {
  try {
    console.log('Finding images marked as MISSING_FILE...');
    
    // Get all images marked as missing
    const { rows: missingImages } = await pool.query(`
      SELECT id, filename, firebase_url
      FROM term_images
      WHERE firebase_url = 'MISSING_FILE'
    `);
    
    console.log(`Found ${missingImages.length} images marked as missing`);
    
    if (missingImages.length === 0) {
      console.log('No missing images to delete.');
      return;
    }
    
    console.log('Images to be deleted:');
    missingImages.forEach(image => {
      console.log(`- ID: ${image.id}, Filename: ${image.filename}`);
    });
    
    console.log('\nDeleting missing image records...');
    
    // Create a list of IDs to delete
    const idsToDelete = missingImages.map(image => image.id);
    
    // Delete the records
    const { rowCount } = await pool.query(`
      DELETE FROM term_images
      WHERE id = ANY($1)
    `, [idsToDelete]);
    
    console.log(`Successfully deleted ${rowCount} image records.`);
    
  } catch (error) {
    console.error('Error deleting images:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
deleteMissingImages();
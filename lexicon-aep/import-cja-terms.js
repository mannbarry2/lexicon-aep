import * as fs from 'fs';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { categories, terms, termCategories } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function importCJATerms() {
  try {
    console.log('Starting import of CJA glossary terms...');
    
    // Check if the file exists
    if (!fs.existsSync('cja-glossary-terms.json')) {
      console.error('cja-glossary-terms.json not found. Please run scrape-cja-glossary.js first.');
      return;
    }
    
    // Read the terms from the JSON file
    const termsData = JSON.parse(fs.readFileSync('cja-glossary-terms.json', 'utf-8'));
    console.log(`Loaded ${termsData.length} terms from file.`);
    
    // Connect to the database
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema: { categories, terms, termCategories } });
    console.log('Connected to database.');
    
    // Ensure the CJA category exists
    let cjaCategory = (await db.select().from(categories).where(eq(categories.name, 'CJA')))[0];
    
    if (!cjaCategory) {
      console.log('CJA category not found, creating it...');
      const inserted = await db.insert(categories).values({ name: 'CJA' }).returning();
      cjaCategory = inserted[0];
      console.log('Created CJA category:', cjaCategory);
    } else {
      console.log('Found existing CJA category:', cjaCategory);
    }
    
    // Import the terms
    let imported = 0;
    let skipped = 0;
    
    for (const termData of termsData) {
      // Check if the term already exists
      const existingTerm = (await db.select().from(terms).where(eq(terms.name, termData.name)))[0];
      
      if (existingTerm) {
        console.log(`Term "${termData.name}" already exists, skipping.`);
        skipped++;
        continue;
      }
      
      // Insert the new term
      console.log(`Importing term: ${termData.name}`);
      const inserted = await db.insert(terms).values({
        name: termData.name,
        definition: termData.definition,
        isLegacy: false, // These are current terms
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      const term = inserted[0];
      
      // Add the term-category relationship
      await db.insert(termCategories).values({
        termId: term.id,
        categoryId: cjaCategory.id
      });
      
      imported++;
    }
    
    console.log(`Import completed: ${imported} terms imported, ${skipped} skipped.`);
    
    // Close the database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error importing CJA terms:', error);
  }
}

// Run the import
importCJATerms();
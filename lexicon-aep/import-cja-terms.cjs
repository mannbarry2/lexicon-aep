const fs = require('fs');
const { Pool } = require('pg');
const ws = require('ws');

async function importCJATerms() {
  try {
    console.log('Starting import of CJA glossary terms...');
    
    // Check if the file exists
    if (!fs.existsSync('cja-glossary-terms.json')) {
      console.error('cja-glossary-terms.json not found. Please run scrape-cja-glossary.cjs first.');
      return;
    }
    
    // Read the terms from the JSON file
    const termsData = JSON.parse(fs.readFileSync('cja-glossary-terms.json', 'utf-8'));
    console.log(`Loaded ${termsData.length} terms from file.`);
    
    // Connect to the database
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database.');
    
    // Check if CJA category exists
    const cjaCategory = await pool.query('SELECT * FROM categories WHERE name = $1', ['CJA']);
    
    let categoryId;
    
    if (cjaCategory.rows.length === 0) {
      console.log('CJA category not found, creating it...');
      const result = await pool.query(
        'INSERT INTO categories (name) VALUES ($1) RETURNING *',
        ['CJA']
      );
      categoryId = result.rows[0].id;
      console.log('Created CJA category with ID:', categoryId);
    } else {
      categoryId = cjaCategory.rows[0].id;
      console.log('Found existing CJA category with ID:', categoryId);
    }
    
    // Import the terms
    let imported = 0;
    let skipped = 0;
    
    for (const termData of termsData) {
      // Check if the term already exists
      const existingTerm = await pool.query(
        'SELECT * FROM terms WHERE name = $1',
        [termData.name]
      );
      
      if (existingTerm.rows.length > 0) {
        console.log(`Term "${termData.name}" already exists, skipping.`);
        skipped++;
        continue;
      }
      
      // Insert the new term
      console.log(`Importing term: ${termData.name}`);
      const currentDate = new Date();
      
      const insertResult = await pool.query(
        'INSERT INTO terms (name, definition, is_legacy, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [termData.name, termData.definition, false, currentDate, currentDate]
      );
      
      const termId = insertResult.rows[0].id;
      
      // Add the term-category relationship
      await pool.query(
        'INSERT INTO term_categories (term_id, category_id) VALUES ($1, $2) RETURNING *',
        [termId, categoryId]
      );
      
      imported++;
    }
    
    console.log(`Import completed: ${imported} terms imported, ${skipped} skipped.`);
    
    // Close the database connection
    await pool.end();
    
  } catch (error) {
    console.error('Error importing CJA terms:', error);
    console.error(error.stack);
  }
}

// Run the import
importCJATerms();
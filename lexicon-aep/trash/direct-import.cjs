const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');

// Set up database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function getExistingCategories() {
  const result = await pool.query('SELECT id, name FROM categories');
  return result.rows.reduce((acc, row) => {
    acc[row.name] = row.id;
    return acc;
  }, {});
}

async function createCategory(name) {
  const result = await pool.query(
    'INSERT INTO categories(name) VALUES($1) RETURNING id',
    [name]
  );
  return result.rows[0].id;
}

async function getOrCreateCategory(name, existingCategories) {
  if (!name || name === '' || name === '[New Term Dropzone]') {
    // Default category
    return 53; // Assuming this is the ID of [New Term Dropzone]
  }
  
  if (existingCategories[name]) {
    return existingCategories[name];
  }
  
  const id = await createCategory(name);
  existingCategories[name] = id;
  return id;
}

async function addTermCategory(termId, categoryId) {
  await pool.query(
    'INSERT INTO term_categories(term_id, category_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
    [termId, categoryId]
  );
}

async function getExistingTerms() {
  const result = await pool.query('SELECT id, name FROM terms');
  return result.rows.reduce((acc, row) => {
    acc[row.name] = row.id;
    return acc;
  }, {});
}

async function importCsv(filePath) {
  // Read the CSV file
  const csvContent = fs.readFileSync(filePath, 'utf8');
  
  // Parse the CSV with relaxed validation
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Allow irregular column counts
    relax_quotes: true,       // Be more forgiving with quotes
    skip_records_with_error: true // Skip records with errors instead of failing
  });
  
  console.log(`Found ${records.length} terms in CSV file`);
  
  // Get existing categories and terms
  const existingCategories = await getExistingCategories();
  const existingTerms = await getExistingTerms();
  
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const record of records) {
    // Each term gets its own transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if term already exists
      if (existingTerms[record['Term Name']]) {
        console.log(`Skipping term "${record['Term Name']}" as it already exists`);
        totalSkipped++;
        await client.query('COMMIT');
        continue;
      }
      
      // Generate slug
      const slug = await generateSlug(record['Term Name']);
      
      // Process categories
      let categories = [];
      if (record['Categories']) {
        try {
          // Handle potential JSON-formatted categories
          if (record['Categories'].startsWith('[') && record['Categories'].endsWith(']')) {
            try {
              // Try parsing as JSON array
              categories = JSON.parse(record['Categories']);
            } catch {
              // If it's not valid JSON, just treat it as a string with brackets
              const categoryStr = record['Categories'].substring(1, record['Categories'].length - 1);
              if (categoryStr.includes(',')) {
                categories = categoryStr.split(',').map(c => c.trim());
              } else {
                categories = [categoryStr.trim()];
              }
            }
          }
          // Handle comma-separated string
          else if (record['Categories'].includes(',')) {
            categories = record['Categories'].split(',').map(c => c.trim());
          } 
          // Handle single category
          else {
            categories = [record['Categories'].trim()];
          }
          
          // Filter out any empty strings
          categories = categories.filter(c => c && c.trim() !== '');
        } catch (error) {
          console.error(`Error parsing categories for term "${record['Term Name']}":`, error);
          // Default to a safe category on error
          categories = ['[New Term Dropzone]'];
        }
      }
      
      // Default to New Term Dropzone if no categories
      if (!categories || categories.length === 0) {
        categories = ['[New Term Dropzone]'];
      }
      
      // Determine if legacy and current term ID
      const isLegacy = record['Is Legacy'] === 'Yes' || record['Is Legacy'] === 'true' || record['Is Legacy'] === '1';
      let currentTermId = null;
      if (record['Current Term ID'] && record['Current Term ID'] !== '') {
        currentTermId = parseInt(record['Current Term ID']);
        if (isNaN(currentTermId)) {
          currentTermId = null;
        }
      }
      
      // Get category IDs
      const categoryIds = [];
      for (const category of categories) {
        const categoryId = await getOrCreateCategory(category, existingCategories);
        categoryIds.push(categoryId);
      }
      
      // Make sure we have a valid definition
      let definition = record['Definition'];
      if (!definition || definition.trim() === '') {
        definition = 'No definition provided. This term needs a definition.';
      }
      
      // Insert the term
      const termResult = await client.query(
        'INSERT INTO terms(name, slug, definition, is_legacy, current_term_id, created_by) VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
        [
          record['Term Name'],
          slug,
          definition,
          isLegacy,
          currentTermId,
          1 // Admin user ID
        ]
      );
      
      const termId = termResult.rows[0].id;
      
      // Add term-category relationships
      for (const categoryId of categoryIds) {
        await client.query(
          'INSERT INTO term_categories(term_id, category_id) VALUES($1, $2)',
          [termId, categoryId]
        );
      }
      
      // Commit the transaction for this term
      await client.query('COMMIT');
      
      console.log(`Imported term "${record['Term Name']}"`);
      totalImported++;
      
      // Update our existing terms cache to avoid potential duplicate inserts
      existingTerms[record['Term Name']] = termId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error importing term "${record['Term Name']}":`, error);
      totalErrors++;
    } finally {
      client.release();
    }
  }
  
  console.log('--- Import Summary ---');
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`Total errors: ${totalErrors}`);
}

// Specify the path to your CSV file
const csvFile = path.join(__dirname, 'attached_assets', 'cja-ajo-terms-for-upload.csv');

// Run the import
importCsv(csvFile)
  .then(() => {
    console.log('Import completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Import failed:', error);
    process.exit(1);
  });
import { db } from './server/db';
import { categories, termCategories } from './shared/schema';
import { sql } from 'drizzle-orm';

async function restoreCategories() {
  console.log('Starting category restoration process...');
  
  // Define the missing categories
  const categoriesToRestore = [
    { id: 29, name: 'RT-CDP Collaboration' },
    { id: 31, name: 'ACS Data Collection' },
    { id: 32, name: 'AA (Adobe Analytics)' },
    { id: 33, name: 'CJA' },
    { id: 34, name: 'TLA (3 letter abbreviation)' },
    // ID 35 (UX) still exists in the database
    { id: 36, name: 'AJO' },
    { id: 37, name: 'AEP' },
    { id: 38, name: '[New Term Dropzone]' }
  ];
  
  // Insert categories that don't exist
  console.log('Restoring missing categories...');
  let restoredCount = 0;
  
  for (const category of categoriesToRestore) {
    try {
      // Check if category exists
      const existingCategories = await db.execute(
        sql`SELECT id FROM categories WHERE id = ${category.id} OR name = ${category.name}`
      );
      
      if (existingCategories.rows.length === 0) {
        // Insert category
        await db.execute(
          sql`INSERT INTO categories (id, name) VALUES (${category.id}, ${category.name})`
        );
        console.log(`Restored category: ${category.name} (ID: ${category.id})`);
        restoredCount++;
      } else {
        console.log(`Category already exists: ${category.name} (ID: ${existingCategories.rows[0].id})`);
      }
    } catch (error) {
      console.error(`Error restoring category ${category.name}:`, error);
    }
  }
  
  console.log(`Successfully restored ${restoredCount} categories.`);
  
  // Now we need to map some terms to categories from our sample file data
  // This will be incomplete but will help restore some connections
  console.log('\nRestoring term-category connections...');
  
  // Define some known terms with their categories
  const termCategoryMapping = [
    { term: 'API Connector', categories: [33, 35] },
    { term: 'Activation', categories: [33, 29, 34] },
    { term: 'Offer Decisioning', categories: [33, 35] },
    { term: 'Flow Service', categories: [33, 35] },
    { term: 'Legacy Launch', categories: [33, 31] },
    { term: 'Visitor ID Service', categories: [32, 34] },
    { term: 'DTM', categories: [33, 34] },
    { term: 'Data Workbench', categories: [32, 35] },
    { term: 'Edge Configuration', categories: [33, 29] },
    { term: 'Query Service Notebooks', categories: [33, 32] },
    { term: 'Access Level', categories: [33, 38] },
    { term: 'Adobe Analytics source connector (AASC)', categories: [32, 33] },
    { term: 'Adobe Spark', categories: [37, 38] },
    { term: 'Action Type', categories: [36, 38] },
    { term: 'Attribution', categories: [33] }
  ];
  
  let connectionCount = 0;
  
  for (const mapping of termCategoryMapping) {
    try {
      // Get term by name
      const terms = await db.execute(
        sql`SELECT id FROM terms WHERE name = ${mapping.term}`
      );
      
      if (terms.rows.length > 0) {
        const termId = terms.rows[0].id;
        
        for (const categoryId of mapping.categories) {
          // Check if this connection already exists
          const existingConnections = await db.execute(
            sql`SELECT * FROM term_categories WHERE term_id = ${termId} AND category_id = ${categoryId}`
          );
          
          if (existingConnections.rows.length === 0) {
            // Connect term to category
            await db.execute(
              sql`INSERT INTO term_categories (term_id, category_id) VALUES (${termId}, ${categoryId})`
            );
            console.log(`Connected term "${mapping.term}" (ID: ${termId}) to category ID: ${categoryId}`);
            connectionCount++;
          } else {
            console.log(`Connection already exists: "${mapping.term}" -> category ID: ${categoryId}`);
          }
        }
      } else {
        console.log(`Term not found: "${mapping.term}"`);
      }
    } catch (error) {
      console.error(`Error connecting term "${mapping.term}" to categories:`, error);
    }
  }
  
  console.log(`Successfully created ${connectionCount} term-category connections.`);
  console.log('\nCategory restoration process complete!');
}

// Run the restoration
restoreCategories().catch(console.error);
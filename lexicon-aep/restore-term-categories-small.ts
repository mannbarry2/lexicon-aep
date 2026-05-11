import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function restoreTermCategoryAssociations() {
  console.log('Starting term-category association restoration process...');
  
  // Define smaller set of mappings for key terms
  const termCategoryMapping = [
    // Key terms that are likely to exist and need categories
    { term: "Attribution", categories: ["CJA"] },
    { term: "Binding dimensions", categories: ["CJA"] },
    { term: "Merchandising eVars", categories: ["CJA", "AA (Adobe Analytics)"] },
    { term: "Data View", categories: ["CJA"] },
    { term: "Dimension", categories: ["CJA"] },
    { term: "Event", categories: ["CJA"] },
    { term: "Experience Data Model (XDM)", categories: ["CJA", "AEP"] },
    { term: "Filter", categories: ["CJA"] },
    { term: "Lookup Dataset", categories: ["CJA"] },
    { term: "Metric", categories: ["CJA"] },
    { term: "Person ID", categories: ["CJA"] },
    { term: "Profile Dataset", categories: ["CJA"] },
    { term: "Schema", categories: ["CJA", "AEP"] },
    { term: "Session", categories: ["CJA"] },
    { term: "Streaming Data", categories: ["CJA"] },
    { term: "Success Event", categories: ["CJA"] },
    { term: "Workspace Project", categories: ["CJA"] },
    { term: "Launch", categories: ["ACS Data Collection"] },
    { term: "XDM", categories: ["AEP"] },
    { term: "Rule Sandwich", categories: ["Fun"] }
  ];
  
  let connectionCount = 0;
  let errorCount = 0;
  
  // Get category IDs by name
  console.log('Fetching category IDs...');
  
  const categoryMap = new Map<string, number>();
  const categories = await db.execute(sql`SELECT id, name FROM categories`);
  
  for (const category of categories.rows) {
    categoryMap.set(category.name, category.id);
  }
  
  console.log(`Found ${categoryMap.size} categories in the database.`);
  console.log('Category ID mapping:');
  
  for (const [name, id] of categoryMap.entries()) {
    console.log(`- ${name}: ${id}`);
  }
  
  console.log('\nRestoring term-category connections...');
  
  // Process each term-category mapping
  for (const mapping of termCategoryMapping) {
    try {
      // Get term by name
      const terms = await db.execute(
        sql`SELECT id FROM terms WHERE name = ${mapping.term}`
      );
      
      if (terms.rows.length > 0) {
        const termId = terms.rows[0].id;
        
        for (const categoryName of mapping.categories) {
          const categoryId = categoryMap.get(categoryName);
          
          if (!categoryId) {
            console.log(`Category not found: "${categoryName}" for term "${mapping.term}"`);
            continue;
          }
          
          // Check if this connection already exists
          const existingConnections = await db.execute(
            sql`SELECT * FROM term_categories WHERE term_id = ${termId} AND category_id = ${categoryId}`
          );
          
          if (existingConnections.rows.length === 0) {
            // Connect term to category
            await db.execute(
              sql`INSERT INTO term_categories (term_id, category_id) VALUES (${termId}, ${categoryId})`
            );
            console.log(`Connected term "${mapping.term}" (ID: ${termId}) to category "${categoryName}" (ID: ${categoryId})`);
            connectionCount++;
          } else {
            console.log(`Connection already exists: "${mapping.term}" -> "${categoryName}"`);
          }
        }
      } else {
        console.log(`Term not found: "${mapping.term}"`);
      }
    } catch (error) {
      console.error(`Error connecting term "${mapping.term}" to categories:`, error);
      errorCount++;
    }
  }
  
  console.log(`\nRestoration complete!`);
  console.log(`Successfully created ${connectionCount} term-category connections.`);
  console.log(`Encountered ${errorCount} errors during the process.`);
}

// Run the restoration
restoreTermCategoryAssociations().catch(console.error);
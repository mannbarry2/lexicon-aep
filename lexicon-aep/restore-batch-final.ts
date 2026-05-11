import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function restoreTermCategoryAssociations() {
  console.log('Starting term-category association restoration (Final Batch)...');
  
  // Final batch of terms from the PDF
  const termCategoryMapping = [
    { term: "Tag Field", categories: ["UX"] },
    { term: "Table", categories: ["[New Term Dropzone]"] },
    { term: "Tenant ID", categories: ["[New Term Dropzone]"] },
    { term: "Term ID", categories: ["[New Term Dropzone]"] },
    { term: "Test Profiles", categories: ["[New Term Dropzone]"] },
    { term: "Time Constraints", categories: ["[New Term Dropzone]"] },
    { term: "Time Parting", categories: ["[New Term Dropzone]"] },
    { term: "Time Zone Configuration", categories: ["[New Term Dropzone]"] },
    { term: "Toast", categories: ["UX"] },
    { term: "Touchpoint", categories: ["[New Term Dropzone]"] },
    { term: "Transfer assets", categories: ["[New Term Dropzone]"] },
    { term: "Transient ID", categories: ["[New Term Dropzone]"] },
    { term: "TreeView", categories: ["UX"] },
    { term: "Unexpected Metric", categories: ["[New Term Dropzone]"] },
    { term: "Unified Profile", categories: ["[New Term Dropzone]"] },
    { term: "Unitary Event", categories: ["UX"] },
    { term: "Unpopulated Fields", categories: ["[New Term Dropzone]"] },
    { term: "Use case", categories: ["RT-CDP Collaboration"] },
    { term: "Venn Diagram", categories: ["[New Term Dropzone]"] },
    { term: "Visitor ID Service", categories: ["AA (Adobe Analytics)", "TLA (3 letter abbreviation)"] },
    { term: "Waffle", categories: ["UX"] },
    { term: "Webhook", categories: ["[New Term Dropzone]"] },
    { term: "Workspace", categories: ["[New Term Dropzone]"] },
    { term: "Workspace Project", categories: ["CJA"] },
    { term: "XDM", categories: ["AEP"] },
    { term: "XDM Experience Classes", categories: ["[New Term Dropzone]"] },
    { term: "ho chi minh city (HCMC)", categories: ["[New Term Dropzone]"] },
    { term: "saigon", categories: ["[New Term Dropzone]"] }
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
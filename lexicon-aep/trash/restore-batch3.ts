import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function restoreTermCategoryAssociations() {
  console.log('Starting term-category association restoration (Batch 3)...');
  
  // Batch 3 of terms from the PDF
  const termCategoryMapping = [
    { term: "PII", categories: ["[New Term Dropzone]"] },
    { term: "Pill", categories: ["UX"] },
    { term: "Policy violation", categories: ["[New Term Dropzone]"] },
    { term: "Polarity", categories: ["[New Term Dropzone]"] },
    { term: "Popover", categories: ["UX"] },
    { term: "Privacy Actions", categories: ["UX"] },
    { term: "Privacy and Security Shield", categories: ["[New Term Dropzone]"] },
    { term: "Product Profiles", categories: ["[New Term Dropzone]"] },
    { term: "Profile Collapse / Collapse Profile", categories: ["[New Term Dropzone]"] },
    { term: "Profile switch", categories: ["[New Term Dropzone]"] },
    { term: "Project", categories: ["RT-CDP Collaboration"] },
    { term: "Project Debugging", categories: ["[New Term Dropzone]"] },
    { term: "Proofs", categories: ["[New Term Dropzone]"] },
    { term: "Pseudonymous profiles", categories: ["[New Term Dropzone]"] },
    { term: "PTR Records", categories: ["[New Term Dropzone]"] },
    { term: "Public audience", categories: ["RT-CDP Collaboration"] },
    { term: "Publisher", categories: ["RT-CDP Collaboration"] },
    { term: "Quick Actions", categories: ["UX"] },
    { term: "Quick Segments", categories: ["[New Term Dropzone]"] },
    { term: "Query Service Notebooks", categories: ["CJA", "AA (Adobe Analytics)"] },
    { term: "Rail", categories: ["UX"] },
    { term: "Real-time Event", categories: ["[New Term Dropzone]"] },
    { term: "Re-ingest", categories: ["[New Term Dropzone]"] },
    { term: "Response Tracking", categories: ["[New Term Dropzone]"] },
    { term: "Retention Analysis", categories: ["[New Term Dropzone]"] },
    { term: "Rolling Calculations", categories: ["[New Term Dropzone]"] },
    { term: "Rule Sandwich", categories: ["Fun"] },
    { term: "Sandbox", categories: ["[New Term Dropzone]"] },
    { term: "Scatter Plot", categories: ["[New Term Dropzone]"] },
    { term: "Scheduled Projects", categories: ["[New Term Dropzone]"] },
    { term: "Segment", categories: ["[New Term Dropzone]"] },
    { term: "Segment Evaluation Timing", categories: ["[New Term Dropzone]"] },
    { term: "Segment Qualification", categories: ["[New Term Dropzone]"] },
    { term: "Sequential Segment", categories: ["UX"] },
    { term: "Shared Filters", categories: ["[New Term Dropzone]"] },
    { term: "Shared Metrics & Dimensions manager", categories: ["[New Term Dropzone]"] },
    { term: "SideNav", categories: ["UX"] },
    { term: "Simulate", categories: ["[New Term Dropzone]"] },
    { term: "Sketches", categories: ["RT-CDP Collaboration"] },
    { term: "Slider", categories: ["UX"] },
    { term: "Standard Lookups", categories: ["[New Term Dropzone]"] },
    { term: "Standard Namespaces", categories: ["UX"] },
    { term: "Stepper", categories: ["UX"] },
    { term: "Streaming Data", categories: ["CJA"] },
    { term: "Streaming Data Readiness", categories: ["UX"] },
    { term: "Summary Data", categories: ["[New Term Dropzone]"] },
    { term: "Suppression List", categories: ["[New Term Dropzone]"] },
    { term: "Table", categories: ["[New Term Dropzone]"] },
    { term: "Tabs", categories: ["UX"] },
    { term: "Tag", categories: ["[New Term Dropzone]"] }
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
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function restoreTermCategoryAssociations() {
  console.log('Starting term-category association restoration (Batch 2)...');
  
  // Batch 2 of terms from the PDF
  const termCategoryMapping = [
    { term: "Insights and Personalization", categories: ["[New Term Dropzone]"] },
    { term: "Ingestion Errors", categories: ["[New Term Dropzone]"] },
    { term: "Invite", categories: ["RT-CDP Collaboration"] },
    { term: "JO", categories: ["[New Term Dropzone]"] },
    { term: "Journey Canvas / Designer", categories: ["[New Term Dropzone]"] },
    { term: "Journey Conditions", categories: ["[New Term Dropzone]"] },
    { term: "Journey Orchestration", categories: ["[New Term Dropzone]"] },
    { term: "Journey Step", categories: ["[New Term Dropzone]"] },
    { term: "Konductor", categories: ["[New Term Dropzone]"] },
    { term: "LaunchDarkly", categories: ["[New Term Dropzone]"] },
    { term: "Left Rail", categories: ["UX"] },
    { term: "Legacy Launch", categories: ["CJA", "ACS Data Collection"] },
    { term: "Legacy Names", categories: ["[New Term Dropzone]"] },
    { term: "Line Chart", categories: ["[New Term Dropzone]"] },
    { term: "Litmus", categories: ["[New Term Dropzone]"] },
    { term: "Lookback Window", categories: ["[New Term Dropzone]"] },
    { term: "Match keys", categories: ["RT-CDP Collaboration"] },
    { term: "Merchandising eVars", categories: ["CJA", "AA (Adobe Analytics)"] },
    { term: "Merge Policy", categories: ["[New Term Dropzone]"] },
    { term: "midValues", categories: ["[New Term Dropzone]"] },
    { term: "Missing Data", categories: ["[New Term Dropzone]"] },
    { term: "Mixins", categories: ["[New Term Dropzone]"] },
    { term: "Modal", categories: ["UX"] },
    { term: "No value", categories: ["[New Term Dropzone]"] },
    { term: "Non Stitch Merge Policy", categories: ["UX"] },
    { term: "Non-Event-Connected Profiles", categories: ["[New Term Dropzone]"] },
    { term: "Offer Decisioning", categories: ["CJA", "UX"] },
    { term: "Offer Eligibility", categories: ["[New Term Dropzone]"] },
    { term: "Offer Ranking", categories: ["[New Term Dropzone]"] },
    { term: "Overlap", categories: ["RT-CDP Collaboration"] },
    { term: "Overlap Analysis", categories: ["[New Term Dropzone]"] },
    { term: "Panel", categories: ["[New Term Dropzone]"] },
    { term: "Parquet", categories: ["[New Term Dropzone]"] },
    { term: "Participation", categories: ["[New Term Dropzone]"] },
    { term: "Participation Metric", categories: ["[New Term Dropzone]"] },
    { term: "Pathing", categories: ["[New Term Dropzone]"] },
    { term: "Permissions", categories: ["[New Term Dropzone]"] },
    { term: "Persistance", categories: ["[New Term Dropzone]"] },
    { term: "Personalisation Attributes", categories: ["[New Term Dropzone]"] },
    { term: "Personalization object", categories: ["[New Term Dropzone]"] }
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
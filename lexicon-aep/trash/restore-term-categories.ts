import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function restoreTermCategoryAssociations() {
  console.log('Starting term-category association restoration process...');
  
  // Define mappings from the PDF export
  // Format: { term: "Term Name", categories: ["Category1", "Category2"] }
  const termCategoryMapping = [
    { term: "Access Level", categories: ["CJA", "[New Term Dropzone]"] },
    { term: "Accordion", categories: ["UX"] },
    { term: "ACS Data Collection", categories: ["ACS Data Collection"] },
    { term: "Action Type", categories: ["AJO", "[New Term Dropzone]"] },
    { term: "ActionBar", categories: ["UX"] },
    { term: "ActionButton", categories: ["UX"] },
    { term: "Activation", categories: ["CJA", "RT-CDP Collaboration"] },
    { term: "Admin Console", categories: ["CJA", "[New Term Dropzone]"] },
    { term: "Admin Controls Dashboard", categories: ["AJO"] },
    { term: "Adobe Analytics source connector (AASC)", categories: ["AA (Adobe Analytics)", "CJA"] },
    { term: "Adobe Spark", categories: ["AEP", "[New Term Dropzone]"] },
    { term: "Advertiser", categories: ["RT-CDP Collaboration"] },
    { term: "Algorithmic Pruning", categories: ["CJA"] },
    { term: "Analytics Inventory", categories: ["[New Term Dropzone]"] },
    { term: "API Connector", categories: ["CJA", "UX"] },
    { term: "Approved Components", categories: ["CJA", "[New Term Dropzone]"] },
    { term: "Attribution", categories: ["CJA"] },
    { term: "Attribution Analysis", categories: ["CJA", "[New Term Dropzone]"] },
    { term: "Attribution Model", categories: ["CJA", "[New Term Dropzone]"] },
    { term: "Average number of daily events", categories: ["CJA"] },
    { term: "Backfill", categories: ["[New Term Dropzone]"] },
    { term: "Bar Chart", categories: ["[New Term Dropzone]"] },
    { term: "Binding Dimension", categories: ["CJA"] },
    { term: "Binding dimensions", categories: ["CJA"] },
    { term: "Breadcrumbs", categories: ["UX"] },
    { term: "Breakdown", categories: ["[New Term Dropzone]"] },
    { term: "C12 Field", categories: ["[New Term Dropzone]"] },
    { term: "C8 Field", categories: ["[New Term Dropzone]"] },
    { term: "Calculated Metric", categories: ["[New Term Dropzone]"] },
    { term: "Callout", categories: ["UX"] },
    { term: "Channel Surfaces", categories: ["[New Term Dropzone]"] },
    { term: "Checkbox", categories: ["UX"] },
    { term: "Chiclet", categories: ["UX"] },
    { term: "Cloud storage", categories: ["RT-CDP Collaboration"] },
    { term: "Columnar", categories: ["[New Term Dropzone]"] },
    { term: "Combined event datasets", categories: ["[New Term Dropzone]"] },
    { term: "Component Governance", categories: ["[New Term Dropzone]"] },
    { term: "Component Lookup", categories: ["[New Term Dropzone]"] },
    { term: "Component Selection", categories: ["[New Term Dropzone]"] },
    { term: "Component Usage Analytics", categories: ["[New Term Dropzone]"] },
    { term: "Connection", categories: ["CJA"] },
    { term: "Connection Errors", categories: ["[New Term Dropzone]"] },
    { term: "Connection map", categories: ["[New Term Dropzone]"] },
    { term: "Connection request", categories: ["RT-CDP Collaboration"] },
    { term: "Connection settings", categories: ["RT-CDP Collaboration"] },
    { term: "Container", categories: ["[New Term Dropzone]"] },
    { term: "Content Fragments", categories: ["[New Term Dropzone]"] },
    { term: "Content Simulations", categories: ["[New Term Dropzone]"] },
    { term: "Conversion Event", categories: ["[New Term Dropzone]"] },
    { term: "Conversion Variable", categories: ["CJA"] },
    { term: "Core Services", categories: ["[New Term Dropzone]"] },
    { term: "Cross-channel analysis", categories: ["[New Term Dropzone]"] },
    { term: "Cross-Channel Analysis", categories: ["CJA"] },
    { term: "Curation", categories: ["[New Term Dropzone]"] },
    { term: "Customer Journey Analytics", categories: ["[New Term Dropzone]"] },
    { term: "Data center region eg. VA7", categories: ["[New Term Dropzone]"] },
    { term: "Data clean room", categories: ["RT-CDP Collaboration"] },
    { term: "Data Collection Center", categories: ["[New Term Dropzone]"] },
    { term: "Data collaboration", categories: ["RT-CDP Collaboration"] },
    { term: "Data connection", categories: ["RT-CDP Collaboration"] },
    { term: "Data retention (CJA)", categories: ["[New Term Dropzone]"] },
    { term: "Data sharing agreement", categories: ["RT-CDP Collaboration"] },
    { term: "Data sources", categories: ["[New Term Dropzone]"] },
    { term: "Data Usage Governance", categories: ["[New Term Dropzone]"] },
    { term: "Data Usage Policy", categories: ["[New Term Dropzone]"] },
    { term: "Data View", categories: ["CJA"] },
    { term: "Data Workbench", categories: ["AA (Adobe Analytics)", "UX"] },
    { term: "Datastreams", categories: ["[New Term Dropzone]"] },
    { term: "Date Range", categories: ["[New Term Dropzone]"] },
    { term: "Decision Management", categories: ["[New Term Dropzone]"] },
    { term: "Delta Migration", categories: ["[New Term Dropzone]"] },
    { term: "denormalized", categories: ["[New Term Dropzone]"] },
    { term: "Derived Field", categories: ["[New Term Dropzone]"] },
    { term: "Derived Fields", categories: ["[New Term Dropzone]"] },
    { term: "Device Co-op", categories: ["[New Term Dropzone]"] },
    { term: "Device identifier", categories: ["RT-CDP Collaboration"] },
    { term: "Dialog", categories: ["UX"] },
    { term: "Dimension", categories: ["CJA"] },
    { term: "Direct Mail (aka snailmail)", categories: ["[New Term Dropzone]"] },
    { term: "Dropzone", categories: ["UX"] },
    { term: "DTM", categories: ["CJA", "TLA (3 letter abbreviation)"] },
    { term: "DULE", categories: ["[New Term Dropzone]"] },
    { term: "Durable Profile Attributes", categories: ["[New Term Dropzone]"] },
    { term: "DWB", categories: ["[New Term Dropzone]"] },
    { term: "Edge Caching", categories: ["[New Term Dropzone]"] },
    { term: "Edge Configuration", categories: ["CJA", "RT-CDP Collaboration"] },
    { term: "Edge Segmentation", categories: ["[New Term Dropzone]"] },
    { term: "Edge Segmentation Readiness", categories: ["UX"] },
    { term: "Eligibility Rule", categories: ["[New Term Dropzone]"] },
    { term: "Ellipsis", categories: ["UX"] },
    { term: "Email surface", categories: ["[New Term Dropzone]"] },
    { term: "Enforce Analytics Policy", categories: ["[New Term Dropzone]"] },
    { term: "ePHI", categories: ["[New Term Dropzone]"] },
    { term: "Event", categories: ["CJA"] },
    { term: "Event Dataset", categories: ["[New Term Dropzone]"] },
    { term: "Event Forwarding", categories: ["[New Term Dropzone]"] },
    { term: "Event-based Trigger", categories: ["[New Term Dropzone]"] },
    { term: "Experience Data Model (XDM)", categories: ["CJA"] },
    { term: "External ID", categories: ["[New Term Dropzone]"] },
    { term: "Fallout Analysis", categories: ["[New Term Dropzone]"] },
    { term: "Field Groups ", categories: ["[New Term Dropzone]"] },
    { term: "Field-Level Access", categories: ["[New Term Dropzone]"] },
    { term: "Filter", categories: ["CJA"] },
    { term: "Filter Container", categories: ["[New Term Dropzone]"] },
    { term: "Filtered Metric / Segmented Metrics", categories: ["[New Term Dropzone]"] },
    { term: "Flattened Join", categories: ["UX"] },
    { term: "Flow Analysis", categories: ["[New Term Dropzone]"] },
    { term: "Flow Service", categories: ["CJA", "UX"] },
    { term: "Flyout", categories: ["UX"] },
    { term: "Foundation & Select", categories: ["[New Term Dropzone]"] },
    { term: "Freeform Table", categories: ["[New Term Dropzone]"] },
    { term: "Frequency Rule", categories: ["[New Term Dropzone]"] },
    { term: "FuzzyWuzzy library ", categories: ["[New Term Dropzone]"] },
    { term: "GDPR", categories: ["[New Term Dropzone]"] },
    { term: "Golden Profiles", categories: ["[New Term Dropzone]"] },
    { term: "Guardrails", categories: ["[New Term Dropzone]"] },
    { term: "Guided Analysis", categories: ["[New Term Dropzone]"] },
    { term: "Haptics", categories: ["UX"] },
    { term: "Healthcare Shield", categories: ["[New Term Dropzone]"] },
    { term: "High-Frequency Triggering", categories: ["[New Term Dropzone]"] },
    { term: "Identity Keys", categories: ["UX"] },
    { term: "Identity Map", categories: ["[New Term Dropzone]"] },
    { term: "Inactive Users", categories: ["[New Term Dropzone]"] },
    { term: "Ingestion Errors", categories: ["[New Term Dropzone]"] }
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
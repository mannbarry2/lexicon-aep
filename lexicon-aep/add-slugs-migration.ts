import { db } from "./server/db";
import { sql } from "drizzle-orm";
import { terms } from "./shared/schema";

async function generateSlug(name: string): Promise<string> {
  // Convert to lowercase and replace spaces and special characters with hyphens
  let slug = name.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Remove consecutive hyphens
  
  return slug;
}

async function addSlugColumn() {
  try {
    console.log("Adding slug column to terms table...");
    
    // Add the slug column
    try {
      await db.execute(sql`
        ALTER TABLE terms ADD COLUMN slug TEXT;
      `);
      console.log("Slug column added successfully");
    } catch (err) {
      // Column might already exist
      console.log("Column may already exist, continuing...");
    }
    
    // Fetch all terms
    console.log("Fetching all terms...");
    const allTerms = await db.execute(sql`
      SELECT id, name FROM terms
    `);
    
    const termRecords = (allTerms as any[]);
    console.log(`Found ${termRecords.length} terms`);
    
    // Process each term and generate a slug
    for (const term of termRecords) {
      const baseSlug = await generateSlug(term.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check if slug already exists (avoid duplicates)
      let isDuplicate = true;
      while (isDuplicate) {
        const existingTerm = await db.execute(sql`
          SELECT id FROM terms WHERE slug = ${slug} AND id != ${term.id}
        `);
        
        if ((existingTerm as any[]).length === 0) {
          isDuplicate = false;
        } else {
          // If duplicate, append a number and try again
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
      
      // Update the term with the new slug
      await db.execute(sql`
        UPDATE terms SET slug = ${slug} WHERE id = ${term.id}
      `);
      console.log(`Updated term "${term.name}" with slug "${slug}"`);
    }
    
    // Make the slug column NOT NULL after all data is updated
    await db.execute(sql`
      ALTER TABLE terms ALTER COLUMN slug SET NOT NULL;
    `);
    
    // Add a unique constraint
    await db.execute(sql`
      ALTER TABLE terms ADD CONSTRAINT terms_slug_unique UNIQUE (slug);
    `);
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run the migration
addSlugColumn().then(() => {
  console.log("Finished migration process");
  process.exit(0);
}).catch(err => {
  console.error("Migration failed with error:", err);
  process.exit(1);
});
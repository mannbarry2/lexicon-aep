import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function generateSlug(name: string): Promise<string> {
  // Convert to lowercase and replace spaces and special characters with hyphens
  let slug = name.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Remove consecutive hyphens
  
  return slug;
}

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Add slug column if it doesn't exist
    try {
      await db.execute(sql`ALTER TABLE terms ADD COLUMN slug TEXT`);
      console.log('Slug column added successfully');
    } catch (err) {
      console.log('Column may already exist, continuing...', err);
    }
    
    // Get all terms
    const termsResult = await db.execute(sql`SELECT id, name FROM terms`);
    const terms = termsResult.rows as { id: number, name: string }[];
    console.log(`Found ${terms.length} terms to update`);
    
    // Update each term with a slug
    for (const term of terms) {
      const baseSlug = await generateSlug(term.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check for duplicate slugs
      let isDuplicate = true;
      while (isDuplicate) {
        const existingTerm = await db.execute(
          sql`SELECT id FROM terms WHERE slug = ${slug} AND id != ${term.id}`
        );
        
        if (existingTerm.rows.length === 0) {
          isDuplicate = false;
        } else {
          // If duplicate, append a number and try again
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
      
      // Update the term with the slug
      await db.execute(
        sql`UPDATE terms SET slug = ${slug} WHERE id = ${term.id}`
      );
      
      console.log(`Updated term "${term.name}" with slug "${slug}"`);
    }
    
    // Make the slug column NOT NULL
    await db.execute(sql`ALTER TABLE terms ALTER COLUMN slug SET NOT NULL`);
    
    // Add a unique constraint
    await db.execute(sql`ALTER TABLE terms ADD CONSTRAINT terms_slug_unique UNIQUE (slug)`);
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });
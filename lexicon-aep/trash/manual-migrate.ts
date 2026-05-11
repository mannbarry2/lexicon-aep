import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateSlug(name: string): Promise<string> {
  // Convert to lowercase and replace spaces and special characters with hyphens
  let slug = name.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Remove consecutive hyphens
  
  return slug;
}

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Add slug column if it doesn't exist
    try {
      await client.query('ALTER TABLE terms ADD COLUMN slug TEXT');
      console.log('Slug column added successfully');
    } catch (err) {
      console.log('Column may already exist, continuing...');
    }
    
    // Get all terms
    const { rows: terms } = await client.query('SELECT id, name FROM terms');
    console.log(`Found ${terms.length} terms to update`);
    
    // Update each term with a slug
    for (const term of terms) {
      const baseSlug = await generateSlug(term.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check for duplicate slugs
      let isDuplicate = true;
      while (isDuplicate) {
        const { rows } = await client.query(
          'SELECT id FROM terms WHERE slug = $1 AND id != $2',
          [slug, term.id]
        );
        
        if (rows.length === 0) {
          isDuplicate = false;
        } else {
          // If duplicate, append a number and try again
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
      
      // Update the term with the slug
      await client.query(
        'UPDATE terms SET slug = $1 WHERE id = $2',
        [slug, term.id]
      );
      
      console.log(`Updated term "${term.name}" with slug "${slug}"`);
    }
    
    // Make the slug column NOT NULL
    await client.query('ALTER TABLE terms ALTER COLUMN slug SET NOT NULL');
    
    // Add a unique constraint
    await client.query('ALTER TABLE terms ADD CONSTRAINT terms_slug_unique UNIQUE (slug)');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully');
  } catch (err) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
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
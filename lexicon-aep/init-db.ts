import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function initDatabase() {
  console.log('Initializing database tables...');
  
  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created users table');

    // Create terms table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS terms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        definition TEXT NOT NULL,
        is_legacy BOOLEAN DEFAULT FALSE,
        current_term_id INTEGER REFERENCES terms(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created terms table');

    // Create categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);
    console.log('Created categories table');

    // Create term_categories join table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS term_categories (
        term_id INTEGER NOT NULL REFERENCES terms(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        PRIMARY KEY (term_id, category_id)
      )
    `);
    console.log('Created term_categories table');

    // Create votes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        term_id INTEGER NOT NULL REFERENCES terms(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        is_upvote BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created votes table');

    // Create term_images table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS term_images (
        id SERIAL PRIMARY KEY,
        term_id INTEGER NOT NULL REFERENCES terms(id),
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        caption TEXT
      )
    `);
    console.log('Created term_images table');

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    process.exit(0);
  }
}

initDatabase();
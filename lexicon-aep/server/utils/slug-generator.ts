import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Generates a URL-friendly slug from a string
 * @param name The original string to convert to a slug
 * @returns A URL-friendly slug
 */
export async function generateSlug(name: string): Promise<string> {
  // Convert to lowercase and replace spaces and special characters with hyphens
  let baseSlug = name.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .trim();                  // Trim whitespace from ends
  
  // If slug is empty after processing, use a fallback
  if (!baseSlug) {
    baseSlug = 'term-' + Date.now();
  }
  
  return baseSlug;
}

/**
 * Generates a unique slug for a term
 * @param name The term name to generate a slug from
 * @param currentId Optional ID of the current term (for updates to avoid self-collision)
 * @returns A unique slug string
 */
export async function generateUniqueSlug(name: string, currentId?: number): Promise<string> {
  const baseSlug = await generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  // Keep checking for duplicate slugs until we find a unique one
  let isDuplicate = true;
  while (isDuplicate) {
    const query = currentId
      ? sql`SELECT id FROM terms WHERE slug = ${slug} AND id != ${currentId}`
      : sql`SELECT id FROM terms WHERE slug = ${slug}`;
    
    const existingTerm = await db.execute(query);
    
    if ((existingTerm.rows as any[]).length === 0) {
      isDuplicate = false;
    } else {
      // If duplicate, append a number and try again
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  
  return slug;
}
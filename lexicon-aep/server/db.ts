import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the Neon PostgreSQL database through DATABASE_URL
const connectionString = process.env.DATABASE_URL;
console.log('Using Neon PostgreSQL database connection.');
export const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool, { schema });

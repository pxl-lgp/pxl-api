import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const pool = new Pool({ connectionString: databaseUrl });

async function runMigration() {
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.log('Database migrations completed.');
  } finally {
    await pool.end();
  }
}

void runMigration();

import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const pool = new Pool({
  connectionString: databaseUrl,
});
const db = drizzle(pool);

function printError(error: unknown) {
  console.error('Migration failed with full error details:');

  if (error instanceof Error) {
    console.error({
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    return;
  }

  console.error(error);
}

async function runMigration() {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migration completed.');
  } catch (error) {
    printError(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void runMigration();

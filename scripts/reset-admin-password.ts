import 'dotenv/config';
import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { users } from '../src/database/schema';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password || password.length < 8) {
    throw new Error('Usage: tsx scripts/reset-admin-password.ts admin@example.com new-password-min-8');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const passwordHash = await hash(password, 12);
  const [user] = await db
    .update(users)
    .set({ passwordHash, role: 'ADMIN', status: 'ACTIVE', updatedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()))
    .returning();

  await pool.end();

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  console.log(`Admin password reset for ${email}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

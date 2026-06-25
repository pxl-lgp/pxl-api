import 'dotenv/config';
import { hashSync } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { organizations, users } from '../src/database/schema';

function requireEnv(name: string, help: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required. ${help}`);
  }

  return value;
}

const databaseUrl = requireEnv(
  'DATABASE_URL',
  'Set it in pxl-api/.env before running the seed script.',
);
const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@pxl.local';
const name = process.env.SEED_ADMIN_NAME ?? 'PXL Admin';
const organizationName = process.env.SEED_ORGANIZATION_NAME ?? 'PXL';
const organizationSlug = process.env.SEED_ORGANIZATION_SLUG ?? 'pxl';
const password = requireEnv(
  'SEED_ADMIN_PASSWORD',
  'Set it in pxl-api/.env, for example: SEED_ADMIN_PASSWORD=change-this-password',
);

if (password.length < 8) {
  throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function seedAdmin() {
  const normalizedEmail = email.toLowerCase();
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    console.log(`Admin user already exists: ${normalizedEmail}`);
    return;
  }

  const passwordHash = hashSync(password, 12);
  const [organization] = await db
    .insert(organizations)
    .values({ name: organizationName, slug: organizationSlug })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { name: organizationName, updatedAt: new Date() },
    })
    .returning();

  await db.insert(users).values({
    email: normalizedEmail,
    organizationId: organization.id,
    name,
    passwordHash,
    role: 'ADMIN',
  });

  console.log(`Admin user created: ${normalizedEmail}`);
}

seedAdmin()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

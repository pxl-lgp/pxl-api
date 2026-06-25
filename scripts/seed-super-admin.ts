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
const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'super-admin@pxl.local';
const name = process.env.SEED_SUPER_ADMIN_NAME ?? 'PXL Super Admin';
const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'change-this-password';
const organizationName = process.env.SEED_PLATFORM_ORGANIZATION_NAME ?? 'PXL Platform';
const organizationSlug = process.env.SEED_PLATFORM_ORGANIZATION_SLUG ?? 'pxl-platform';

if (password.length < 8) {
  throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 8 characters.');
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function seedSuperAdmin() {
  if (!process.env.SEED_SUPER_ADMIN_PASSWORD) {
    console.warn(
      'SEED_SUPER_ADMIN_PASSWORD is not set. Using local seed password: change-this-password',
    );
  }

  const normalizedEmail = email.toLowerCase();
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    console.log(`Super admin user already exists: ${normalizedEmail}`);
    return;
  }

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
    passwordHash: hashSync(password, 12),
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  });

  console.log(`Super admin user created: ${normalizedEmail}`);
}

seedSuperAdmin()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

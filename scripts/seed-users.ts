import 'dotenv/config';
import { hashSync } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { organizations, users } from '../src/database/schema';

const roles = ['SUPER_ADMIN', 'ADMIN', 'TEAM', 'CLIENT'] as const;

function requireEnv(name: string, help: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required. ${help}`);
  }

  return value;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('SEED_USERS_PER_ROLE must be a positive integer.');
  }

  return parsed;
}

const databaseUrl = requireEnv(
  'DATABASE_URL',
  'Set it in pxl-api/.env before running the seed script.',
);
const password = process.env.SEED_USERS_PASSWORD ?? 'change-this-password';
const organizationName = process.env.SEED_ORGANIZATION_NAME ?? 'PXL';
const organizationSlug = process.env.SEED_ORGANIZATION_SLUG ?? 'pxl';
const emailDomain = process.env.SEED_USERS_EMAIL_DOMAIN ?? 'pxl.local';
const usersPerRole = parsePositiveInteger(process.env.SEED_USERS_PER_ROLE, 1);

if (password.length < 8) {
  throw new Error('SEED_USERS_PASSWORD must be at least 8 characters.');
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function seedUsers() {
  if (!process.env.SEED_USERS_PASSWORD) {
    console.warn('SEED_USERS_PASSWORD is not set. Using local seed password: change-this-password');
  }

  const [organization] = await db
    .insert(organizations)
    .values({ name: organizationName, slug: organizationSlug })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { name: organizationName, updatedAt: new Date() },
    })
    .returning();
  const passwordHash = hashSync(password, 12);
  let created = 0;
  let skipped = 0;

  for (const role of roles) {
    for (let index = 1; index <= usersPerRole; index += 1) {
      const suffix = usersPerRole === 1 ? '' : index.toString();
      const roleLabel = role
        .split('_')
        .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
        .join(' ');
      const email = `${role.toLowerCase().replace('_', '-')}${suffix}@${emailDomain}`;
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        skipped += 1;
        console.log(`User already exists: ${email}`);
        continue;
      }

      await db.insert(users).values({
        organizationId: organization.id,
        email,
        name: `${roleLabel} User${suffix ? ` ${index}` : ''}`,
        passwordHash,
        role,
        status: 'ACTIVE',
      });
      created += 1;
      console.log(`Created ${role} user: ${email}`);
    }
  }

  console.log(`Seed users complete. Created: ${created}. Skipped: ${skipped}.`);
}

seedUsers()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

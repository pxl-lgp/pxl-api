import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  organizations,
  workspaceBoards,
  workspaceChannels,
  workspaceMessages,
  workspacePages,
} from '../src/database/schema';
import { and, eq } from 'drizzle-orm';

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
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function seedWorkspace() {
  const orgs = await db.select().from(organizations);
  let updated = 0;

  for (const organization of orgs) {
    const general = await ensureChannel(
      organization.id,
      'general',
      'Default team discussion channel.',
      'GENERAL',
    );
    const activity = await ensureChannel(
      organization.id,
      'activity',
      'System activity and operational updates.',
      'SYSTEM',
    );
    await ensureBoard(organization.id);
    await ensurePage(organization.id);
    await ensureMessage(organization.id, general.id, 'Welcome to your team workspace.');
    await ensureMessage(organization.id, activity.id, 'Workspace activity will appear here.');
    updated += 1;
    console.log(`Workspace defaults ensured for ${organization.name} (${organization.slug})`);
  }

  console.log(`Workspace seed complete. Organizations processed: ${updated}.`);
}

async function ensureChannel(
  organizationId: string,
  slug: string,
  description: string,
  type: 'GENERAL' | 'SYSTEM',
) {
  const [existing] = await db
    .select()
    .from(workspaceChannels)
    .where(
      and(eq(workspaceChannels.organizationId, organizationId), eq(workspaceChannels.slug, slug)),
    )
    .limit(1);

  if (existing) return existing;

  const [channel] = await db
    .insert(workspaceChannels)
    .values({ organizationId, name: slug, slug, description, type, visibility: 'PUBLIC' })
    .returning();

  return channel;
}

async function ensureBoard(organizationId: string) {
  const [existing] = await db
    .select({ id: workspaceBoards.id })
    .from(workspaceBoards)
    .where(
      and(
        eq(workspaceBoards.organizationId, organizationId),
        eq(workspaceBoards.slug, 'team-tasks'),
      ),
    )
    .limit(1);

  if (existing) return;

  await db.insert(workspaceBoards).values({
    organizationId,
    name: 'Team Tasks',
    slug: 'team-tasks',
    description: 'Default board for internal tasks.',
  });
}

async function ensurePage(organizationId: string) {
  const [existing] = await db
    .select({ id: workspacePages.id })
    .from(workspacePages)
    .where(
      and(eq(workspacePages.organizationId, organizationId), eq(workspacePages.slug, 'team-notes')),
    )
    .limit(1);

  if (existing) return;

  await db.insert(workspacePages).values({
    organizationId,
    title: 'Team Notes',
    slug: 'team-notes',
    content: {
      format: 'markdown',
      text: '# Team Notes\n\nUse this page for shared notes, SOPs, and working agreements.',
    },
    visibility: 'PUBLIC',
  });
}

async function ensureMessage(organizationId: string, channelId: string, body: string) {
  const [existing] = await db
    .select({ id: workspaceMessages.id })
    .from(workspaceMessages)
    .where(and(eq(workspaceMessages.channelId, channelId), eq(workspaceMessages.body, body)))
    .limit(1);

  if (existing) return;

  await db
    .insert(workspaceMessages)
    .values({ organizationId, channelId, body, metadata: { system: true } });
}

seedWorkspace()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

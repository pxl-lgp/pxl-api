import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { organizations } from '../database/schema';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: { name: string; slug: string }) {
    const slug = input.slug.trim().toLowerCase();
    const [existing] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing) {
      throw new ConflictException('Organization slug already exists.');
    }

    const [organization] = await this.db
      .insert(organizations)
      .values({ name: input.name.trim(), slug })
      .returning();

    return organization;
  }

  async findAll() {
    return this.db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async findOne(id: string) {
    const [organization] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    return organization;
  }
}

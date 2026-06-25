import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { clients, users } from '../database/schema';
import { UpdateUserDto } from './dto/update-user.dto';

const PASSWORD_SALT_ROUNDS = 12;

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM' | 'CLIENT';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export type UserRecord = typeof users.$inferSelect;

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: {
    organizationId: string;
    email: string;
    passwordHash: string;
    name: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<PublicUser> {
    const existingUser = await this.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const [createdUser] = await this.db
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        organizationId: input.organizationId,
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role ?? 'TEAM',
        status: input.status ?? 'ACTIVE',
      })
      .returning();

    return this.toPublicUser(createdUser);
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);

    return user;
  }

  async findAll(organizationId: string): Promise<PublicUser[]> {
    const records = await this.db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(users.createdAt));

    return records.map((user) => this.toPublicUser(user));
  }

  async findAllAcrossOrganizations(): Promise<PublicUser[]> {
    const records = await this.db.select().from(users).orderBy(desc(users.createdAt));

    return records.map((user) => this.toPublicUser(user));
  }

  async update(id: string, input: UpdateUserDto, organizationId?: string): Promise<PublicUser> {
    const currentUser = await this.requireUser(id, organizationId);

    const email = input.email?.trim().toLowerCase();

    if (email) {
      const [existingUser] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    if (input.role === 'CLIENT') {
      const clientEmail = email ?? currentUser.email;
      const [linkedClient] = await this.db
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(and(eq(clients.organizationId, currentUser.organizationId), eq(clients.email, clientEmail)))
        .limit(1);

      if (!linkedClient) {
        throw new BadRequestException(
          'Client users must be linked to a client profile. Create the client from Clients and enable the portal account option.',
        );
      }

      if (linkedClient.userId && linkedClient.userId !== id) {
        throw new ConflictException('This client profile is already linked to another user.');
      }
    }

    const passwordHash = input.password
      ? await hash(input.password, PASSWORD_SALT_ROUNDS)
      : undefined;
    const [updatedUser] = await this.db
      .update(users)
      .set({
        email,
        name: input.name?.trim(),
        role: input.role,
        status: input.status,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (updatedUser.role === 'CLIENT') {
      await this.db
        .update(clients)
        .set({ userId: updatedUser.id, updatedAt: new Date() })
        .where(
          and(
            eq(clients.organizationId, updatedUser.organizationId),
            eq(clients.email, updatedUser.email),
          ),
        );
    } else if (currentUser.role === 'CLIENT') {
      await this.db
        .update(clients)
        .set({ userId: null, updatedAt: new Date() })
        .where(eq(clients.userId, updatedUser.id));
    }

    return this.toPublicUser(updatedUser);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.requireUser(id, organizationId);
    await this.db.delete(users).where(eq(users.id, id));
  }

  private async requireUser(id: string, organizationId?: string): Promise<UserRecord> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        organizationId
          ? and(eq(users.id, id), eq(users.organizationId, organizationId))
          : eq(users.id, id),
      )
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  toPublicUser(user: UserRecord): PublicUser {
    const publicUser: PublicUser = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return publicUser;
  }
}

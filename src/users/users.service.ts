import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { users } from '../database/schema';
import { UpdateUserDto } from './dto/update-user.dto';

const PASSWORD_SALT_ROUNDS = 12;

export type UserRole = 'ADMIN' | 'TEAM' | 'CLIENT';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export type UserRecord = typeof users.$inferSelect;

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: {
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

  async findAll(): Promise<PublicUser[]> {
    const records = await this.db.select().from(users).orderBy(desc(users.createdAt));

    return records.map((user) => this.toPublicUser(user));
  }

  async update(id: string, input: UpdateUserDto): Promise<PublicUser> {
    await this.requireUser(id);

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

    const passwordHash = input.password ? await hash(input.password, PASSWORD_SALT_ROUNDS) : undefined;
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

    return this.toPublicUser(updatedUser);
  }

  async remove(id: string): Promise<void> {
    await this.requireUser(id);
    await this.db.delete(users).where(eq(users.id, id));
  }

  private async requireUser(id: string): Promise<UserRecord> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  toPublicUser(user: UserRecord): PublicUser {
    const publicUser: PublicUser = {
      id: user.id,
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

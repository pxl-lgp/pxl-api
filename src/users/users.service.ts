import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { users } from '../database/schema';

export type UserRole = 'ADMIN' | 'TEAM' | 'CLIENT';

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

  toPublicUser(user: UserRecord): PublicUser {
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return publicUser;
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { compare, hash, hashSync } from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { AppConfig } from '../config/app.config';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { authTokens, clients } from '../database/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PublicUser, UsersService } from '../users/users.service';

const PASSWORD_SALT_ROUNDS = 12;

// A precomputed hash compared against when the email is unknown, so login takes
// the same time whether or not the account exists (defeats timing-based user
// enumeration). The placeholder password is never a valid credential.
const DUMMY_PASSWORD_HASH = hashSync('pxl-nonexistent-account-placeholder', PASSWORD_SALT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async register(
    input: RegisterDto,
    actorUser: { role: string; organizationId: string },
  ): Promise<PublicUser> {
    if (input.role === 'SUPER_ADMIN' && actorUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can create super admins.');
    }

    if (input.role === 'CLIENT') {
      await this.requireLinkableClient(input.email, actorUser.organizationId);
    }

    const passwordHash = await hash(input.password, PASSWORD_SALT_ROUNDS);

    // Admins create accounts on behalf of others; they should not receive a
    // session token for the new user. The new user logs in themselves.
    const user = await this.usersService.create({
      email: input.email,
      organizationId: actorUser.organizationId,
      passwordHash,
      name: input.name,
      role: input.role,
    });

    if (user.role === 'CLIENT') {
      await this.linkClientUser(user.id, user.email, user.organizationId, undefined, 'auth.client_user_registered');
    }

    return user;
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(input.email);
    // Always run a bcrypt comparison (against a dummy hash when the email is
    // unknown) so response time does not reveal whether the account exists.
    const passwordMatches = await compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || user.status === 'DISABLED') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const publicUser = this.usersService.toPublicUser(user);

    return {
      accessToken: await this.signAccessToken(publicUser),
      user: publicUser,
    };
  }

  async inviteUser(
    input: InviteUserDto,
    actorUser: { id: string; role: string; organizationId: string },
  ): Promise<PublicUser> {
    if (input.role === 'SUPER_ADMIN' && actorUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can invite super admins.');
    }

    if (input.role === 'CLIENT') {
      await this.requireLinkableClient(input.email, actorUser.organizationId);
    }

    const passwordHash = await hash(randomBytes(32).toString('hex'), PASSWORD_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: input.email,
      organizationId: actorUser.organizationId,
      passwordHash,
      name: input.name.trim(),
      role: input.role,
      status: 'ACTIVE',
    });
    const link = await this.createAuthLink(user.id, 'INVITE');

    if (user.role === 'CLIENT') {
      await this.linkClientUser(user.id, user.email, user.organizationId, actorUser.id, 'auth.client_user_invited');
    }

    await this.notificationsService.notifyUser(
      user.email,
      'Your PXL portal invite',
      `You have been invited to the PXL portal. Set your password here:\n\n${link}\n\nThis link expires in 7 days.`,
    );
    await this.auditService.log({
      actorUserId: actorUser.id,
      action: 'user.invited',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return user;
  }

  async sendAdminPasswordReset(
    userId: string,
    actorUser: { id: string; organizationId: string },
  ): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user || user.organizationId !== actorUser.organizationId) {
      throw new BadRequestException('User not found.');
    }

    const link = await this.createAuthLink(user.id, 'PASSWORD_RESET');

    await this.notificationsService.notifyUser(
      user.email,
      'Reset your PXL portal password',
      `An admin requested a password reset for your PXL portal account. Set a new password here:\n\n${link}\n\nThis link expires in 1 hour.`,
    );
    await this.auditService.log({
      actorUserId: actorUser.id,
      action: 'user.password_reset_sent',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
    });
  }

  async forgotPassword(input: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(input.email);

    if (!user || user.status === 'DISABLED') {
      return;
    }

    const link = await this.createAuthLink(user.id, 'PASSWORD_RESET');

    await this.notificationsService.notifyUser(
      user.email,
      'Reset your PXL portal password',
      `Reset your PXL portal password here:\n\n${link}\n\nThis link expires in 1 hour.`,
    );
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(input.token);
    const [token] = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!token) {
      throw new BadRequestException('Password reset link is invalid or expired.');
    }

    await this.usersService.update(token.userId, {
      password: input.password,
      status: 'ACTIVE',
    });
    await this.db
      .update(authTokens)
      .set({ usedAt: new Date(), updatedAt: new Date() })
      .where(eq(authTokens.id, token.id));
    await this.auditService.log({
      action: token.purpose === 'INVITE' ? 'user.invite_accepted' : 'user.password_reset',
      entityType: 'user',
      entityId: token.userId,
    });
  }

  async updateProfile(userId: string, input: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.usersService.update(userId, input);

    await this.auditService.log({
      actorUserId: userId,
      action: 'user.profile_updated',
      entityType: 'user',
      entityId: userId,
    });

    return user;
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    const matches = user ? await compare(input.currentPassword, user.passwordHash) : false;

    if (!user || !matches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    await this.usersService.update(userId, { password: input.newPassword });
    await this.auditService.log({
      actorUserId: userId,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
    });
  }

  private async createAuthLink(
    userId: string,
    purpose: 'INVITE' | 'PASSWORD_RESET',
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (purpose === 'INVITE' ? 7 * 24 * 60 : 60) * 60 * 1000);

    await this.db.insert(authTokens).values({
      userId,
      tokenHash: this.hashToken(token),
      purpose,
      expiresAt,
    });

    return `${this.config.get('FRONTEND_URL', { infer: true })}/reset-password?token=${token}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async linkClientUser(
    userId: string,
    email: string,
    organizationId: string,
    actorUserId?: string,
    action = 'auth.client_user_linked',
  ): Promise<void> {
    const client = await this.requireLinkableClient(email, organizationId, userId);

    await this.db
      .update(clients)
      .set({ userId, updatedAt: new Date() })
      .where(eq(clients.id, client.id));
    await this.auditService.log({
      actorUserId,
      action,
      entityType: 'client',
      entityId: client.id,
      metadata: { email, userId },
    });
  }

  private async requireLinkableClient(
    email: string,
    organizationId: string,
    userId?: string,
  ): Promise<{ id: string; userId: string | null }> {
    const [client] = await this.db
      .select({ id: clients.id, userId: clients.userId })
      .from(clients)
      .where(and(eq(clients.organizationId, organizationId), eq(clients.email, email.toLowerCase())))
      .limit(1);

    if (!client) {
      throw new BadRequestException(
        'Client users must be linked to a client profile. Create the client from Clients and enable the portal account option.',
      );
    }

    if (client.userId && client.userId !== userId) {
      throw new ConflictException('This client profile is already linked to another user.');
    }

    return client;
  }

  private async signAccessToken(user: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    });
  }
}

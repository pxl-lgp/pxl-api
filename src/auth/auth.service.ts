import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
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
  ) {}

  async register(input: RegisterDto): Promise<PublicUser> {
    const passwordHash = await hash(input.password, PASSWORD_SALT_ROUNDS);

    // Admins create accounts on behalf of others; they should not receive a
    // session token for the new user. The new user logs in themselves.
    return this.usersService.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    });
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(input.email);
    // Always run a bcrypt comparison (against a dummy hash when the email is
    // unknown) so response time does not reveal whether the account exists.
    const passwordMatches = await compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const publicUser = this.usersService.toPublicUser(user);

    return {
      accessToken: await this.signAccessToken(publicUser),
      user: publicUser,
    };
  }

  private async signAccessToken(user: { id: string; email: string; role: string }): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

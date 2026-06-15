import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { PublicUser, UsersService } from '../users/users.service';

const PASSWORD_SALT_ROUNDS = 12;

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

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
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

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './types/authenticated-user.type';
import { UserResponseDto } from '../users/dto/user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a user' })
  @ApiCreatedResponse({ description: 'User registered.', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins can register users.' })
  register(@Body() input: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(input);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a user by email' })
  @ApiCreatedResponse({ description: 'User invited.', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins can invite users.' })
  invite(
    @Body() input: InviteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.authService.inviteUser(input, user.id);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ description: 'Login succeeded.', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(input);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({ description: 'Password reset email sent if the account exists.' })
  async forgotPassword(@Body() input: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(input);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Set a password with an invite or reset token' })
  @ApiOkResponse({ description: 'Password updated.' })
  async resetPassword(@Body() input: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(input);
  }

  @Post('users/:id/password-reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a password reset email for a user' })
  @ApiOkResponse({ description: 'Password reset email sent.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins can reset users.' })
  async sendUserPasswordReset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.authService.sendAdminPasswordReset(id, user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ description: 'Current user.', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiOkResponse({ description: 'Current user updated.', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateProfile(user.id, input);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current authenticated user password' })
  @ApiOkResponse({ description: 'Password changed.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, input);
  }
}

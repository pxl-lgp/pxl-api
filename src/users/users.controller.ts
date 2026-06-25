import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ description: 'User list.', type: UserResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins can list users.' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserResponseDto[]> {
    if (currentUser.role === 'SUPER_ADMIN') {
      return this.usersService.findAllAcrossOrganizations();
    }

    return this.usersService.findAll(currentUser.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user account' })
  @ApiOkResponse({ description: 'User updated.', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins can update users.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    if (id === currentUser.id && input.role && input.role !== 'ADMIN') {
      throw new BadRequestException('You cannot remove your own admin access.');
    }

    if (id === currentUser.id && input.status === 'DISABLED') {
      throw new BadRequestException('You cannot disable your own account.');
    }

    return this.usersService.update(id, input, currentUser.organizationId).then(async (user) => {
      await this.auditService.log({
        actorUserId: currentUser.id,
        action: 'user.updated',
        entityType: 'user',
        entityId: id,
        metadata: { fields: Object.keys(input) },
      });

      return user;
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user account' })
  @ApiOkResponse({ description: 'User deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins can delete users.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<void> {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    await this.usersService.remove(id, currentUser.organizationId);
    await this.auditService.log({
      actorUserId: currentUser.id,
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
    });
  }
}

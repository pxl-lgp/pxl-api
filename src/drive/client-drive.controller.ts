import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ClientPortalService } from '../client-portal/client-portal.service';
import { DriveService } from './drive.service';

@ApiTags('client drive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
@Controller('client-portal/drive')
export class ClientDriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly clientPortalService: ClientPortalService,
  ) {}

  @Get('items')
  @ApiOperation({ summary: 'List files in the current client Drive workspace' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query('folderId') folderId?: string) {
    const client = await this.clientPortalService.getClientForUser(user);
    return this.driveService.listClientFolder(client.id, user.organizationId, folderId);
  }

  @Post('files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload a file to the current client Drive workspace' })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('parentFolderId') parentFolderId?: string,
  ) {
    const client = await this.clientPortalService.getClientForUser(user);
    return this.driveService.uploadFile(client.id, user.organizationId, file, parentFolderId);
  }

  @Get('files/:fileId/download')
  @ApiOperation({ summary: 'Download a file from the current client Drive workspace' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ) {
    const client = await this.clientPortalService.getClientForUser(user);
    const file = await this.driveService.downloadFile(client.id, user.organizationId, fileId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    file.stream.pipe(response);
  }
}

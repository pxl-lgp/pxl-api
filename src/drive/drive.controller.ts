import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDriveFolderDto } from './dto/create-drive-folder.dto';
import { DriveService } from './drive.service';

@ApiTags('google drive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('drive/clients/:clientId')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('items')
  @ApiOperation({ summary: 'List files and folders in a client Drive workspace' })
  list(@Param('clientId', ParseUUIDPipe) clientId: string, @Query('folderId') folderId?: string) {
    return this.driveService.listClientFolder(clientId, folderId);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create a folder in a client Drive workspace' })
  createFolder(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() input: CreateDriveFolderDto,
    @Query('parentFolderId') parentFolderId?: string,
  ) {
    return this.driveService.createFolder(clientId, input.name, parentFolderId);
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
  @ApiOperation({ summary: 'Upload a file to a client Drive workspace' })
  upload(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('parentFolderId') parentFolderId?: string,
  ) {
    return this.driveService.uploadFile(clientId, file, parentFolderId);
  }

  @Get('files/:fileId/download')
  @ApiOperation({ summary: 'Download a file from a client Drive workspace' })
  async download(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ) {
    const file = await this.driveService.downloadFile(clientId, fileId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    file.stream.pipe(response);
  }

  @Delete('items/:fileId')
  @ApiOperation({ summary: 'Delete a file or folder from a client Drive workspace' })
  remove(@Param('clientId', ParseUUIDPipe) clientId: string, @Param('fileId') fileId: string) {
    return this.driveService.deleteItem(clientId, fileId);
  }
}

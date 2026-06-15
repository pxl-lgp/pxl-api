import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drive_v3, google } from 'googleapis';
import { Readable } from 'node:stream';
import { AppConfig } from '../config/app.config';
import { ClientsService } from '../clients/clients.service';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  thumbnailLink: string | null;
  isFolder: boolean;
};

@Injectable()
export class DriveService {
  private readonly drive: drive_v3.Drive | null;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly clientsService: ClientsService,
  ) {
    const oauthClientId = config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true });
    const oauthClientSecret = config.get('GOOGLE_DRIVE_CLIENT_SECRET', { infer: true });
    const oauthRefreshToken = config.get('GOOGLE_DRIVE_REFRESH_TOKEN', { infer: true });
    const clientEmail = config.get('GOOGLE_DRIVE_CLIENT_EMAIL', { infer: true });
    const privateKey = config.get('GOOGLE_DRIVE_PRIVATE_KEY', { infer: true });

    if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
      const auth = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
      auth.setCredentials({ refresh_token: oauthRefreshToken });
      this.drive = google.drive({ version: 'v3', auth });
      return;
    }

    if (!clientEmail || !privateKey) {
      this.drive = null;
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async provisionClientFolder(clientName: string, parentFolderId: string): Promise<string> {
    const response = await this.getDrive().files.create({
      requestBody: {
        name: clientName.trim(),
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentFolderId],
      },
      fields: 'id,webViewLink',
      supportsAllDrives: true,
    });

    const folderId = response.data.id;
    const webViewLink = response.data.webViewLink;

    if (!folderId || !webViewLink) {
      throw new Error('Drive did not return a folder id after creation.');
    }

    return webViewLink;
  }

  async listClientFolder(clientId: string, folderId?: string) {
    const rootFolderId = await this.getClientRootFolderId(clientId);
    const currentFolderId = folderId || rootFolderId;
    await this.assertFolderWithinRoot(rootFolderId, currentFolderId);

    const drive = this.getDrive();
    const [folderResponse, filesResponse] = await Promise.all([
      drive.files.get({
        fileId: currentFolderId,
        fields: 'id,name,parents,webViewLink',
        supportsAllDrives: true,
      }),
      drive.files.list({
        q: `'${this.escapeQueryValue(currentFolderId)}' in parents and trashed = false`,
        fields:
          'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,parents)',
        orderBy: 'folder,name_natural',
        pageSize: 200,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    ]);

    const folder = folderResponse.data;

    return {
      rootFolderId,
      currentFolder: {
        id: folder.id ?? currentFolderId,
        name: folder.name ?? 'Google Drive',
        parentId: folder.parents?.[0] ?? null,
        webViewLink: folder.webViewLink ?? null,
      },
      items: (filesResponse.data.files ?? []).map((file) => this.mapItem(file)),
    };
  }

  async createFolder(clientId: string, name: string, parentFolderId?: string) {
    const rootFolderId = await this.getClientRootFolderId(clientId);
    const parentId = parentFolderId || rootFolderId;
    await this.assertFolderWithinRoot(rootFolderId, parentId);

    const response = await this.getDrive().files.create({
      requestBody: {
        name: name.trim(),
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentId],
      },
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,parents',
      supportsAllDrives: true,
    });

    return this.mapItem(response.data);
  }

  async uploadFile(clientId: string, file: Express.Multer.File, parentFolderId?: string) {
    if (!file) {
      throw new BadRequestException('A file is required.');
    }

    const rootFolderId = await this.getClientRootFolderId(clientId);
    const parentId = parentFolderId || rootFolderId;
    await this.assertFolderWithinRoot(rootFolderId, parentId);

    const response = await this.getDrive().files.create({
      requestBody: {
        name: file.originalname,
        parents: [parentId],
      },
      media: {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      },
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,parents',
      supportsAllDrives: true,
    });

    return this.mapItem(response.data);
  }

  async downloadFile(clientId: string, fileId: string) {
    const rootFolderId = await this.getClientRootFolderId(clientId);
    const file = await this.getFileMetadata(fileId);
    await this.assertItemWithinRoot(rootFolderId, file);

    if (file.mimeType === FOLDER_MIME_TYPE) {
      throw new BadRequestException('Folders cannot be downloaded as files.');
    }

    if (file.mimeType?.startsWith('application/vnd.google-apps.')) {
      throw new BadRequestException('Google-native documents must be opened in Google Drive.');
    }

    const response = await this.getDrive().files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'stream' },
    );

    return {
      name: file.name ?? 'download',
      mimeType: file.mimeType ?? 'application/octet-stream',
      stream: response.data,
    };
  }

  async deleteItem(clientId: string, fileId: string) {
    const rootFolderId = await this.getClientRootFolderId(clientId);

    if (fileId === rootFolderId) {
      throw new ForbiddenException('The client root folder cannot be deleted.');
    }

    const file = await this.getFileMetadata(fileId);
    await this.assertItemWithinRoot(rootFolderId, file);
    await this.getDrive().files.delete({ fileId, supportsAllDrives: true });

    return { deleted: true, id: fileId };
  }

  private getDrive() {
    if (!this.drive) {
      throw new ServiceUnavailableException(
        'Google Drive is not configured. Add OAuth or service-account credentials to the API environment.',
      );
    }

    return this.drive;
  }

  private async getClientRootFolderId(clientId: string) {
    const client = await this.clientsService.findOne(clientId);

    if (!client.driveFolderUrl) {
      throw new BadRequestException('This client does not have a Google Drive folder yet.');
    }

    const folderId = this.extractFolderId(client.driveFolderUrl);

    if (!folderId) {
      throw new BadRequestException('The saved Google Drive folder URL is invalid.');
    }

    return folderId;
  }

  private extractFolderId(value: string) {
    const folderMatch = value.match(/\/folders\/([^/?#]+)/);

    if (folderMatch?.[1]) {
      return folderMatch[1];
    }

    return /^[a-zA-Z0-9_-]{10,}$/.test(value) ? value : null;
  }

  private async getFileMetadata(fileId: string) {
    try {
      const response = await this.getDrive().files.get({
        fileId,
        fields: 'id,name,mimeType,parents,webViewLink',
        supportsAllDrives: true,
      });

      return response.data;
    } catch {
      throw new NotFoundException('Google Drive item not found or not shared with the service account.');
    }
  }

  private async assertFolderWithinRoot(rootFolderId: string, folderId: string) {
    const folder = await this.getFileMetadata(folderId);

    if (folder.mimeType !== FOLDER_MIME_TYPE) {
      throw new BadRequestException('The selected Drive item is not a folder.');
    }

    await this.assertItemWithinRoot(rootFolderId, folder);
  }

  private async assertItemWithinRoot(rootFolderId: string, item: drive_v3.Schema$File) {
    if (item.id === rootFolderId) {
      return;
    }

    const visited = new Set<string>();
    const pending = [...(item.parents ?? [])];

    while (pending.length > 0) {
      const parentId = pending.shift();

      if (!parentId || visited.has(parentId)) {
        continue;
      }

      if (parentId === rootFolderId) {
        return;
      }

      visited.add(parentId);
      const parent = await this.getFileMetadata(parentId);
      pending.push(...(parent.parents ?? []));
    }

    throw new ForbiddenException('The requested Drive item is outside this client workspace.');
  }

  private mapItem(file: drive_v3.Schema$File): DriveItem {
    return {
      id: file.id ?? '',
      name: file.name ?? 'Untitled',
      mimeType: file.mimeType ?? 'application/octet-stream',
      size: file.size ? Number(file.size) : null,
      modifiedTime: file.modifiedTime ?? null,
      webViewLink: file.webViewLink ?? null,
      thumbnailLink: file.thumbnailLink ?? null,
      isFolder: file.mimeType === FOLDER_MIME_TYPE,
    };
  }

  private escapeQueryValue(value: string) {
    return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  }
}

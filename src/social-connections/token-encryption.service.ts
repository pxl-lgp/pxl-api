import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppConfig } from '../config/app.config';

const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

@Injectable()
export class TokenEncryptionService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  encrypt(value: string): string {
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
  }

  decrypt(value: string): string {
    const key = this.getKey();
    const [ivValue, tagValue, encryptedValue] = value.split('.');

    if (!ivValue || !tagValue || !encryptedValue) {
      throw new ServiceUnavailableException('Stored social token is not in a supported encrypted format.');
    }

    const iv = Buffer.from(ivValue, 'base64url');
    const tag = Buffer.from(tagValue, 'base64url');

    if (iv.length !== IV_LENGTH_BYTES || tag.length !== AUTH_TAG_LENGTH_BYTES) {
      throw new ServiceUnavailableException('Stored social token is not in a supported encrypted format.');
    }

    const decipher = createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey(): Buffer {
    const configuredKey = this.config.get('SOCIAL_TOKEN_ENCRYPTION_KEY', { infer: true });

    if (!configuredKey) {
      throw new ServiceUnavailableException(
        'Social connections are not configured. Set SOCIAL_TOKEN_ENCRYPTION_KEY on the API.',
      );
    }

    const key = Buffer.from(configuredKey, 'base64');

    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
      );
    }

    return key;
  }
}

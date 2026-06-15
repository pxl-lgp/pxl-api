import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { AppConfig } from '../config/app.config';
import { TokenEncryptionService } from './token-encryption.service';

function serviceWithKey(key: string | undefined): TokenEncryptionService {
  const config = {
    get: () => key,
  } as unknown as ConfigService<AppConfig, true>;

  return new TokenEncryptionService(config);
}

describe('TokenEncryptionService', () => {
  const validKey = randomBytes(32).toString('base64');

  it('round-trips a value through encrypt/decrypt', () => {
    const service = serviceWithKey(validKey);
    const secret = 'page-access-token-12345';

    const encrypted = service.encrypt(secret);

    expect(encrypted).not.toContain(secret);
    expect(encrypted.split('.')).toHaveLength(3);
    expect(service.decrypt(encrypted)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const service = serviceWithKey(validKey);

    expect(service.encrypt('same-value')).not.toBe(service.encrypt('same-value'));
  });

  it('rejects ciphertext that is not in the expected format', () => {
    const service = serviceWithKey(validKey);

    expect(() => service.decrypt('not-valid')).toThrow();
  });

  it('fails when no key is configured', () => {
    const service = serviceWithKey(undefined);

    expect(() => service.encrypt('value')).toThrow();
  });

  it('rejects a key that is not 32 bytes', () => {
    const service = serviceWithKey(randomBytes(16).toString('base64'));

    expect(() => service.encrypt('value')).toThrow();
  });
});

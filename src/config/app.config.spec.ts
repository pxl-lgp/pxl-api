import { validateConfig } from './app.config';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/pxl',
  JWT_SECRET: 'a-sufficiently-long-secret',
};

describe('validateConfig', () => {
  it('applies defaults for optional values', () => {
    const config = validateConfig({ ...baseEnv });

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.JWT_EXPIRES_IN).toBe('7d');
    expect(config.GOOGLE_CALENDAR_ID).toBe('primary');
  });

  it('coerces PORT from a string', () => {
    const config = validateConfig({ ...baseEnv, PORT: '8080' });

    expect(config.PORT).toBe(8080);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateConfig({ JWT_SECRET: baseEnv.JWT_SECRET })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => validateConfig({ ...baseEnv, JWT_SECRET: 'short' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => validateConfig({ ...baseEnv, NODE_ENV: 'staging' })).toThrow();
  });
});

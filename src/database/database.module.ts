import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfig } from '../config/app.config';
import { DRIZZLE } from './database.constants';
import * as schema from './schema';

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const logger = new Logger('DatabasePool');
        const pool = new Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
        });

        // Without a listener, an error on an idle client (dropped connection,
        // DB restart) is thrown as an unhandled event and crashes the process.
        pool.on('error', (error) => {
          logger.error(`Idle PostgreSQL client error: ${error.message}`, error.stack);
        });

        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}

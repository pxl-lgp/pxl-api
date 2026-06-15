import { Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfig } from '../config/app.config';
import { DRIZZLE, PG_POOL } from './database.constants';
import * as schema from './schema';

@Module({
  providers: [
    {
      provide: PG_POOL,
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

        return pool;
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Close the connection pool when the app shuts down so in-flight queries
  // finish and the process can exit cleanly (requires enableShutdownHooks()).
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.pool.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to close PostgreSQL pool cleanly: ${message}`);
    }
  }
}

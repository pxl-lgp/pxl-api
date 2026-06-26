import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/app.config';

function parseAllowedOrigins(originConfig: string) {
  return originConfig
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('PORT', { infer: true });
  const allowedOrigins = parseAllowedOrigins(config.get('CORS_ORIGIN', { infer: true }));

  app.setGlobalPrefix('api');
  app.use(helmet());
  // Flush in-flight requests and close the DB pool cleanly on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(config));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, '');
      callback(null, allowedOrigins.includes(normalizedOrigin));
    },
  });

  if (
    config.get('NODE_ENV', { infer: true }) !== 'production' ||
    config.get('ENABLE_SWAGGER', { infer: true })
  ) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PXL Automation API')
      .setDescription(
        'Backend API for PXL Automation operations, workflows, and AI-assisted tools.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`PXL API listening on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(`Failed to start PXL API: ${message}`, stack);
  process.exit(1);
});

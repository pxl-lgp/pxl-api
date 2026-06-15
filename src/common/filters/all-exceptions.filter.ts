import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppConfig } from '../../config/app.config';
import { OperationError } from '../errors/operation-error';

type ErrorLike = {
  code?: unknown;
  detail?: unknown;
  message?: unknown;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isProduction = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.buildPayload(exception, status, request, isProduction);

    this.logger.error(
      `${request.method} ${request.url} -> ${status} ${this.formatMessage(payload.message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(payload);
  }

  private buildPayload(exception: unknown, status: number, request: Request, isProduction: boolean) {
    const base = {
      statusCode: status,
      error: this.getErrorName(exception, status),
      message: this.getPublicMessage(exception, status, isProduction),
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    if (isProduction) {
      return base;
    }

    return {
      ...base,
      details: this.getDetails(exception),
    };
  }

  private getPublicMessage(exception: unknown, status: number, isProduction: boolean) {
    if (exception instanceof OperationError) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response && 'message' in response) {
        const message = response.message;
        return Array.isArray(message) ? message : String(message);
      }
    }

    if (isProduction && status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      return 'Internal server error';
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unexpected error';
  }

  private getErrorName(exception: unknown, status: number) {
    if (exception instanceof Error) {
      return exception.name;
    }

    return status === Number(HttpStatus.INTERNAL_SERVER_ERROR) ? 'InternalServerError' : 'Error';
  }

  private getDetails(exception: unknown): Record<string, unknown> | undefined {
    if (exception instanceof OperationError) {
      return {
        operation: exception.operation,
        ...exception.details,
        cause: this.toErrorDetails(exception.cause),
      };
    }

    return this.toErrorDetails(exception);
  }

  private toErrorDetails(error: unknown): Record<string, unknown> | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const errorLike = error as ErrorLike & { cause?: unknown };

    return {
      name: error instanceof Error ? error.name : undefined,
      message: typeof errorLike.message === 'string' ? errorLike.message : undefined,
      code: errorLike.code,
      detail: errorLike.detail,
      cause: this.toErrorDetails(errorLike.cause),
    };
  }

  private formatMessage(message: string | string[]) {
    return Array.isArray(message) ? message.join('; ') : message;
  }
}

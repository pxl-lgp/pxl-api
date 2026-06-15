import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

/**
 * Logs one structured line per HTTP request once the response is fully sent:
 * `METHOD url status durationms`. Uses the response `finish` event so the status
 * code is accurate (including responses shaped by the exceptions filter).
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    response.once('finish', () => {
      const durationMs = Date.now() - startedAt;
      const message = `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`;

      if (response.statusCode >= 500) {
        this.logger.error(message);
      } else if (response.statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    return next.handle();
  }
}

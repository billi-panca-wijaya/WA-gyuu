import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || (request as any).requestId || 'req_' + Date.now();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'An unexpected server error occurred.';
    let attemptsRemaining: number | undefined = undefined;
    let retryable = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        errorCode = obj.code || obj.error || this.mapStatusToCode(status);
        errorMessage = obj.message || exception.message;
        attemptsRemaining = obj.attempts_remaining;
        retryable = obj.retryable ?? (status === HttpStatus.TOO_MANY_REQUESTS || status >= 500);
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    }

    const errorPayload: ApiErrorResponse = {
      error: {
        code: errorCode,
        message: Array.isArray(errorMessage) ? errorMessage.join('; ') : errorMessage,
        retryable,
        ...(attemptsRemaining !== undefined ? { attempts_remaining: attemptsRemaining } : {}),
      },
      meta: {
        request_id: requestId,
        server_time: new Date().toISOString(),
      },
    };

    response.status(status).json(errorPayload);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'IDEMPOTENCY_CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_FAILED';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'DEPENDENCY_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}

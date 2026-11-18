import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || (request as any).requestId || 'req_' + Date.now();

    return next.handle().pipe(
      map((body) => {
        // If already structured with data and meta, preserve it
        if (body && typeof body === 'object' && 'data' in body && 'meta' in body) {
          return body;
        }

        // If body already has 'data' property (e.g. { data: ... }), attach meta without double-nesting
        if (body && typeof body === 'object' && 'data' in body) {
          return {
            ...body,
            meta: {
              request_id: requestId,
              server_time: new Date().toISOString(),
            },
          };
        }

        return {
          data: body,
          meta: {
            request_id: requestId,
            server_time: new Date().toISOString(),
          },
        };
      }),
    );
  }
}

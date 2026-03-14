import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WrappedResponse<T> {
  data: T;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<WrappedResponse<T>> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // If the response is already a PaginatedResponse (has data + meta),
        // pass it through without double-wrapping
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return data;
        }

        return {
          data,
          statusCode: response.statusCode,
        };
      }),
    );
  }
}

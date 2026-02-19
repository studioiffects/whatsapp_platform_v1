import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { RequestWithUser } from "../types/request-with-user";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();

    const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);

    return next.handle().pipe(tap(() => undefined));
  }
}

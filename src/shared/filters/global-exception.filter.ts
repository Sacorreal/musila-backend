import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Filtro global de excepciones.
 * - Maneja errores HTTP estándar con respuestas JSON estructuradas.
 * - Suprime silenciosamente errores de red esperados (ECONNRESET, EPIPE, ECONNABORTED)
 *   que ocurren cuando el cliente HTTP cancela una petición en curso.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  // Códigos de error de red que son esperados y no deben loguearse como errores
  private readonly SILENT_NETWORK_ERRORS = new Set([
    'ECONNRESET',
    'EPIPE',
    'ECONNABORTED',
    'ERR_STREAM_DESTROYED',
  ]);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Si el cliente cerró la conexión (ECONNRESET, EPIPE, etc.), no intentamos responder
    if (exception instanceof Error && this.SILENT_NETWORK_ERRORS.has((exception as any).code)) {
      this.logger.debug(
        `Client disconnected during request: ${request.method} ${request.url} [${(exception as any).code}]`,
      );
      return;
    }

    // Manejar errores HTTP de NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (!response.headersSent) {
        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          ...(typeof exceptionResponse === 'object'
            ? exceptionResponse
            : { message: exceptionResponse }),
        });
      }
      return;
    }

    // Otros errores no esperados → log + 500
    const errorId = randomUUID();
    this.logger.error(`[${errorId}] Unhandled exception on ${request.method} ${request.url}:`, exception);

    if (!response.headersSent) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'Internal server error',
        errorId,
      });
    }
  }
}

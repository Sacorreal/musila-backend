import { Global, Module } from '@nestjs/common';
import { OtpService } from './otp.service';

/**
 * Módulo global: se registra una sola vez en AppModule y OtpService
 * queda disponible para inyectar en cualquier módulo sin volver a importarlo.
 */
@Global()
@Module({
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}

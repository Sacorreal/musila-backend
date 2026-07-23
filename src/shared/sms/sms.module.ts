import { Global, Module } from '@nestjs/common';
import { SMS_PROVIDER } from './domain/sms-provider.interface';
import { LogSmsProvider } from './providers/log-sms.provider';

@Global()
@Module({
  providers: [{ provide: SMS_PROVIDER, useClass: LogSmsProvider }],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}

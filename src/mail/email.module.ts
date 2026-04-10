import { Module, DynamicModule, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EMAIL_CONFIG } from './constants/email.constants';
import { EmailConfig } from './interfaces/email-options.interface';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmailController} from './email.controller'

@Global()
@Module({})
export class EmailModule {  
  static forRootAsync(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: EMAIL_CONFIG,
          inject: [ConfigService],
          useFactory: (config: ConfigService): EmailConfig => ({
            apiKey: config.getOrThrow<string>('RESEND_API_KEY'),
            defaultFrom: config.getOrThrow<string>('EMAIL_FROM'), 
            defaultReplyTo: config.getOrThrow<string>('EMAIL_REPLY_TO') ,
          }),
         
        },
        EmailService,
      ],
      controllers: [EmailController],
      exports: [EmailService],
    };
  }
}
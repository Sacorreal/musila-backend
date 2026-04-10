import { Controller, Get } from '@nestjs/common';
import { EmailService } from './services/email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}
  @Get()
  async sendEmail() {
    return await this.emailService.sendEmailTest()
  }
}

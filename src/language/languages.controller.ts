import { Controller, Get } from '@nestjs/common';
import { LanguagesService } from './languages.service';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly service: LanguagesService) {}

  @Get()
  getLanguages() {
    return this.service.getAllLanguages();
  }
}

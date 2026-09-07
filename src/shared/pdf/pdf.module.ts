import { Global, Module } from '@nestjs/common';
import { PdfConfigService } from './services/pdf-config.service';
import { PdfInputValidatorService } from './services/pdf-input-validator.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Global()
@Module({
  providers: [PdfConfigService, PdfInputValidatorService, PdfGeneratorService],
  exports: [PdfGeneratorService, PdfConfigService],
})
export class PdfModule {}

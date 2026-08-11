import {
  Controller,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { JWTAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { RecoveryCodeService } from './services/recovery-code.service';

@ApiTags('Recovery Codes')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('auth/recovery-codes')
export class RecoveryCodeController {
  constructor(private readonly recoveryCodeService: RecoveryCodeService) {}

  private uid(req: Request): string {
    return (req['user'] as JwtPayload).id;
  }

  @Post('regenerate')
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Regenerar Recovery Codes',
    description:
      'Invalida los códigos anteriores y devuelve un lote nuevo. Los códigos en claro se muestran una única vez.',
  })
  async regenerate(@Req() req: Request, @Ip() ip: string) {
    const codes = await this.recoveryCodeService.regenerate(this.uid(req), ip);
    return { codes };
  }
}

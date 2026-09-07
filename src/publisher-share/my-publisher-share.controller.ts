import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { PublisherShareService } from './publisher-share.service';

/**
 * Publisher's Share que aplica al usuario autenticado cuando publica canciones.
 * La UI del split lo muestra como dato informativo: no afecta el reparto (los
 * coautores humanos siempre suman 100).
 */
@ApiTags("Publisher's Share")
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('users/me/publisher-shares')
export class MyPublisherShareController {
  constructor(private readonly service: PublisherShareService) {}

  @Get()
  @ApiOperation({ summary: "Publisher's Share que se inyecta en mis canciones" })
  resolveMine(@CurrentUser() user: JwtPayload) {
    return this.service.resolveForUser(user.id);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { PublisherCoauthorService } from './publisher-coauthor.service';

/**
 * Coautorías por defecto que aplican al usuario autenticado cuando crea un split.
 * La UI del split las muestra y usa su porcentaje total para calcular el objetivo
 * de suma de los coautores humanos (100 − %publisher).
 */
@ApiTags('Coautoría por defecto de Publisher')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('users/me/publisher-coauthors')
export class MyPublisherCoauthorController {
  constructor(private readonly service: PublisherCoauthorService) {}

  @Get()
  @ApiOperation({ summary: 'Coautorías por defecto de publisher que se inyectan en mis splits' })
  resolveMine(@CurrentUser() user: JwtPayload) {
    return this.service.resolveForUser(user.id);
  }
}

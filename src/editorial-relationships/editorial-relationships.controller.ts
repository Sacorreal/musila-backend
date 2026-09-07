import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { EditorialRelationshipsService } from './editorial-relationships.service';
import { EditorialRelationshipDto } from './dto/editorial-relationship-response.dto';

@ApiTags('Relación Editora-Autor')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('users/me/editorial-relationships')
export class EditorialRelationshipsController {
  constructor(private readonly service: EditorialRelationshipsService) {}

  @Get()
  @ApiOperation({ summary: 'Historial de relaciones editora-autor del usuario autenticado (Flow 3)' })
  getMine(@CurrentUser() user: JwtPayload): Promise<EditorialRelationshipDto[]> {
    return this.service.getMine(user);
  }
}

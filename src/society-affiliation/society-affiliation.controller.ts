import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { SocietyAffiliationService } from './society-affiliation.service';
import { CreateSocietyAffiliationDto } from './dto/create-society-affiliation.dto';
import { UpdateSocietyAffiliationDto } from './dto/update-society-affiliation.dto';
import { EndSocietyAffiliationDto } from './dto/end-society-affiliation.dto';

/**
 * Self-service: el autor gestiona sus propias afiliaciones. La ownership se
 * valida en el service (`assertOwnership` vía `AuthorizationService.checkResource`
 * con scope OWN) — mismo patrón que `PublishingContractsService` (§12: estas
 * capabilities solo se otorgan a autores en esta entrega, no hay controller admin).
 */
@ApiTags('Derechos y Sociedades')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('authors/:authorId/society-affiliations')
export class SocietyAffiliationController {
  constructor(private readonly service: SocietyAffiliationService) {}

  @Get()
  @RequireCapability('rights.society_affiliation.view')
  @ApiOperation({ summary: 'Listar las afiliaciones a sociedades de gestión colectiva de un autor' })
  @ApiParam({ name: 'authorId', description: 'UUID del autor (User)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'No tienes permisos sobre estas afiliaciones' })
  findAll(@Param('authorId', ParseUUIDPipe) authorId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findAllForAuthor(authorId, user);
  }

  @Post()
  @RequireCapability('rights.society_affiliation.manage')
  @ApiOperation({ summary: 'Crear una afiliación a una sociedad de gestión colectiva' })
  @ApiParam({ name: 'authorId', description: 'UUID del autor (User)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Ya existe una afiliación activa con la misma combinación' })
  create(
    @Param('authorId', ParseUUIDPipe) authorId: string,
    @Body() dto: CreateSocietyAffiliationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(authorId, dto, user);
  }

  @Patch(':affiliationId')
  @RequireCapability('rights.society_affiliation.manage')
  @ApiOperation({ summary: 'Actualizar una afiliación' })
  @ApiParam({ name: 'authorId', description: 'UUID del autor (User)' })
  @ApiParam({ name: 'affiliationId', description: 'UUID de la afiliación' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'La afiliación no existe' })
  update(
    @Param('authorId', ParseUUIDPipe) authorId: string,
    @Param('affiliationId', ParseUUIDPipe) affiliationId: string,
    @Body() dto: UpdateSocietyAffiliationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(authorId, affiliationId, dto, user);
  }

  @Post(':affiliationId/end')
  @RequireCapability('rights.society_affiliation.manage')
  @ApiOperation({
    summary: 'Finalizar una afiliación',
    description: 'Nunca elimina el registro: marca `status = ENDED` y fija `validTo`, preservando el historial.',
  })
  @ApiParam({ name: 'authorId', description: 'UUID del autor (User)' })
  @ApiParam({ name: 'affiliationId', description: 'UUID de la afiliación' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'La afiliación no existe' })
  end(
    @Param('authorId', ParseUUIDPipe) authorId: string,
    @Param('affiliationId', ParseUUIDPipe) affiliationId: string,
    @Body() dto: EndSocietyAffiliationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.end(authorId, affiliationId, dto, user);
  }
}

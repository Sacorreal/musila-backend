import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

/**
 * Administración de clientes B2B desde el panel de Musila (§2: el
 * superadmin crea cada organización desde la UI).
 */
@ApiTags('Organizations · Admin Musila')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin/organizations')
export class OrganizationsAdminController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequireCapability('platform.organizations.view')
  @ApiOperation({ summary: 'Listar organizaciones B2B' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':organizationId')
  @RequireCapability('platform.organizations.view')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({ summary: 'Detalle de una organización' })
  findOne(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.organizationsService.findById(organizationId);
  }

  @Post()
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:create')
  @ApiOperation({
    summary: 'Crear una organización B2B',
    description:
      'Crea tenant + organización + trackspace default y, opcionalmente, la subscription B2B y el Organization Admin inicial.',
  })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: JwtPayload) {
    return this.organizationsService.createOrganization(dto, user.id);
  }

  @Patch(':organizationId')
  @RequireCapability('platform.organizations.manage')
  @AuditAction('organizations:update')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({ summary: 'Editar nombre, tipo o estado de una organización' })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganization(organizationId, dto);
  }
}

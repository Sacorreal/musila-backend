import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES, UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InvitePaginationDto } from './dto/invite-pagination.dto';
import { InvitesService } from './invites.service';

@ApiTags('Invitaciones')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // ─── POST /invites ────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JWTAuthGuard, PlansGuard)
  @AllowedPlans(
    ...ADMIN_PLAN_TYPES,
    UserPlanType.PLAN_360,
    UserPlanType.PLAN_DESCUBRIDOR,
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear invitación',
    description:
      'Genera un token seguro, URL y QR de invitación. La invitación expira en 24h.',
  })
  @ApiResponse({ status: 201, description: 'Invitación creada', type: InviteResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async createInvite(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return this.invitesService.createInvite(user.id, dto);
  }

  // ─── Admin routes (deben ir antes de /:token) ────────────────────────────────
  @Get('admin')
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todas las invitaciones (Admin)' })
  async findAllAdminController(@Query() pagination: InvitePaginationDto) {
    return this.invitesService.findAllForAdmin(pagination);
  }

  @Delete('admin/:id')
  @AllowedPlans(...ADMIN_PLAN_TYPES)
  @UseGuards(JWTAuthGuard, PlansGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar (eliminar) una invitación (Admin)' })
  async removeAdminController(@Param('id') id: string) {
    await this.invitesService.removeByAdmin(id);
  }

  // ─── GET /invites/:token ─────────────────────────────────────────────────────
  @Get(':token')
  @ApiOperation({
    summary: 'Validar invitación',
    description:
      'Verifica que el token sea válido, no esté usado y no haya expirado. No requiere autenticación.',
  })
  @ApiParam({
    name: 'token',
    description: 'Token único de invitación (hex 64 chars)',
    example: 'a1b2c3d4e5f6...',
  })
  @ApiResponse({ status: 200, description: 'Invitación válida', type: InviteResponseDto })
  @ApiResponse({ status: 400, description: 'Invitación ya utilizada' })
  @ApiResponse({ status: 404, description: 'Invitación no encontrada' })
  @ApiResponse({ status: 410, description: 'Invitación expirada' })
  async validateInvite(@Param('token') token: string): Promise<InviteResponseDto> {
    return this.invitesService.validateInvite(token);
  }
}

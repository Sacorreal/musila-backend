import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { LegalIdentityGuard } from 'src/legal-identity/guards/legal-identity.guard';

import { SplitService } from './split.service';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { RejectSplitDto } from './dto/reject-split.dto';

@ApiTags('Splits de coautoría')
@UseGuards(JWTAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller()
export class SplitController {
  constructor(private readonly splitService: SplitService) {}

  // ─── POST /tracks/:trackId/splits ───────────────────────────────────────────
  @Post('tracks/:trackId/splits')
  @ApiOperation({ summary: 'Crear el split coautoral de un track' })
  @ApiParam({ name: 'trackId', description: 'UUID del track' })
  @ApiResponse({ status: 201, description: 'Split creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para gestionar el split de este track' })
  @ApiResponse({ status: 404, description: 'El track no existe, o algún coautor no existe' })
  @ApiResponse({ status: 409, description: 'Este track ya tiene un split registrado' })
  async createSplit(
    @Param('trackId') trackId: string,
    @Body() dto: CreateSplitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.splitService.createSplit(trackId, dto, user);
  }

  // ─── GET /tracks/:trackId/splits ────────────────────────────────────────────
  @Get('tracks/:trackId/splits')
  @ApiOperation({ summary: 'Consultar el split coautoral de un track' })
  @ApiParam({ name: 'trackId', description: 'UUID del track' })
  @ApiResponse({ status: 200, description: 'Split encontrado' })
  @ApiResponse({ status: 404, description: 'No hay un split registrado para este track' })
  async getSplitByTrack(@Param('trackId') trackId: string, @CurrentUser() user: JwtPayload) {
    return this.splitService.getSplitByTrack(trackId, user);
  }

  // ─── PUT /splits/:id ─────────────────────────────────────────────────────────
  @Put('splits/:id')
  @ApiOperation({ summary: 'Editar un split rechazado' })
  @ApiParam({ name: 'id', description: 'UUID del split' })
  @ApiResponse({ status: 200, description: 'Split actualizado y reenviado a aprobación' })
  @ApiResponse({ status: 400, description: 'Solo se puede editar un split que fue rechazado' })
  async updateSplit(
    @Param('id') id: string,
    @Body() dto: UpdateSplitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.splitService.updateSplit(id, dto, user);
  }

  // ─── POST /splits/:id/approve ────────────────────────────────────────────────
  @Post('splits/:id/approve')
  @UseGuards(LegalIdentityGuard)
  @ApiOperation({ summary: 'Aprobar la participación como coautor (requiere OTP verificado e identidad legal verificada)' })
  @ApiParam({ name: 'id', description: 'UUID del split' })
  @ApiResponse({ status: 200, description: 'Participación aprobada' })
  @ApiResponse({ status: 403, description: 'Se requiere verificación por código OTP o identidad legal antes de esta acción' })
  async approveSplitAuthor(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.splitService.approveSplitAuthor(id, user);
  }

  // ─── POST /splits/:id/reject ─────────────────────────────────────────────────
  @Post('splits/:id/reject')
  @ApiOperation({ summary: 'Rechazar la participación como coautor' })
  @ApiParam({ name: 'id', description: 'UUID del split' })
  @ApiResponse({ status: 200, description: 'Participación rechazada, split bloqueado' })
  async rejectSplitAuthor(
    @Param('id') id: string,
    @Body() dto: RejectSplitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.splitService.rejectSplitAuthor(id, dto, user);
  }
}

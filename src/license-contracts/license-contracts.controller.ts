import { Body, Controller, Delete, Get, Headers, Ip, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { LicenseContractsService } from './license-contracts.service';
import { UpsertLicenseContractTermsDto } from './dto/upsert-license-contract-terms.dto';
import { RejectLicenseSignatoryDto } from './dto/reject-license-signatory.dto';
import { ConfirmRecordingDto } from './dto/confirm-recording.dto';

@ApiTags('Licencia de Primer Uso')
@UseGuards(JWTAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller()
export class LicenseContractsController {
  constructor(private readonly licenseContractsService: LicenseContractsService) {}

  // ─── POST /requested-tracks/:id/license-contract ───────────────────────────
  @Post('requested-tracks/:id/license-contract')
  @ApiOperation({ summary: 'Crear o actualizar los términos (sección 3.4) del contrato de licencia de primer uso' })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud (RequestedTrack)' })
  async upsertTerms(
    @Param('id') requestedTrackId: string,
    @Body() dto: UpsertLicenseContractTermsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.licenseContractsService.upsertTerms(requestedTrackId, dto, user.id);
  }

  // ─── GET /requested-tracks/:id/license-contract ─────────────────────────────
  @Get('requested-tracks/:id/license-contract')
  @ApiOperation({ summary: 'Consultar el contrato de licencia de primer uso de una solicitud' })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud (RequestedTrack)' })
  async findForRequestedTrack(@Param('id') requestedTrackId: string, @CurrentUser() user: JwtPayload) {
    return this.licenseContractsService.findForRequestedTrack(requestedTrackId, user.id);
  }

  // ─── POST /license-contracts/:id/generate-preview ───────────────────────────
  @Post('license-contracts/:id/generate-preview')
  @ApiOperation({ summary: 'Generar el documento del contrato y habilitar la etapa de firmas' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  async generatePreview(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.licenseContractsService.generatePreview(id, user.id);
  }

  // ─── GET /license-contracts/:id ──────────────────────────────────────────────
  @Get('license-contracts/:id')
  @ApiOperation({ summary: 'Obtener el detalle de un contrato de licencia' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.licenseContractsService.findOne(id, user.id);
  }

  // ─── GET /license-contracts/:id/installments ─────────────────────────────────
  @Get('license-contracts/:id/installments')
  @ApiOperation({ summary: 'Consultar las cuotas del anticipo asociadas al contrato' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  async findInstallments(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.licenseContractsService.findInstallments(id, user.id);
  }

  // ─── POST /license-contracts/:id/signatories/:signatoryId/sign ──────────────
  @Post('license-contracts/:id/signatories/:signatoryId/sign')
  @ApiOperation({ summary: 'Firmar electrónicamente como una de las partes (requiere OTP verificado)' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  @ApiParam({ name: 'signatoryId', description: 'UUID del firmante' })
  @ApiResponse({ status: 403, description: 'Se requiere verificación por código OTP antes de esta acción' })
  async sign(
    @Param('id') id: string,
    @Param('signatoryId') signatoryId: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.licenseContractsService.signAsParty(id, signatoryId, user.id, ip ?? null, userAgent ?? null);
  }

  // ─── POST /license-contracts/:id/signatories/:signatoryId/reject ────────────
  @Post('license-contracts/:id/signatories/:signatoryId/reject')
  @ApiOperation({ summary: 'Rechazar el contrato como una de las partes' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  @ApiParam({ name: 'signatoryId', description: 'UUID del firmante' })
  async reject(
    @Param('id') id: string,
    @Param('signatoryId') signatoryId: string,
    @Body() dto: RejectLicenseSignatoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.licenseContractsService.rejectSignatory(id, signatoryId, user.id, dto);
  }

  // ─── POST /license-contracts/:id/confirm-recording ───────────────────────────
  @Post('license-contracts/:id/confirm-recording')
  @ApiOperation({ summary: 'Confirmar manualmente el ISRC de la grabación tras vencer la vigencia' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  async confirmRecording(
    @Param('id') id: string,
    @Body() dto: ConfirmRecordingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.licenseContractsService.confirmRecording(id, user.id, dto);
  }

  // ─── DELETE /license-contracts/:id ────────────────────────────────────────────
  @Delete('license-contracts/:id')
  @ApiOperation({ summary: 'Cancelar un contrato en borrador' })
  @ApiParam({ name: 'id', description: 'UUID del contrato' })
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.licenseContractsService.cancel(id, user.id);
    return { success: true };
  }
}

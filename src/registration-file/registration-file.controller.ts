import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { RegistrationFileService } from './registration-file.service';
import { RegistrationCompletenessService } from './services/registration-completeness.service';
import { RegistrationFileDocumentService } from './services/registration-file-document.service';
import { RegistrationFileProfileStatusService } from './services/registration-file-profile-status.service';
import { REGISTRATION_PROVIDER, RegistrationProvider } from './domain/registration-provider.interface';
import { CreateRegistrationFileDto } from './dto/create-registration-file.dto';
import { ListRegistrationFilesDto } from './dto/list-registration-files.dto';
import { AddRegistrationFileDocumentDto } from './dto/add-registration-file-document.dto';
import { MarkProfileRegisteredDto } from './dto/mark-profile-registered.dto';
import { UpdateGeneralInfoDto } from './dto/update-general-info.dto';
import { UpdateParticipantsDto } from './dto/update-participants.dto';
import { UpdatePhonogramDto } from './dto/update-phonogram.dto';
import { UpdatePublishingDto } from './dto/update-publishing.dto';
import { UpdateDerivativeWorkDto } from './dto/update-derivative-work.dto';
import { UpdateCommissionedWorkDto } from './dto/update-commissioned-work.dto';
import { UpdateAiUsageDto } from './dto/update-ai-usage.dto';

@ApiTags('Expediente de Registro')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@RequireCapability('catalog.manage')
@Controller()
export class RegistrationFileController {
  constructor(
    private readonly registrationFileService: RegistrationFileService,
    private readonly registrationCompletenessService: RegistrationCompletenessService,
    private readonly registrationFileDocumentService: RegistrationFileDocumentService,
    private readonly registrationFileProfileStatusService: RegistrationFileProfileStatusService,
    @Inject(REGISTRATION_PROVIDER) private readonly registrationProvider: RegistrationProvider,
  ) {}

  // ─── POST /tracks/:trackId/registration-file ───────────────────────────────
  @Post('tracks/:trackId/registration-file')
  @ApiOperation({ summary: 'Crear el expediente de registro de un track' })
  @ApiParam({ name: 'trackId', description: 'UUID del track' })
  @ApiResponse({ status: 201, description: 'Expediente creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Este track ya tiene un expediente de registro' })
  createForTrack(
    @Param('trackId') trackId: string,
    @Body() dto: CreateRegistrationFileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrationFileService.createForTrack(trackId, dto, user);
  }

  // ─── GET /tracks/registration-files/summary ─────────────────────────────────
  @Get('tracks/registration-files/summary')
  @ApiOperation({ summary: 'Estado de expediente por track, en lote (evita N+1 en listados)' })
  @ApiResponse({ status: 200, description: 'Mapa trackId -> { id, caseNumber, status }' })
  async getSummariesForTracks(@Query('trackIds') trackIds: string) {
    const ids = (trackIds ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    const summaries = await this.registrationFileService.getSummariesForTracks(ids);
    return Object.fromEntries(summaries);
  }

  // ─── GET /registration-files ────────────────────────────────────────────────
  @Get('registration-files')
  @ApiOperation({
    summary: 'Listar expedientes con búsqueda, filtros y paginación (admin: todos; autor: los suyos)',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado { data, total, page, limit }' })
  findAll(@Query() query: ListRegistrationFilesDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.findAllForUser(query, user);
  }

  // ─── GET /tracks/:trackId/registration-file ────────────────────────────────
  @Get('tracks/:trackId/registration-file')
  @ApiOperation({ summary: 'Consultar el expediente de registro de un track' })
  @ApiParam({ name: 'trackId', description: 'UUID del track' })
  @ApiResponse({ status: 200, description: 'Expediente encontrado' })
  @ApiResponse({ status: 404, description: 'Este track no tiene un expediente de registro' })
  findByTrack(@Param('trackId') trackId: string, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.findByTrack(trackId, user);
  }

  // ─── GET /registration-file/:id ─────────────────────────────────────────────
  @Get('registration-file/:id')
  @ApiOperation({ summary: 'Obtener un expediente de registro por ID' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.findOne(id, user);
  }

  // ─── PATCH /registration-file/:id/general-info ──────────────────────────────
  @Patch('registration-file/:id/general-info')
  @ApiOperation({ summary: 'Guardar Información General (dominio 1)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updateGeneralInfo(@Param('id') id: string, @Body() dto: UpdateGeneralInfoDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.updateGeneralInfo(id, dto, user);
  }

  // ─── PATCH /registration-file/:id/participants ──────────────────────────────
  @Patch('registration-file/:id/participants')
  @ApiOperation({ summary: 'Reemplazar la lista de Participantes (dominio 2)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updateParticipants(@Param('id') id: string, @Body() dto: UpdateParticipantsDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.updateParticipants(id, dto, user);
  }

  // ─── POST /registration-file/:id/participants/from-split ───────────────────
  @Post('registration-file/:id/participants/from-split')
  @ApiOperation({ summary: 'Autocompletar Participantes desde el split de coautoría del track' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiResponse({ status: 404, description: 'Este track no tiene un split de coautoría registrado' })
  populateParticipantsFromSplit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.populateParticipantsFromSplit(id, user);
  }

  // ─── PATCH /registration-file/:id/phonogram ─────────────────────────────────
  @Patch('registration-file/:id/phonogram')
  @ApiOperation({ summary: 'Guardar Fonograma (dominio 3)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updatePhonogram(@Param('id') id: string, @Body() dto: UpdatePhonogramDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.updatePhonogram(id, dto, user);
  }

  // ─── PATCH /registration-file/:id/publishing ────────────────────────────────
  @Patch('registration-file/:id/publishing')
  @ApiOperation({ summary: 'Guardar Editorial (dominio 4)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updatePublishing(@Param('id') id: string, @Body() dto: UpdatePublishingDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.updatePublishing(id, dto, user);
  }

  // ─── PATCH /registration-file/:id/derivative-work ───────────────────────────
  @Patch('registration-file/:id/derivative-work')
  @ApiOperation({ summary: 'Guardar Obra Derivada (dominio 5)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updateDerivativeWork(@Param('id') id: string, @Body() dto: UpdateDerivativeWorkDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.updateDerivativeWork(id, dto, user);
  }

  // ─── PATCH /registration-file/:id/commissioned-work ─────────────────────────
  @Patch('registration-file/:id/commissioned-work')
  @ApiOperation({ summary: 'Guardar Obra por Encargo (dominio 6)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updateCommissionedWork(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionedWorkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrationFileService.updateCommissionedWork(id, dto, user);
  }

  // ─── PATCH /registration-file/:id/ai-usage ──────────────────────────────────
  @Patch('registration-file/:id/ai-usage')
  @ApiOperation({ summary: 'Guardar Inteligencia Artificial (dominio 7)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  updateAiUsage(@Param('id') id: string, @Body() dto: UpdateAiUsageDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileService.updateAiUsage(id, dto, user);
  }

  // ─── POST /registration-file/:id/documents ──────────────────────────────────
  @Post('registration-file/:id/documents')
  @ApiOperation({ summary: 'Registrar un documento tipificado ya subido a storage (dominio 8)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  addDocument(@Param('id') id: string, @Body() dto: AddRegistrationFileDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.registrationFileDocumentService.addDocument(id, dto, user);
  }

  // ─── DELETE /registration-file/:id/documents/:documentId ────────────────────
  @Delete('registration-file/:id/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un documento del expediente' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiParam({ name: 'documentId', description: 'UUID del documento' })
  async removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.registrationFileDocumentService.removeDocument(id, documentId, user);
  }

  // ─── GET /registration-file/:id/completeness ────────────────────────────────
  @Get('registration-file/:id/completeness')
  @ApiOperation({ summary: 'Calcular completitud, errores y advertencias del expediente (Validation Engine)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  getCompleteness(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.registrationCompletenessService.getCompleteness(id, user);
  }

  // ─── GET /registration-file/:id/checklist ───────────────────────────────────
  @Get('registration-file/:id/checklist')
  @ApiOperation({ summary: 'Checklist inteligente del expediente (✔ / ⚠)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  getChecklist(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.registrationCompletenessService.getChecklist(id, user);
  }

  // ─── POST /registration-file/:id/ready-for-submission ───────────────────────
  @Post('registration-file/:id/ready-for-submission')
  @ApiOperation({ summary: 'Marcar el expediente como Listo para presentar (exige 100% sin errores)' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiResponse({ status: 400, description: 'El expediente todavía no está listo — incluye el detalle de errores pendientes' })
  markReadyForSubmission(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.registrationProvider.markReadyForSubmission(id, user);
  }

  // ─── POST /registration-file/:id/profile-status/:profileKey/mark-submitted ──
  @Post('registration-file/:id/profile-status/:profileKey/mark-submitted')
  @ApiOperation({ summary: 'Marcar un perfil (SAYCO/DNDA) como Presentado ante la entidad' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiParam({ name: 'profileKey', description: 'SAYCO | DNDA' })
  markProfileSubmitted(
    @Param('id') id: string,
    @Param('profileKey') profileKey: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrationFileProfileStatusService.markSubmitted(id, profileKey, user);
  }

  // ─── POST /registration-file/:id/profile-status/:profileKey/mark-registered ─
  @Post('registration-file/:id/profile-status/:profileKey/mark-registered')
  @ApiOperation({ summary: 'Marcar un perfil (SAYCO/DNDA) como Registrado, con su número de registro oficial' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiParam({ name: 'profileKey', description: 'SAYCO | DNDA' })
  markProfileRegistered(
    @Param('id') id: string,
    @Param('profileKey') profileKey: string,
    @Body() dto: MarkProfileRegisteredDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.registrationFileProfileStatusService.markRegistered(id, profileKey, dto, user);
  }

  // ─── GET /registration-file/:id/download/pdf ────────────────────────────────
  @Get('registration-file/:id/download/pdf')
  @ApiOperation({ summary: 'Descargar el PDF resumen del expediente' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiResponse({ status: 200, description: 'PDF del expediente', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'El PDF aún no ha sido generado' })
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.registrationFileService.downloadPdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  // ─── GET /registration-file/:id/download/zip ────────────────────────────────
  @Get('registration-file/:id/download/zip')
  @ApiOperation({ summary: 'Descargar el ZIP completo del expediente' })
  @ApiParam({ name: 'id', description: 'UUID del expediente' })
  @ApiResponse({ status: 200, description: 'ZIP del expediente', content: { 'application/zip': {} } })
  @ApiResponse({ status: 404, description: 'El ZIP aún no ha sido generado' })
  async downloadZip(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.registrationFileService.downloadZip(id, user);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }
}

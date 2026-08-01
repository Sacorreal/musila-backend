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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AllowedRoles } from 'src/users/decorators/allowed-roles.decorator';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { MusicRole } from 'src/users/entities/music-role.enum';
import { MusicRolesGuard } from 'src/users/guards/music-roles.guard';
import { AccessLogPaginationDto } from './dto/access-log-pagination.dto';
import { AuthorizeRecipientDto } from './dto/authorize-recipient.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareManageGuard } from './guards/share-manage.guard';
import { SharingService } from './sharing.service';

@ApiTags('Compartir')
@Controller('sharing')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post('profile')
  @UseGuards(JWTAuthGuard, MusicRolesGuard)
  @AllowedRoles(MusicRole.COMPOSITOR, MusicRole.CANTAUTOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Genera (o retorna, si ya existe) el enlace público del perfil propio' })
  createProfileShareLink(@CurrentUser() user: JwtPayload, @Body() dto: CreateShareLinkDto) {
    return this.sharingService.createProfileShareLink(user.id, dto);
  }

  @Post('playlists/:playlistId')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Genera (o retorna) el enlace de una playlist propia' })
  createPlaylistShareLink(
    @CurrentUser() user: JwtPayload,
    @Param('playlistId') playlistId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.sharingService.createPlaylistShareLink(user.id, playlistId, dto);
  }

  @Post('tracks/:trackId')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Genera (o retorna) el enlace de un track (cualquier autor)' })
  createTrackShareLink(
    @CurrentUser() user: JwtPayload,
    @Param('trackId') trackId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.sharingService.createTrackShareLink(user.id, trackId, dto);
  }

  @Get('mine')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lista los enlaces de compartir creados por el usuario autenticado' })
  listMyShareLinks(@CurrentUser() user: JwtPayload) {
    return this.sharingService.listMyShareLinks(user.id);
  }

  @Delete(':shareLinkId')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoca un enlace de compartir' })
  revokeShareLink(@Param('shareLinkId') shareLinkId: string) {
    return this.sharingService.revokeShareLink(shareLinkId);
  }

  @Post(':shareLinkId/recipients')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Autoriza a un usuario (por su Musila Creator ID) a acceder al enlace' })
  @ApiResponse({ status: 404, description: 'No existe ningún usuario con ese Musila Creator ID' })
  authorizeRecipient(
    @CurrentUser() user: JwtPayload,
    @Param('shareLinkId') shareLinkId: string,
    @Body() dto: AuthorizeRecipientDto,
  ) {
    return this.sharingService.authorizeRecipient(shareLinkId, dto, user);
  }

  @Get(':shareLinkId/recipients')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lista los usuarios autorizados de un enlace' })
  listAuthorizedRecipients(@Param('shareLinkId') shareLinkId: string) {
    return this.sharingService.listAuthorizedRecipients(shareLinkId);
  }

  @Delete(':shareLinkId/recipients/:recipientId')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoca el acceso de un destinatario autorizado' })
  revokeRecipient(
    @CurrentUser() user: JwtPayload,
    @Param('shareLinkId') shareLinkId: string,
    @Param('recipientId') recipientId: string,
  ) {
    return this.sharingService.revokeRecipient(shareLinkId, recipientId, user);
  }

  // No se usa un guard de autorización aquí a propósito: un CanActivate solo puede
  // aceptar/rechazar la request (403 genérico), y el frontend necesita el motivo
  // exacto (expirado/revocado/no autorizado) para renderizar la pantalla correcta.
  // La decisión de conceder o denegar vive en el servicio y siempre responde 200.
  @Get('access/:token')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'token', description: 'Token del enlace de compartir' })
  @ApiOperation({
    summary: 'Valida el acceso del usuario autenticado a un enlace compartido',
    description:
      'El Creator ID usado en la validación es siempre el de la cuenta autenticada (JWT), nunca uno provisto manualmente. Responde 200 con {granted, reason} incluso cuando el acceso es denegado.',
  })
  validateAccess(@CurrentUser() user: JwtPayload, @Param('token') token: string, @Req() req: Request) {
    return this.sharingService.validateAccess(token, user, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':shareLinkId/access-log')
  @UseGuards(JWTAuthGuard, ShareManageGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Auditoría paginada de accesos (autorizados y no autorizados) a un enlace' })
  listAccessLog(@Param('shareLinkId') shareLinkId: string, @Query() pagination: AccessLogPaginationDto) {
    return this.sharingService.listAccessLog(shareLinkId, pagination);
  }
}

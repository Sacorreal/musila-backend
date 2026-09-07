import { Controller, Get, ParseUUIDPipe, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CertificatesService } from './certificates.service';
import { CertificateStatusResponseDto } from './dto/certificate-status-response.dto';

@ApiTags('Certificados de Autoría')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('tracks/:trackId/certificate')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar el estado del Certificado de Autoría de un track' })
  @ApiParam({ name: 'trackId', description: 'ID del track (UUID)' })
  @ApiResponse({ status: 200, type: CertificateStatusResponseDto })
  @ApiResponse({ status: 403, description: 'El usuario no es autor del track' })
  @ApiResponse({ status: 404, description: 'Track no encontrado' })
  async getStatus(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CertificateStatusResponseDto> {
    return this.certificatesService.getStatus(trackId, user);
  }

  @Get('download')
  @ApiOperation({ summary: 'Descargar el PDF del Certificado de Autoría' })
  @ApiParam({ name: 'trackId', description: 'ID del track (UUID)' })
  @ApiResponse({ status: 200, description: 'PDF del certificado', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Certificado aún no disponible' })
  @ApiResponse({ status: 409, description: 'El archivo no se encontró en storage; regenerar' })
  async download(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.certificatesService.downloadBuffer(trackId, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Post('regenerate')
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @ApiOperation({ summary: 'Regenerar el Certificado de Autoría (self-service, cuando el archivo no está en storage)' })
  @ApiParam({ name: 'trackId', description: 'ID del track (UUID)' })
  @ApiResponse({ status: 201, type: CertificateStatusResponseDto })
  async regenerate(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CertificateStatusResponseDto> {
    await this.certificatesService.regenerate(trackId, user);
    return this.certificatesService.getStatus(trackId, user);
  }
}

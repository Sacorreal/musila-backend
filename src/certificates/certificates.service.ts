import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorizationService } from 'src/authorization/authorization.service';
import { User } from 'src/users/entities/user.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { EmailService } from 'src/shared/mail/services/email.service';
import { PdfGeneratorService } from 'src/shared/pdf/services/pdf-generator.service';
import { PdfConfigService } from 'src/shared/pdf/services/pdf-config.service';
import { withTimeout } from 'src/shared/utils/with-timeout.util';
import { retryWithBackoff } from 'src/shared/utils/retry-with-backoff.util';

import { Certificate, CertificateTrackSnapshot } from './entities/certificate.entity';
import { CertificateRecipient } from './entities/certificate-recipient.entity';
import { CertificateStatus } from './entities/certificate-status.enum';
import { CertificateRecipientStatus } from './entities/certificate-recipient-status.enum';
import { CertificateStatusResponseDto } from './dto/certificate-status-response.dto';
import { buildCertificatePdfInput } from './templates/certificate-pdf-input.builder';
import { generateCertificateRegistryNumber } from './utils/certificate-registry-number.util';
import {
  CERTIFICATE_EMAIL_RETRY,
  CERTIFICATE_GENERATION_RETRY,
  CERTIFICATE_TIMEOUTS,
} from './constants/certificate.constants';

function fullNameOf(user: User): string {
  return [user.name, user.secondName, user.lastName, user.secondLastName].filter(Boolean).join(' ');
}

function hasCompleteIdentificationData(user: User): boolean {
  return !!(user.typeCitizenID && user.citizenID && user.username);
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate) private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(CertificateRecipient) private readonly recipientRepo: Repository<CertificateRecipient>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly pdfConfigService: PdfConfigService,
    private readonly storageService: StorageService,
    private readonly emailService: EmailService,
    private readonly eventBus: EventBusService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Genera (o regenera) el Certificado de Autoría de un track: construye el
   * snapshot de destinatarios y de la obra, arma el PDF, lo sube al storage
   * y persiste el resultado. Idempotente por track (upsert sobre el
   * `Certificate` existente). Nunca lanza para el flujo automático (Flow 1
   * exige que la publicación de la canción siga siendo válida aunque el
   * certificado falle) — los fallos se registran en la propia entidad y se
   * comunican vía el evento `certificate.generation.failed`.
   */
  async generateForTrack(trackId: string, requestedByUserId?: string): Promise<Certificate> {
    const track = await this.trackRepo.findOne({ where: { id: trackId }, relations: ['genre', 'authors'] });
    if (!track) {
      throw new NotFoundException('El track no existe');
    }

    const trackSnapshot: CertificateTrackSnapshot = {
      trackId: track.id,
      title: track.title,
      genre: track.genre?.genre ?? '—',
      ritmo: track.ritmo ?? null,
      publishedAt: track.createdAt.toISOString(),
    };

    let certificate = await this.certificateRepo.findOne({ where: { track: { id: trackId } } });
    if (!certificate) {
      certificate = this.certificateRepo.create({
        registryNumber: await this.generateUniqueRegistryNumber(),
        track,
        trackSnapshot,
        requestedByUserId: requestedByUserId ?? null,
        status: CertificateStatus.PENDING,
      });
    } else {
      certificate.trackSnapshot = trackSnapshot;
      certificate.status = CertificateStatus.PENDING;
      certificate.errorMessage = null;
    }
    certificate = await this.certificateRepo.save(certificate);

    const recipientEntities = await this.rebuildRecipients(certificate, track.authors ?? []);

    try {
      const upload = await withTimeout(
        retryWithBackoff(() => this.buildAndUploadPdf(certificate, recipientEntities, trackSnapshot), {
          retries: CERTIFICATE_GENERATION_RETRY.MAX_RETRIES,
          baseDelayMs: CERTIFICATE_GENERATION_RETRY.BASE_DELAY_MS,
          maxDelayMs: CERTIFICATE_GENERATION_RETRY.MAX_DELAY_MS,
          onRetry: (attempt, error) => {
            certificate.retryCount = attempt;
            this.logger.warn(
              `Reintento ${attempt} de generación del certificado para track ${trackId}: ${(error as Error).message}`,
            );
          },
        }),
        CERTIFICATE_TIMEOUTS.GENERATION_TOTAL_MS,
        `La generación del certificado para el track ${trackId} superó el tiempo límite`,
      );

      certificate.status = CertificateStatus.ISSUED;
      certificate.documentKey = upload.key;
      certificate.documentUrl = upload.publicUrl;
      certificate.issuedAt = new Date();
      certificate.errorMessage = null;
      await this.certificateRepo.save(certificate);

      const eligibleRecipients = recipientEntities.filter(
        (r) => r.status !== CertificateRecipientStatus.SKIPPED_INCOMPLETE_DATA,
      );
      const incompleteRecipients = recipientEntities.filter(
        (r) => r.status === CertificateRecipientStatus.SKIPPED_INCOMPLETE_DATA,
      );
      const requestedByUser = track.authors?.find((a) => a.id === requestedByUserId);

      this.eventBus.emit('certificate.issued', {
        certificateId: certificate.id,
        trackId,
        trackTitle: trackSnapshot.title,
        registryNumber: certificate.registryNumber,
        recipients: eligibleRecipients.map((r) => ({ userId: r.userId, name: r.fullName, email: r.email })),
        incompleteRecipients: incompleteRecipients.map((r) => ({ userId: r.userId, name: r.fullName })),
        requestedByUserId: requestedByUserId ?? undefined,
        requestedByUserEmail: requestedByUser?.email,
      });

      return certificate;
    } catch (error) {
      certificate.status = CertificateStatus.FAILED;
      certificate.retryCount = CERTIFICATE_GENERATION_RETRY.MAX_RETRIES + 1;
      certificate.errorMessage = (error as Error).message;
      await this.certificateRepo.save(certificate);

      this.logger.error(`Generación de certificado agotó reintentos para track ${trackId}`, error as Error);

      const primaryUser = track.authors?.find((a) => a.id === requestedByUserId) ?? track.authors?.[0];
      this.eventBus.emit('certificate.generation.failed', {
        trackId,
        trackTitle: trackSnapshot.title,
        requestedByUserId: requestedByUserId ?? undefined,
        primaryUserEmail: primaryUser?.email,
        attempts: CERTIFICATE_GENERATION_RETRY.MAX_RETRIES + 1,
        lastError: (error as Error).message,
      });

      return certificate;
    }
  }

  /**
   * Envía el PDF adjunto a cada destinatario `PENDING`, con reintento con
   * backoff exponencial por destinatario (Flow 2). Los destinatarios
   * `SKIPPED_INCOMPLETE_DATA` (Flow 4) nunca se procesan aquí.
   */
  async sendEmails(certificateId: string): Promise<void> {
    const certificate = await this.certificateRepo.findOne({
      where: { id: certificateId },
      relations: ['recipients'],
    });
    if (!certificate || certificate.status !== CertificateStatus.ISSUED || !certificate.documentKey) {
      return;
    }

    const pdfBuffer = await this.storageService.downloadObject(certificate.documentKey);
    const base64Content = pdfBuffer.toString('base64');
    const filename = `certificado-autoria-${certificate.registryNumber}.pdf`;

    const pendingRecipients = certificate.recipients.filter((r) => r.status === CertificateRecipientStatus.PENDING);

    for (const recipient of pendingRecipients) {
      try {
        await retryWithBackoff(
          () =>
            this.emailService.sendCertificateIssuedEmail(
              recipient.email,
              {
                recipientName: recipient.fullName,
                trackTitle: certificate.trackSnapshot.title,
                registryNumber: certificate.registryNumber,
                certificateUrl: certificate.documentUrl ?? '',
              },
              [{ filename, content: base64Content }],
            ),
          {
            retries: CERTIFICATE_EMAIL_RETRY.MAX_RETRIES,
            baseDelayMs: CERTIFICATE_EMAIL_RETRY.BASE_DELAY_MS,
            maxDelayMs: CERTIFICATE_EMAIL_RETRY.MAX_DELAY_MS,
            onRetry: (attempt) => {
              recipient.sendAttempts = attempt;
            },
          },
        );
        recipient.status = CertificateRecipientStatus.SENT;
        recipient.sentAt = new Date();
        recipient.lastError = null;
      } catch (error) {
        recipient.status = CertificateRecipientStatus.FAILED;
        recipient.lastError = (error as Error).message;
        recipient.sendAttempts = CERTIFICATE_EMAIL_RETRY.MAX_RETRIES + 1;
        this.logger.error(`No se pudo enviar el certificado a ${recipient.email}`, error as Error);
      }
      await this.recipientRepo.save(recipient);
    }
  }

  async getStatus(trackId: string, user: JwtPayload): Promise<CertificateStatusResponseDto> {
    await this.authorizeTrackAccess(trackId, user);
    const certificate = await this.certificateRepo.findOne({ where: { track: { id: trackId } } });

    if (!certificate) {
      return { status: CertificateStatus.PENDING, registryNumber: null, issuedAt: null, downloadAvailable: false };
    }

    const downloadAvailable =
      certificate.status === CertificateStatus.ISSUED &&
      !!certificate.documentKey &&
      (await this.storageService.fileExists(certificate.documentKey));

    return {
      status: certificate.status,
      registryNumber: certificate.registryNumber,
      issuedAt: certificate.issuedAt,
      downloadAvailable,
    };
  }

  async downloadBuffer(trackId: string, user: JwtPayload): Promise<{ buffer: Buffer; filename: string }> {
    await this.authorizeTrackAccess(trackId, user);
    const certificate = await this.certificateRepo.findOne({ where: { track: { id: trackId } } });

    if (!certificate || certificate.status !== CertificateStatus.ISSUED || !certificate.documentKey) {
      throw new NotFoundException('El certificado aún no está disponible para descarga');
    }

    const exists = await this.storageService.fileExists(certificate.documentKey);
    if (!exists) {
      throw new ConflictException('El archivo del certificado no se encontró en el almacenamiento; puedes regenerarlo');
    }

    const buffer = await this.storageService.downloadObject(certificate.documentKey);
    return { buffer, filename: `certificado-autoria-${certificate.registryNumber}.pdf` };
  }

  async regenerate(trackId: string, user: JwtPayload): Promise<Certificate> {
    await this.authorizeTrackAccess(trackId, user);
    return this.generateForTrack(trackId, user.id);
  }

  /**
   * Batch liviano (sin `fileExists` contra storage) para listados como
   * "Mis canciones" — evita N+1 requests de estado por fila.
   */
  async getStatusesForTracks(trackIds: string[]): Promise<Map<string, CertificateStatus>> {
    if (!trackIds.length) return new Map();

    const certificates = await this.certificateRepo.find({
      where: { track: { id: In(trackIds) } },
      relations: ['track'],
    });

    return new Map(certificates.map((c) => [c.track.id, c.status]));
  }

  private async authorizeTrackAccess(trackId: string, user: JwtPayload): Promise<Track> {
    const track = await this.trackRepo.findOne({ where: { id: trackId }, relations: ['authors'] });
    if (!track) throw new NotFoundException('El track no existe');

    const isAuthor = track.authors?.some((a) => a.id === user.id);
    if (!isAuthor) {
      const decision = await this.authorizationService.check(
        { userId: user.id },
        { caps: ['platform.legal.certificates.view'], operator: 'AND' },
      );
      if (!decision.allowed) {
        throw new ForbiddenException('No tienes permiso para acceder al certificado de este track');
      }
    }

    return track;
  }

  private async rebuildRecipients(certificate: Certificate, authors: User[]): Promise<CertificateRecipient[]> {
    await this.recipientRepo.delete({ certificate: { id: certificate.id } });

    const entities = authors.map((author) =>
      this.recipientRepo.create({
        certificate,
        userId: author.id,
        fullName: fullNameOf(author),
        email: author.email,
        typeCitizenId: author.typeCitizenID ?? null,
        citizenId: author.citizenID ?? null,
        username: author.username ?? null,
        status: hasCompleteIdentificationData(author)
          ? CertificateRecipientStatus.PENDING
          : CertificateRecipientStatus.SKIPPED_INCOMPLETE_DATA,
      }),
    );

    return this.recipientRepo.save(entities);
  }

  private async buildAndUploadPdf(
    certificate: Certificate,
    recipients: CertificateRecipient[],
    trackSnapshot: CertificateTrackSnapshot,
  ): Promise<{ key: string; publicUrl: string }> {
    const sealImageUrl = this.pdfConfigService.getHeaderConfig().logoUrl;
    const pdfInput = buildCertificatePdfInput({
      registryNumber: certificate.registryNumber,
      recipients,
      trackSnapshot,
      sealImageUrl,
    });
    const buffer = await this.pdfGeneratorService.generate(pdfInput);

    return this.storageService.uploadBuffer({
      key: `certificates/${trackSnapshot.trackId}/${certificate.id}.pdf`,
      buffer,
      contentType: 'application/pdf',
    });
  }

  private async generateUniqueRegistryNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCertificateRegistryNumber();
      const collisions = await this.certificateRepo.count({ where: { registryNumber: candidate } });
      if (collisions === 0) return candidate;
    }
    throw new InternalServerErrorException('No se pudo generar un ID de registro único para el certificado');
  }
}

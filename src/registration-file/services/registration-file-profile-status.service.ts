import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { EventBusService } from 'src/shared/events/event-bus.service';

import { RegistrationFile } from '../entities/registration-file.entity';
import { RegistrationFileProfileStatus } from '../entities/registration-file-profile-status.entity';
import { RegistrationFileProfileSubmissionStatus } from '../entities/registration-file-profile-submission-status.enum';
import { REGISTRATION_PROFILE_KEYS, RegistrationProfileKey } from '../entities/registration-profile-key.type';
import { RegistrationFileService } from '../registration-file.service';
import { MarkProfileRegisteredDto } from '../dto/mark-profile-registered.dto';

/**
 * Estado de presentación/registro de un perfil activo (SAYCO/DNDA), llevado
 * de forma independiente del `RegistrationFile.status` (que solo mide
 * preparación) — un mismo expediente puede tener SAYCO ya "Presentado" y
 * DNDA todavía pendiente, cada uno con su propio número de registro oficial.
 */
@Injectable()
export class RegistrationFileProfileStatusService {
  constructor(
    @InjectRepository(RegistrationFileProfileStatus)
    private readonly profileStatusRepository: Repository<RegistrationFileProfileStatus>,
    private readonly registrationFileService: RegistrationFileService,
    private readonly eventBus: EventBusService,
  ) {}

  async markSubmitted(
    registrationFileId: string,
    profileKey: string,
    user: JwtPayload,
  ): Promise<RegistrationFileProfileStatus> {
    const registrationFile = await this.registrationFileService.findOne(registrationFileId, user);
    this.assertValidProfileKey(profileKey);
    this.assertProfileActive(registrationFile, profileKey);

    const profileStatus = await this.findOrCreate(registrationFile, profileKey);
    profileStatus.status = RegistrationFileProfileSubmissionStatus.PRESENTADO;
    profileStatus.submittedAt = new Date();

    const saved = await this.profileStatusRepository.save(profileStatus);
    this.emitChanged(saved);
    return saved;
  }

  async markRegistered(
    registrationFileId: string,
    profileKey: string,
    dto: MarkProfileRegisteredDto,
    user: JwtPayload,
  ): Promise<RegistrationFileProfileStatus> {
    const registrationFile = await this.registrationFileService.findOne(registrationFileId, user);
    this.assertValidProfileKey(profileKey);
    this.assertProfileActive(registrationFile, profileKey);

    const profileStatus = await this.findOrCreate(registrationFile, profileKey);
    profileStatus.status = RegistrationFileProfileSubmissionStatus.REGISTRADO;
    profileStatus.registeredAt = new Date();
    profileStatus.officialRegistryNumber = dto.officialRegistryNumber;
    if (dto.notes !== undefined) profileStatus.notes = dto.notes;

    const saved = await this.profileStatusRepository.save(profileStatus);
    this.emitChanged(saved);
    return saved;
  }

  private assertValidProfileKey(profileKey: string): asserts profileKey is RegistrationProfileKey {
    if (!REGISTRATION_PROFILE_KEYS.includes(profileKey as RegistrationProfileKey)) {
      throw new BadRequestException(
        `Perfil "${profileKey}" no soportado. Valores válidos: ${REGISTRATION_PROFILE_KEYS.join(', ')}`,
      );
    }
  }

  private assertProfileActive(registrationFile: RegistrationFile, profileKey: RegistrationProfileKey): void {
    if (!registrationFile.activeProfileKeys.includes(profileKey)) {
      throw new BadRequestException(`El perfil "${profileKey}" no está activo en este expediente`);
    }
  }

  private async findOrCreate(
    registrationFile: RegistrationFile,
    profileKey: RegistrationProfileKey,
  ): Promise<RegistrationFileProfileStatus> {
    const existing = await this.profileStatusRepository.findOne({
      where: { registrationFile: { id: registrationFile.id }, profileKey },
    });
    if (existing) return existing;

    return this.profileStatusRepository.create({
      registrationFile,
      profileKey,
      status: RegistrationFileProfileSubmissionStatus.PENDIENTE,
    });
  }

  private emitChanged(profileStatus: RegistrationFileProfileStatus): void {
    this.eventBus.emit('registration-file.profile-status-changed', {
      registrationFileId: profileStatus.registrationFile.id,
      profileKey: profileStatus.profileKey,
      status: profileStatus.status,
      officialRegistryNumber: profileStatus.officialRegistryNumber,
    });
  }
}

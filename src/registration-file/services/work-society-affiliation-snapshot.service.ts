import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SocietyAffiliationService } from 'src/society-affiliation/society-affiliation.service';
import { RegistrationFileParticipant } from '../entities/registration-file-participant.entity';
import { WorkSocietyAffiliationSnapshot } from '../entities/work-society-affiliation-snapshot.entity';

/**
 * Sincroniza `WorkSocietyAffiliationSnapshot` cuando se reemplaza la lista de
 * participantes de un expediente (§8 del requerimiento, aditivo — no toca
 * `RegistrationFileParticipant`). Solo captura afiliaciones para participantes
 * vinculados a un `SplitAuthor` con `User` resuelto (coautores con cuenta
 * Musila); los participantes externos no generan snapshot.
 */
@Injectable()
export class WorkSocietyAffiliationSnapshotService {
  constructor(
    @InjectRepository(RegistrationFileParticipant)
    private readonly participantRepository: Repository<RegistrationFileParticipant>,
    @InjectRepository(WorkSocietyAffiliationSnapshot)
    private readonly snapshotRepository: Repository<WorkSocietyAffiliationSnapshot>,
    private readonly societyAffiliationService: SocietyAffiliationService,
  ) {}

  async syncForParticipants(registrationFileId: string, participants: RegistrationFileParticipant[]): Promise<void> {
    if (participants.length === 0) return;

    const participantsWithAuthor = await this.participantRepository.find({
      where: { id: In(participants.map((p) => p.id)) },
      relations: ['splitAuthor', 'splitAuthor.user'],
    });

    const authorIds = new Set(
      participantsWithAuthor
        .map((p) => p.splitAuthor?.user?.id)
        .filter((id): id is string => !!id),
    );

    const affiliationsByAuthor = new Map(
      await Promise.all(
        [...authorIds].map(async (authorId) => [authorId, await this.societyAffiliationService.findActiveForAuthor(authorId)] as const),
      ),
    );

    const snapshots: WorkSocietyAffiliationSnapshot[] = [];
    for (const participant of participantsWithAuthor) {
      const authorId = participant.splitAuthor?.user?.id;
      if (!authorId) continue;

      const affiliations = affiliationsByAuthor.get(authorId) ?? [];
      for (const affiliation of affiliations) {
        snapshots.push(
          this.snapshotRepository.create({
            registrationFileId,
            registrationFileParticipantId: participant.id,
            authorId,
            societyAffiliationId: affiliation.id,
            societyId: affiliation.collectiveManagementSocietyId,
            societyName: affiliation.collectiveManagementSociety.officialName,
            cisacSocietyId: affiliation.collectiveManagementSociety.cisacSocietyId,
            rightsType: affiliation.rightsType,
            territory: affiliation.territory,
            ipiNameNumber: affiliation.ipiNameNumber,
            membershipNumber: affiliation.membershipNumber,
          }),
        );
      }
    }

    if (snapshots.length > 0) {
      await this.snapshotRepository.save(snapshots);
    }
  }
}

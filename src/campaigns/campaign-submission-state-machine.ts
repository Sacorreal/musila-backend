import { CampaignSubmissionStatus } from './entities/campaign-submission-status.enum';

/**
 * Transiciones válidas de una postulación. Fuente única de verdad: cualquier
 * cambio de estado debe validarse contra este mapa (`CampaignsService`).
 * `LICENSED` solo se alcanza vía el listener del evento
 * `license.contract.fulfilled`, nunca por una acción manual del sello.
 */
export const CAMPAIGN_SUBMISSION_TRANSITIONS: Record<
  CampaignSubmissionStatus,
  readonly CampaignSubmissionStatus[]
> = {
  [CampaignSubmissionStatus.PENDING]: [
    CampaignSubmissionStatus.SELECTED,
    CampaignSubmissionStatus.DISCARDED,
  ],
  [CampaignSubmissionStatus.SELECTED]: [CampaignSubmissionStatus.LICENSED],
  [CampaignSubmissionStatus.DISCARDED]: [],
  [CampaignSubmissionStatus.LICENSED]: [],
};

export function canTransitionSubmission(
  from: CampaignSubmissionStatus,
  to: CampaignSubmissionStatus,
): boolean {
  return CAMPAIGN_SUBMISSION_TRANSITIONS[from]?.includes(to) ?? false;
}

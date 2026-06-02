import { LicenseType } from "src/requested-tracks/entities/license-type.enum";

export interface EmailConfig {
  apiKey: string;
  defaultFrom: string;
  defaultReplyTo?: string;
}




export interface SendEmailOptions<
  T extends keyof EmailTemplateMap = keyof EmailTemplateMap,
> {
  to: string | string[];
  subject?: string;
  templateId: T;
  variables: EmailTemplateMap[T];
}


export interface EmailTemplateMap {
  'invite-template-id': {
    invitedByName: string;
    inviteUrl: string;
  };

  'send-invitation-guest': {
    inviterName: string;
    guestName: string;
    UrlInvitationGuest: string;
  };

  'password-reset': {
    name: string;
    resetUrl: string;
  };

  'password-changed': {
    name: string;
  };

  'send-request-track': {
    trackTitle: string,
    ownerEmail: string,
    requesterEmail: string,
    licenseType: LicenseType,
    urlTrackRequest: string

  };

  'update-request-track-status': {
    trackTitle: string;
    requesterEmail: string;
    status: string;
    urlTrackRequest: string;
  };

  'plan-expiry-warning': {
    userName: string;
    daysRemaining: number;
    planName: string;
    renewUrl: string;
  };
}
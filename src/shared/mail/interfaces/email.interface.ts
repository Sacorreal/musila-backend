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

  'password-reset-template-id': {
    name: string;
    resetUrl: string;
  };

  'password-changed-template-id': {
    name: string;
  };

  'send-request-track': {
    trackTitle: string,
    ownerEmail: string,
    requesterEmail: string,
    licenseType: LicenseType,
    urlTrackRequest: string

  }
}
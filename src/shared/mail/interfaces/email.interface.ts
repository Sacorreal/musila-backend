import { LicenseType } from "src/requested-tracks/entities/license-type.enum";

export interface EmailConfig {
  apiKey: string;
  defaultFrom: string;
  defaultReplyTo?: string;
}




export interface EmailAttachment {
  filename: string;
  /** Contenido en base64. */
  content: string;
}

export interface SendEmailOptions<
  T extends keyof EmailTemplateMap = keyof EmailTemplateMap,
> {
  to: string | string[];
  subject?: string;
  templateId: T;
  variables: EmailTemplateMap[T];
  attachments?: EmailAttachment[];
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

  'verify-email': {
    name: string;
    verifyUrl: string;
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

  'subscription-renewed': {
    userName: string;
    periodLabel: string;
    newExpiry?: string;
    accountUrl: string;
  };

  'subscription-renewal-failed': {
    userName: string;
    billingUrl: string;
  };

  'otp-code': {
    code: string;
    purposeLabel: string;
    expiresInMinutes: number;
  };

  'split-coauthor-invitation': {
    coauthorName: string;
    trackTitle: string;
    adminName: string;
    percentage: number;
    role: string;
    splitDetailUrl: string;
  };

  'split-completed': {
    adminName: string;
    trackTitle: string;
    splitDetailUrl: string;
  };

  'split-rejected': {
    adminName: string;
    trackTitle: string;
    coauthorName: string;
    rejectionReason: string;
    splitDetailUrl: string;
  };

  'license-collection-payment-link': {
    userName: string;
    trackTitle: string;
    amount: string;
    dueDate: string;
    paymentUrl: string;
  };

  'license-contract-signature-request': {
    signerName: string;
    trackTitle: string;
    roleLabel: string;
    signUrl: string;
  };

  'license-contract-signed-copy': {
    recipientName: string;
    trackTitle: string;
    documentUrl: string;
  };

  'license-contract-rejected': {
    ownerName: string;
    trackTitle: string;
    rejectedByName: string;
    reason: string;
    contractUrl: string;
  };

  'track-certificate-issued': {
    recipientName: string;
    trackTitle: string;
    registryNumber: string;
    certificateUrl: string;
  };

  'track-certificate-pending': {
    userName: string;
    trackTitle: string;
  };

  'track-certificate-coauthor-incomplete': {
    userName: string;
    trackTitle: string;
    incompleteCoauthorNames: string;
  };

  'track-certificate-tech-alert': {
    trackId: string;
    trackTitle: string;
    attempts: number;
    lastError: string;
  };

  'wallet-withdrawal-requested-admin': {
    adminName: string;
    userName: string;
    userEmail: string;
    amount: string;
    withdrawalUrl: string;
  };

  'wallet-withdrawal-paid': {
    userName: string;
    amount: string;
    paidAt: string;
    accountUrl: string;
  };

  'wallet-withdrawal-rejected': {
    userName: string;
    amount: string;
    reason: string;
    accountUrl: string;
  };
}
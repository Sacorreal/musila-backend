import { EMAIL_CONFIG } from '../constants/email.constants';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import {
  EmailTemplateMap,
  SendEmailOptions,
} from '../interfaces/email.interface';
import type { EmailAttachment, EmailConfig } from '../interfaces/email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(@Inject(EMAIL_CONFIG) private readonly config: EmailConfig) {
    this.resend = new Resend(this.config.apiKey);
  }

  async sendEmail<T extends keyof EmailTemplateMap>(
    options: SendEmailOptions<T>,
  ): Promise<void> {
    try {
      const { to, templateId, variables, attachments } = options;

      await this.resend.emails.send({
        to,
        template: {
          id: templateId,
          variables,
        },
        ...(attachments?.length ? { attachments } : {}),
      } as any);

      this.logger.log('Email enviado 📨');
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }

  // 🔥 Método específico (recomendado)
  async sendInviteEmail(
    to: string | string[],
    data: EmailTemplateMap['invite-template-id'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'invite-template-id',
      variables: data,
    });
  }

  async sendInvitationGuestEmail(
    to: string | string[],
    data: EmailTemplateMap['send-invitation-guest'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'send-invitation-guest',
      variables: data,
    });
  }

  async sendRequestTrackEmail(
    to: string | string[],
    data: EmailTemplateMap['send-request-track'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'send-request-track',
      variables: data,
    });
  }

  async sendPasswordResetEmail(
    to: string | string[],
    data: EmailTemplateMap['password-reset'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'password-reset',
      variables: data,
    });
  }

  async sendPasswordChangedEmail(
    to: string | string[],
    data: EmailTemplateMap['password-changed'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'password-changed',
      variables: data,
    });
  }

  async sendVerifyEmailEmail(
    to: string | string[],
    data: EmailTemplateMap['verify-email'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'verify-email',
      variables: data,
    });
  }

  async sendTrackRequestUpdatedEmail(
    to: string | string[],
    data: EmailTemplateMap['update-request-track-status'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'update-request-track-status',
      variables: data,
    });
  }

  async sendOtpCodeEmail(to: string | string[], data: EmailTemplateMap['otp-code']) {
    return this.sendEmail({
      to,
      templateId: 'otp-code',
      variables: data,
    });
  }

  async sendSplitCoauthorInvitationEmail(
    to: string | string[],
    data: EmailTemplateMap['split-coauthor-invitation'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'split-coauthor-invitation',
      variables: data,
    });
  }

  async sendSplitCompletedEmail(
    to: string | string[],
    data: EmailTemplateMap['split-completed'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'split-completed',
      variables: data,
    });
  }

  async sendSplitRejectedEmail(
    to: string | string[],
    data: EmailTemplateMap['split-rejected'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'split-rejected',
      variables: data,
    });
  }

  async sendLicenseCollectionPaymentLinkEmail(
    to: string | string[],
    data: EmailTemplateMap['license-collection-payment-link'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'license-collection-payment-link',
      variables: data,
    });
  }

  async sendLicenseContractSignatureRequestEmail(
    to: string | string[],
    data: EmailTemplateMap['license-contract-signature-request'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'license-contract-signature-request',
      variables: data,
    });
  }

  async sendLicenseContractSignedCopyEmail(
    to: string | string[],
    data: EmailTemplateMap['license-contract-signed-copy'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'license-contract-signed-copy',
      variables: data,
    });
  }

  async sendLicenseContractRejectedEmail(
    to: string | string[],
    data: EmailTemplateMap['license-contract-rejected'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'license-contract-rejected',
      variables: data,
    });
  }

  async sendCertificateIssuedEmail(
    to: string | string[],
    data: EmailTemplateMap['track-certificate-issued'],
    attachments: EmailAttachment[],
  ) {
    return this.sendEmail({
      to,
      templateId: 'track-certificate-issued',
      variables: data,
      attachments,
    });
  }

  async sendCertificatePendingEmail(
    to: string | string[],
    data: EmailTemplateMap['track-certificate-pending'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'track-certificate-pending',
      variables: data,
    });
  }

  async sendCertificateCoauthorIncompleteEmail(
    to: string | string[],
    data: EmailTemplateMap['track-certificate-coauthor-incomplete'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'track-certificate-coauthor-incomplete',
      variables: data,
    });
  }

  async sendCertificateTechAlertEmail(
    to: string | string[],
    data: EmailTemplateMap['track-certificate-tech-alert'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'track-certificate-tech-alert',
      variables: data,
    });
  }

  async sendWalletWithdrawalRequestedAdminEmail(
    to: string | string[],
    data: EmailTemplateMap['wallet-withdrawal-requested-admin'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'wallet-withdrawal-requested-admin',
      variables: data,
    });
  }

  async sendWalletWithdrawalPaidEmail(
    to: string | string[],
    data: EmailTemplateMap['wallet-withdrawal-paid'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'wallet-withdrawal-paid',
      variables: data,
    });
  }

  async sendWalletWithdrawalRejectedEmail(
    to: string | string[],
    data: EmailTemplateMap['wallet-withdrawal-rejected'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'wallet-withdrawal-rejected',
      variables: data,
    });
  }

  async sendShareContentEmail(
    to: string | string[],
    data: EmailTemplateMap['share-content-notification'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'share-content-notification',
      variables: data,
    });
  }

  async sendOrganizationAdminInviteEmail(
    to: string | string[],
    data: EmailTemplateMap['organization-admin-invite'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'organization-admin-invite',
      variables: data,
    });
  }

  async sendOrganizationAdminAssignedEmail(
    to: string | string[],
    data: EmailTemplateMap['organization-admin-assigned'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'organization-admin-assigned',
      variables: data,
    });
  }

  async sendOrganizationAccessApprovedEmail(
    to: string | string[],
    data: EmailTemplateMap['organization-access-approved'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'organization-access-approved',
      variables: data,
    });
  }

  async sendBankInformationRequestedEmail(
    to: string | string[],
    data: EmailTemplateMap['bank-information-requested'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'bank-information-requested',
      variables: data,
    });
  }

  async sendBankInformationExhaustedAdminEmail(
    to: string | string[],
    data: EmailTemplateMap['bank-information-notification-exhausted-admin'],
  ) {
    return this.sendEmail({
      to,
      templateId: 'bank-information-notification-exhausted-admin',
      variables: data,
    });
  }
}

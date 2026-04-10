// interfaces/email.interface.ts

export interface SendEmailOptions {
  to: string | string[];
  subject?: string;

  // 🔥 usando templates de Resend
  templateId: string;

  // variables dinámicas del template
  variables?: Record<string, any>;
}
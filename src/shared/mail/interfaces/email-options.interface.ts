export interface EmailConfig {
  apiKey: string;
  defaultFrom: string;
  defaultReplyTo?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Attachment[];
  tags?: Tag[];
}

export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface Tag {
  name: string;
  value: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}
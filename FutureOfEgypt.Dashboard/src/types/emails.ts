export const EmailMessageStatus = {
  Draft: 1,
  Queued: 2,
  Sent: 3,
  Failed: 4,
} as const;

export type EmailMessageStatus =
  (typeof EmailMessageStatus)[keyof typeof EmailMessageStatus];

export interface SendEmailRequest {
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  body: string;
}

export interface EmailMessageResponse {
  publicId: string;
  senderUserId: string;
  senderFullName: string;
  fromEmail: string;
  toEmails: string;
  ccEmails?: string | null;
  bccEmails?: string | null;
  subject: string;
  body: string;
  status: EmailMessageStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAtUtc?: string | null;
  createdAtUtc?: string;
  createdAt?: string;
}